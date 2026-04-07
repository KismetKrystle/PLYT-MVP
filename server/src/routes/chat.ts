import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import pool from '../db';
import { authenticateToken, authenticateTokenOptional } from '../middleware/auth';
import { buildNaviSystemInstruction } from '../config/persona';
import { buildIntentSystemSection, classifyIntent } from '../lib/intentClassifier';
import { fetchRoleProfileData, isProfileComplete } from '../services/profileContext';
import { hydratePlacesWithProfileData, searchManagedPlaceProfiles } from '../services/placeProfiles';
import {
    resolveCategoryTerms,
    resolveLocaleFromProfileAndLocation,
    type IntentType,
    type LocaleCode,
    type UserProfile
} from '../services/categoryResolver';
import { searchPlacesForTerms } from '../services/placesSearch';
import {
    ACTIVE_CONVERSATION_WHERE_SQL,
    cleanupExpiredConversations,
    ensureConversationRetentionColumns,
    getChatRetentionDays
} from '../services/chatRetention';
import { buildRelevantMemoryPromptSection } from '../services/userMemory';

const router = express.Router();
let chatSchemaReady: Promise<void> | null = null;
const GOOGLE_SOURCE_RESULT_LIMIT = 5;

async function ensureChatConversationSchema() {
    if (!chatSchemaReady) {
        chatSchemaReady = (async () => {
            const usersIdTypeRes = await pool.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'id'
                LIMIT 1
            `);
            const usersIdType = usersIdTypeRes.rows[0]?.data_type === 'uuid' ? 'UUID' : 'INTEGER';

            await pool.query(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);

            await pool.query(`
                ALTER TABLE chat_history
                ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
            `);

            await pool.query(`
                ALTER TABLE conversations
                ADD COLUMN IF NOT EXISTS suggestion_state JSONB;
            `);
            await ensureConversationRetentionColumns(pool);

            await pool.query(`
                WITH users_with_history AS (
                    SELECT user_id, MIN(created_at) AS first_message_at, MAX(created_at) AS last_message_at
                    FROM chat_history
                    WHERE conversation_id IS NULL
                    GROUP BY user_id
                ),
                inserted AS (
                    INSERT INTO conversations (user_id, title, created_at, updated_at)
                    SELECT user_id, 'Earlier Chat', first_message_at, last_message_at
                    FROM users_with_history
                    RETURNING id, user_id
                )
                UPDATE chat_history ch
                SET conversation_id = inserted.id
                FROM inserted
                WHERE ch.user_id = inserted.user_id
                  AND ch.conversation_id IS NULL;
            `);
            await cleanupExpiredConversations(pool);
        })().catch((error) => {
            chatSchemaReady = null;
            throw error;
        });
    }

    return chatSchemaReady;
}

function profileHasHealthContext(profile: any) {
    return (
        (Array.isArray(profile?.health_conditions) && profile.health_conditions.length > 0) ||
        (Array.isArray(profile?.dietary_preferences) && profile.dietary_preferences.length > 0) ||
        (Array.isArray(profile?.allergies) && profile.allergies.length > 0) ||
        (Array.isArray(profile?.wellness_goals) && profile.wellness_goals.length > 0) ||
        (Array.isArray(profile?.health_areas) && profile.health_areas.length > 0) ||
        Boolean(String(profile?.notes || '').trim())
    );
}

function shouldPreserveConversationForHealth(intent: string | undefined, profile: any) {
    if (intent === 'health_advice') {
        return true;
    }

    if (!profileHasHealthContext(profile)) {
        return false;
    }

    return intent === 'meal_suggestion' || intent === 'recipe_search';
}

function toGeminiRole(role: string): 'model' | 'user' {
    return role === 'assistant' ? 'model' : 'user';
}

function buildConversationTitle(message: string) {
    const normalized = String(message || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return 'New Chat';
    return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function getHealthProfile(profileData: any, userRole?: string) {
    if (userRole && userRole !== 'consumer' && profileData?.consumer_health_profile) {
        return profileData.consumer_health_profile;
    }

    return profileData || {};
}

function getPromptProfileFields(profileData: any, userRole?: string) {
    const healthProfile = getHealthProfile(profileData, userRole);
    return {
        healthProfile,
        healthConditions: Array.isArray(healthProfile?.health_conditions) ? healthProfile.health_conditions : [],
        dietaryPreferences: Array.isArray(healthProfile?.dietary_preferences) ? healthProfile.dietary_preferences : [],
        allergies: Array.isArray(healthProfile?.allergies) ? healthProfile.allergies : []
    };
}

function getUserSettings(profileData: any, userRole?: string) {
    const healthProfile = getHealthProfile(profileData, userRole);
    const rawSettings = healthProfile?.user_settings || profileData?.user_settings || {};
    const responseStyle = rawSettings?.response_style === 'detailed' ? 'detailed' : 'concise';
    const fulfillmentPreference =
        rawSettings?.fulfillment_preference === 'recipe_first' || rawSettings?.fulfillment_preference === 'order_first'
            ? rawSettings.fulfillment_preference
            : 'balanced';

    return {
        responseStyle,
        fulfillmentPreference,
        proactiveFollowUp: rawSettings?.proactive_follow_up !== false,
        defaultSearchRadiusKm: Number.isFinite(Number(rawSettings?.default_search_radius_km))
            ? Number(rawSettings.default_search_radius_km)
            : 25,
        chatRetentionDays: getChatRetentionDays(healthProfile)
    };
}

function buildUserSettingsInstruction(settings: ReturnType<typeof getUserSettings>) {
    const sections = [
        settings.responseStyle === 'detailed'
            ? '- The user prefers slightly more detailed replies with a bit more explanation when helpful.'
            : '- The user prefers concise replies that get to the point quickly.'
    ];

    if (settings.fulfillmentPreference === 'recipe_first') {
        sections.push('- When the request is broad or ambiguous, lean recipe-first before order-first suggestions.');
    } else if (settings.fulfillmentPreference === 'order_first') {
        sections.push('- When the request is broad or ambiguous, lean order-first before recipe-first suggestions.');
    } else {
        sections.push('- Keep a balanced mix between recipe ideas and order-ready suggestions unless the user signals a preference.');
    }

    sections.push(
        settings.proactiveFollowUp
            ? '- Asking one short clarifying follow-up is welcome when it genuinely improves the answer.'
            : '- Avoid proactive follow-up questions unless they are truly necessary to answer well.'
    );

    return `## USER RESPONSE PREFERENCES
${sections.join('\n')}`;
}

function buildLocationLinkRule(profileData: any, requestLocation?: string): string {
    const loc = profileData?.location || {};
    const profileCity = String(loc.city || '').trim();
    const profileRegion = String(loc.address || '').trim();
    const profileLocation = [profileCity, profileRegion].filter(Boolean).join(', ');
    const activeLocation = requestLocation?.trim() || profileLocation;

    return `
## LOCAL PLACE LINK RULE
- When you recommend any place (market, grocery, farm, clinic, restaurant, co-op, food bank), include a Google Maps link immediately after the place name.
- Use this format: https://www.google.com/maps/search/?api=1&query=<PLACE+CITY+REGION>
- Always include city or region in the query for accuracy.
- Use broad nutrition and health reasoning to decide what foods to recommend, but keep sourcing local-first.
- If the user asks for food but the fulfillment mode is unclear, ask one short clarifying question with these options: ready to eat, recipe ideas, prepared for later, or raw produce to buy nearby.
- If the user clearly asks for restaurants, cafes, takeaway, or meals they can get now, prioritize ready-to-eat places.
- If the user clearly asks for recipes or what to cook, prioritize recipe and ingredient guidance before place recommendations.
- If the user clearly asks to buy ingredients, fruits, vegetables, or market produce, prioritize markets, grocers, farm stands, and produce sellers.
- If the user explicitly asks for another city, region, ZIP/postcode area, or neighborhood in their latest message, that overrides their default location for this response.
${activeLocation
    ? `- User is currently near: ${activeLocation}. Prioritize recommendations in this area.`
    : `- Location unknown. Ask one short follow-up question for city before listing places.`
}`;
}

function detectFulfillmentFollowUp(responseText: string) {
    const text = responseText.toLowerCase();
    const mentionsAllModes =
        text.includes('ready to eat') &&
        text.includes('recipe') &&
        text.includes('prepared for later') &&
        text.includes('raw produce');

    const asksClarifyingQuestion =
        text.includes('which one') ||
        text.includes('which option') ||
        text.includes('do you want') ||
        text.includes('would you like');

    if (!mentionsAllModes || !asksClarifyingQuestion) return null;

    return getFulfillmentFollowUpOptions();
}

function getFulfillmentFollowUpOptions() {
    return [
        { id: 'ready_to_eat', label: 'Ready to Eat', prompt: 'I want ready-to-eat options near me.' },
        { id: 'recipe_ideas', label: 'Recipe Ideas', prompt: 'I want recipe ideas for this.' },
        { id: 'prepared_for_later', label: 'Prepared for Later', prompt: 'I want prepared-for-later or meal prep options.' },
        { id: 'raw_produce', label: 'Raw Produce Nearby', prompt: 'I want raw produce to buy nearby.' }
    ];
}

function shouldOfferRecipeConversionFollowUp(message: string, tags: string[], intent: string, responseText: string) {
    const normalizedMessage = normalizeIntentText(message);
    const normalizedResponse = String(responseText || '').toLowerCase();
    const normalizedTags = normalizeChatTags(tags);
    const mentionsCreate = /\b(create|creating|created)\b/.test(normalizedMessage);
    const mealSignal =
        /\b(meal|dish|dinner|lunch|breakfast|snack|bowl|salad|plate)\b/.test(normalizedMessage) ||
        normalizedTags.includes('cooked') ||
        normalizedTags.includes('receipes') ||
        normalizedTags.includes('recipes');

    if (!mentionsCreate || !mealSignal) {
        return false;
    }

    if (!['meal_suggestion', 'food_search', 'general', 'recipe_search'].includes(intent)) {
        return false;
    }

    if (normalizedMessage.includes('recipe') || normalizedResponse.includes('turn that into a recipe')) {
        return false;
    }

    return !/(would you like|do you want).{0,80}recipe/i.test(responseText);
}

function appendRecipeConversionQuestion(responseText: string, shouldAskQuestion: boolean) {
    const normalizedResponse = String(responseText || '').trim();
    if (!normalizedResponse || !shouldAskQuestion) {
        return normalizedResponse;
    }

    if (/(would you like|do you want).{0,80}recipe/i.test(normalizedResponse)) {
        return normalizedResponse;
    }

    return `${normalizedResponse}\n\nWould you like me to turn one of those into a recipe?`;
}

function getRecipeConversionFollowUpOptions() {
    return [
        { id: 'turn_into_recipe', label: 'Turn into Recipe', prompt: 'Turn that meal idea into a recipe with ingredients and steps.' }
    ];
}

function shouldOfferFulfillmentClarifier(message: string, tags: string[], intent: string, searchQueries: string[]) {
    const normalizedTags = normalizeChatTags(tags);
    const mode = inferFulfillmentMode(message, normalizedTags);

    if (mode !== 'unknown') {
        return false;
    }

    if (!['meal_suggestion', 'food_search', 'general'].includes(intent)) {
        return false;
    }

    const hasFoodSignal = extractFoodTerms(message).length > 0;
    return hasFoodSignal || searchQueries.length > 0;
}

function buildPersonalizationNudge(isSignedIn: boolean, profileComplete: boolean) {
    if (isSignedIn && profileComplete) {
        return '';
    }

    if (!isSignedIn) {
        return 'This search is designed to adapt to your health preferences. Please [Signup/in](/login) and complete a bit of your health profile so the results can serve you better.';
    }

    return 'This search is designed to adapt to your health preferences. Please complete a bit more of your health profile so the results can serve you better.';
}

function appendPersonalizationNudge(responseText: string, nudge: string) {
    const normalizedResponse = String(responseText || '').trim();
    const normalizedNudge = String(nudge || '').trim();

    if (!normalizedNudge) {
        return normalizedResponse;
    }

    if (!normalizedResponse) {
        return normalizedNudge;
    }

    if (normalizedResponse.includes(normalizedNudge)) {
        return normalizedResponse;
    }

    return `${normalizedResponse}\n\n${normalizedNudge}`;
}

function emphasizeLeadSuggestion(responseText: string) {
    const trimmed = String(responseText || '').trim();
    if (!trimmed || trimmed.includes('**')) {
        return trimmed;
    }

    const paragraphs = trimmed.split(/\n{2,}/);
    const lead = String(paragraphs[0] || '').trim();
    if (!lead) {
        return trimmed;
    }

    const sentenceMatch = lead.match(/^(.{18,180}?[.!?])(?=\s|$)/);
    const segment = sentenceMatch ? sentenceMatch[1].trim() : lead.length <= 120 ? lead : '';

    if (!segment) {
        return trimmed;
    }

    paragraphs[0] = lead.replace(segment, `**${segment}**`);
    return paragraphs.join('\n\n');
}

function appendFulfillmentQuestion(responseText: string, shouldAskQuestion: boolean) {
    const normalizedResponse = String(responseText || '').trim();
    if (!normalizedResponse || !shouldAskQuestion) {
        return normalizedResponse;
    }

    if (
        /(would you like|do you want|which one|which option|what sounds better|are you after).*\?/i.test(normalizedResponse) ||
        /are you looking for something to order.*recipe to cook.*meal prep.*ingredients to buy\?/i.test(normalizedResponse)
    ) {
        return normalizedResponse;
    }

    return `${normalizedResponse}\n\nAre you looking for something to order, a recipe to cook, meal prep, or ingredients to buy?`;
}

const FIND_TRIGGER_WORDS = [
    'where', 'find', 'buy', 'get', 'near me', 'source', 'shop',
    'market', 'store', 'supplier', 'available'
];

const KNOWLEDGE_TRIGGER_WORDS = [
    'what', 'why', 'how', 'tell me', 'explain', 'is it', 'should i',
    'recommend', 'good for', 'benefits'
];

function normalizeIntentText(value: string) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesTriggerWord(message: string, triggers: string[]) {
    const normalized = normalizeIntentText(message);
    return triggers.some((trigger) => normalized.includes(trigger));
}

async function classifyFindOrKnowledge(message: string): Promise<IntentType> {
    if (includesTriggerWord(message, FIND_TRIGGER_WORDS)) {
        return 'find';
    }

    if (includesTriggerWord(message, KNOWLEDGE_TRIGGER_WORDS)) {
        return 'knowledge';
    }

    if (!process.env.GEMINI_API_KEY) {
        return 'knowledge';
    }

    const prompt = `Classify this user query as either "find" or "knowledge".

Return ONLY one word:
- find
- knowledge

Use "find" for location, sourcing, buying, shopping, nearby availability, or where-to-get intent.
Use "knowledge" for advice, explanation, health reasoning, food knowledge, ingredient knowledge, or general guidance.

Query:
${message}`;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, prompt, 'Return only "find" or "knowledge".', []);
        const normalized = normalizeIntentText(completion.text);
        return normalized.includes('find') ? 'find' : 'knowledge';
    } catch {
        return 'knowledge';
    }
}

const TAG_INTENT_HINTS: Record<string, { mode: 'raw_produce' | 'ready_to_eat' | 'prepared_for_later' | 'recipe_ideas' | 'advice'; hints: string[] }> = {
    fresh: {
        mode: 'raw_produce',
        hints: ['fresh produce', 'market', 'grocery', 'farm stand', 'raw ingredients']
    },
    cooked: {
        mode: 'ready_to_eat',
        hints: ['ready to eat', 'restaurant', 'cafe', 'cooked meal', 'prepared dish']
    },
    'meal prep': {
        mode: 'prepared_for_later',
        hints: ['meal prep', 'prepared for later', 'healthy meal prep', 'prepared meals']
    },
    receipes: {
        mode: 'recipe_ideas',
        hints: ['recipe ideas', 'cook at home', 'ingredients for recipes', 'what should I cook']
    },
    recipes: {
        mode: 'recipe_ideas',
        hints: ['recipe ideas', 'cook at home', 'ingredients for recipes', 'what should I cook']
    },
    advice: {
        mode: 'advice',
        hints: ['nutrition advice', 'food advice', 'what is best for me', 'guidance']
    }
};

function normalizeChatTags(tags: any): string[] {
    if (!Array.isArray(tags)) return [];
    return Array.from(new Set(
        tags
            .map((tag) => String(tag || '').trim())
            .filter(Boolean)
    ));
}

function getTagSearchHints(tags: string[]) {
    return normalizeChatTags(tags)
        .flatMap((tag) => TAG_INTENT_HINTS[String(tag).toLowerCase()]?.hints || []);
}

function buildChatMessageFallback(message: string, tags: string[]) {
    const trimmed = String(message || '').trim();
    if (trimmed) return trimmed;
    const normalizedTags = normalizeChatTags(tags);
    if (normalizedTags.length === 0) return '';
    return `Subject: ${normalizedTags.join(', ')}`;
}

function inferFulfillmentMode(message: string, tags: string[] = []) {
    const text = message.toLowerCase();
    if (/(recipe|cook|make|prepare at home|how do i make)/.test(text)) return 'recipe_ideas';
    if (/(meal prep|prepared for later|prep ahead|for later)/.test(text)) return 'prepared_for_later';
    if (/(produce|market|grocer|grocery|ingredients|farmers market|vegetable|fruit)/.test(text)) return 'raw_produce';
    if (/(restaurant|cafe|takeout|delivery|ready to eat|eat out|meal near me|salad|smoothie|juice|bowl)/.test(text)) return 'ready_to_eat';
    const normalizedTags = normalizeChatTags(tags);
    for (const tag of normalizedTags) {
        const config = TAG_INTENT_HINTS[String(tag).toLowerCase()];
        if (config) return config.mode;
    }
    return 'unknown';
}

function shouldActivatePlaceSearch(message: string, tags: string[] = []) {
    const text = String(message || '').toLowerCase();
    const normalizedTags = normalizeChatTags(tags);
    const mode = inferFulfillmentMode(text, normalizedTags);
    const hasExplicitPlaceTag = normalizedTags.some((tag) => ['fresh', 'cooked', 'meal prep'].includes(String(tag).toLowerCase()));

    if (hasExplicitPlaceTag) {
        return true;
    }

    if (mode === 'ready_to_eat') {
        return /(near me|nearby|around here|local|restaurant|restaurants|cafe|cafes|takeout|delivery|eat out|where can i (eat|get|find|go)|what.?s nearby|places|spots|order|pickup)/.test(text);
    }

    if (mode === 'raw_produce') {
        return /(produce|market|grocer|grocery|farmer.?s market|farm stand|ingredients|where can i (buy|get|find)|buy|shop)/.test(text);
    }

    if (mode === 'prepared_for_later') {
        return /(meal prep|prepared meals?|prepared for later|prep ahead|for later)/.test(text);
    }

    return false;
}

function extractFoodTerms(message: string) {
    const text = message.toLowerCase();
    const knownFoods = [
        'coffee', 'tea', 'matcha', 'salad', 'smoothie', 'juice', 'bowl', 'wrap', 'sandwich',
        'soup', 'kale', 'spinach', 'tomato', 'avocado', 'fruit', 'vegetable', 'greens',
        'saucy fries', 'loaded fries', 'fries',
        'protein bowl', 'grilled bowl', 'grilled fish bowl', 'veggie burger', 'plant based burger',
        'raw food', 'brunch', 'dessert', 'pizza', 'sushi', 'burger', 'bakery', 'cafe', 'cacao'
    ];
    const found = knownFoods.filter((food) => text.includes(food));
    return found.length > 0 ? found.slice(0, 3) : [];
}

function slugifyValue(value: string) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
}

function normalizeSearchPhraseCandidate(value: string) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9/&+\-\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasMeaningfulSearchSignal(phrase: string) {
    return /(burger|sushi|pizza|salad|smoothie|juice|coffee|matcha|tea|bowl|wrap|sandwich|soup|bakery|brunch|dessert|vegan|vegetarian|gluten free|dairy free|halal|kosher|organic|farmers market|market|grocery|produce|ingredient|meal prep|prepared meal|fruit|vegetable|greens|fries|cafe|raw food|protein)/.test(phrase);
}

function cleanMessageIntoSearchPhrase(message: string) {
    return normalizeSearchPhraseCandidate(message)
        .replace(/\b(?:can you|could you|would you|please|help me|show me|tell me|i am|i m|i'm|im|i want|i need|i would like|looking for|look for|trying to find|where can i|where do i|what are|what is|give me|find me|get me|find|get|order|eat|buy|have|grab|pick up)\b/g, ' ')
        .replace(/\b(?:near me|nearby|around here|local|close by|close to me|in my area|around my area|for delivery|delivery|takeout|pickup|pick up|right now|today|tonight|now|please)\b/g, ' ')
        .replace(/\b(?:restaurant|restaurants|cafe|cafes|place|places|spot|spots|option|options)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSpecificSearchPhrases(message: string, mode: string) {
    const candidates = new Set<string>();
    const cleanedMessage = cleanMessageIntoSearchPhrase(message);
    const foodTerms = extractFoodTerms(message);

    if (cleanedMessage && cleanedMessage.split(' ').length <= 8 && hasMeaningfulSearchSignal(cleanedMessage)) {
        candidates.add(cleanedMessage);
    }

    foodTerms.forEach((food) => {
        const normalizedFood = normalizeSearchPhraseCandidate(food);
        if (normalizedFood) candidates.add(normalizedFood);
    });

    if (mode === 'prepared_for_later' && cleanedMessage && !cleanedMessage.includes('meal prep')) {
        candidates.add(`${cleanedMessage} meal prep`);
    }

    if (mode === 'raw_produce' && cleanedMessage && !/(market|grocery|produce|ingredient)/.test(cleanedMessage)) {
        candidates.add(`${cleanedMessage} produce`);
    }

    return Array.from(candidates)
        .map((candidate) => normalizeSearchPhraseCandidate(candidate))
        .filter((candidate) => candidate && hasMeaningfulSearchSignal(candidate))
        .slice(0, 3);
}

function stripMarkdownFormatting(value: string) {
    return String(value || '')
        .replace(/[`*_>#]/g, ' ')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

function deriveRecipeTitle(recipeText: string) {
    const lines = String(recipeText || '')
        .split(/\r?\n/)
        .map((line) => stripMarkdownFormatting(line))
        .filter(Boolean);

    const headingLine = lines.find((line) => line.length > 4 && line.length <= 80);
    if (!headingLine) return 'Recipe grocery list';
    return headingLine.replace(/^recipe\s*[:\-]\s*/i, '').trim() || 'Recipe grocery list';
}

function parseIngredientLine(line: string, index: number) {
    const cleaned = stripMarkdownFormatting(line)
        .replace(/^[-*•\d.)\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned || cleaned.length < 2) return null;
    if (/^(ingredients?|instructions?|directions?|method|steps?)$/i.test(cleaned)) return null;

    const match = cleaned.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?)|(?:a|an|few|pinch|dash))?\s*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|kg|g|grams?|oz|ounces?|lb|lbs|ml|l|liters?|cloves?|slices?|pieces?|cans?|bunch(?:es)?|bundle(?:s)?|sprigs?|stalks?)?\s*(?:of\s+)?(.+)$/i);

    const quantity = String(match?.[1] || '').trim();
    const unit = String(match?.[2] || '').trim();
    const name = String(match?.[3] || cleaned).trim().replace(/\s*,\s*$/, '');

    if (!name || name.length < 2) return null;

    return {
        id: `${slugifyValue(name) || `ingredient-${index + 1}`}-${index + 1}`,
        name,
        quantity,
        unit,
        display: [quantity, unit, name].filter(Boolean).join(' ').trim()
    };
}

function extractIngredientsFallback(recipeText: string) {
    const text = String(recipeText || '');
    const lines = text.split(/\r?\n/);
    const items: Array<{ id: string; name: string; quantity: string; unit: string; display: string }> = [];

    const ingredientsHeadingIndex = lines.findIndex((line) => /^\s{0,3}(?:#{1,6}\s*)?ingredients?\s*:?\s*$/i.test(line.trim()));
    const candidateLines = (() => {
        if (ingredientsHeadingIndex < 0) {
            return lines.filter((line) => /^\s*[-*•]|\d+\./.test(line.trim()));
        }

        const collected: string[] = [];
        for (const line of lines.slice(ingredientsHeadingIndex + 1)) {
            const trimmed = line.trim();
            if (!trimmed) {
                if (collected.length > 0) break;
                continue;
            }
            if (/^\s{0,3}(?:#{1,6}\s*)?(instructions?|directions?|method|steps?)\s*:?\s*$/i.test(trimmed)) {
                break;
            }
            collected.push(line);
        }
        return collected;
    })();

    candidateLines.forEach((line, index) => {
        const parsed = parseIngredientLine(line, index);
        if (parsed) items.push(parsed);
    });

    if (items.length > 0) {
        return items.slice(0, 24);
    }

    const commaSectionMatch = text.match(/ingredients?\s*:?\s*([\s\S]{0,700})/i);
    if (commaSectionMatch?.[1]) {
        commaSectionMatch[1]
            .split(/[,\n]/)
            .map((part) => part.trim())
            .filter(Boolean)
            .forEach((part, index) => {
                const parsed = parseIngredientLine(part, index);
                if (parsed) items.push(parsed);
            });
    }

    return items.slice(0, 24);
}

function extractJsonObjectFromText(text: string) {
    const normalized = String(text || '').trim();
    if (!normalized) return null;

    const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] || normalized;
    const startIndex = candidate.indexOf('{');
    const endIndex = candidate.lastIndexOf('}');
    if (startIndex < 0 || endIndex <= startIndex) return null;

    try {
        return JSON.parse(candidate.slice(startIndex, endIndex + 1));
    } catch {
        return null;
    }
}

async function extractGroceryList(recipeText: string) {
    const fallbackItems = extractIngredientsFallback(recipeText);
    const fallbackTitle = deriveRecipeTitle(recipeText);

    if (!process.env.GEMINI_API_KEY) {
        return {
            title: fallbackTitle,
            items: fallbackItems
        };
    }

    const prompt = `Extract a grocery list from this recipe.

Recipe:
${recipeText}

Return strict JSON only using this shape:
{
  "title": "short recipe title",
  "items": [
    {
      "name": "ingredient name",
      "quantity": "optional quantity text",
      "unit": "optional unit text",
      "display": "human-readable ingredient line"
    }
  ]
}

Rules:
- Include only ingredients required for the recipe.
- Do not include instructions, garnish notes, or cookware.
- Keep quantity and unit empty strings if unknown.
- Return no prose, only JSON.`;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, prompt, 'You extract clean grocery-list JSON from recipe text.', []);
        const parsed = extractJsonObjectFromText(completion.text);
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
        const normalizedItems = rawItems
            .map((item: any, index: number) => ({
                id: `${slugifyValue(String(item?.name || '')) || `ingredient-${index + 1}`}-${index + 1}`,
                name: String(item?.name || '').trim(),
                quantity: String(item?.quantity || '').trim(),
                unit: String(item?.unit || '').trim(),
                display: String(item?.display || [item?.quantity, item?.unit, item?.name].filter(Boolean).join(' ')).trim()
            }))
            .filter((item: any) => item.name);

        if (normalizedItems.length > 0) {
            return {
                title: String(parsed?.title || fallbackTitle).trim() || fallbackTitle,
                items: normalizedItems.slice(0, 24)
            };
        }
    } catch {
        // fallback below
    }

    return {
        title: fallbackTitle,
        items: fallbackItems
    };
}

function buildIngredientSourceQueries(
    items: Array<{ name?: string; display?: string }>,
    mode: 'premium' | 'google'
) {
    const ingredientNames = Array.from(
        new Set(
            items
                .map((item) => String(item?.name || item?.display || '').trim().toLowerCase())
                .filter(Boolean)
        )
    ).slice(0, 6);

    if (ingredientNames.length === 0) {
        return mode === 'google' ? ['grocery store', 'farmers market'] : [];
    }

    if (mode === 'premium') {
        return ingredientNames;
    }

    const queries = new Set<string>();
    ingredientNames.slice(0, 4).forEach((name) => {
        queries.add(`${name} grocery`);
        queries.add(`${name} market`);
    });
    queries.add('grocery store');
    queries.add('farmers market');
    return Array.from(queries).slice(0, 8);
}

function buildDietModifiers(profileData: any) {
    const preferences = new Set<string>((profileData?.dietary_preferences || []).map((value: string) => value.toLowerCase()));
    const modifiers: string[] = [];
    if (preferences.has('vegan') || preferences.has('raw_vegan')) modifiers.push('vegan');
    else if (preferences.has('vegetarian')) modifiers.push('vegetarian');
    else if (preferences.has('pescatarian') || preferences.has('pescetarian')) modifiers.push('pescatarian');
    else if (preferences.has('halal')) modifiers.push('halal');
    else if (preferences.has('kosher')) modifiers.push('kosher');
    if (preferences.has('gluten_free') || preferences.has('celiac')) modifiers.push('gluten free');
    if (preferences.has('dairy_free')) modifiers.push('dairy free');
    if (preferences.has('no_garlic')) modifiers.push('no garlic');
    if (preferences.has('no_onion')) modifiers.push('no onion');
    return modifiers.slice(0, 3);
}

function buildCravingUpgradeQueries(baseFood: string, profileData: any) {
    const preferences = new Set<string>((profileData?.dietary_preferences || []).map((value: string) => value.toLowerCase()));
    const conditions = new Set<string>((profileData?.health_conditions || []).map((value: string) => value.toLowerCase()));
    const queries = new Set<string>();

    if (baseFood === 'burger') {
        if (preferences.has('vegetarian') || preferences.has('vegan') || preferences.has('raw_vegan')) {
            queries.add('veggie burger');
            queries.add('plant based burger');
        } else if (preferences.has('pescatarian') || preferences.has('pescetarian')) {
            queries.add('veggie burger');
            queries.add('grilled fish bowl');
        }

        if (preferences.has('dairy_free')) queries.add('dairy free burger');
        if (conditions.has('no_gallbladder')) queries.add('grilled bowl');
        if (conditions.has('fibroids') || conditions.has('brain_fog')) queries.add('nourishing cafe');
        queries.add('healthy burger');
    }

    if (baseFood === 'coffee' && (conditions.has('fibroids') || conditions.has('hormonal_imbalance'))) {
        queries.add('matcha cafe');
        queries.add('cacao cafe');
    }

    if (baseFood === 'fries' || baseFood === 'saucy fries' || baseFood === 'loaded fries') {
        queries.add('loaded fries');
        queries.add('crispy potato wedges');
        queries.add('burger fries');
        if (preferences.has('dairy_free')) queries.add('dairy free loaded fries');
    }

    return Array.from(queries);
}

function appendQueriesWithModifiers(queries: Set<string>, phrases: string[], modifiers: string[]) {
    phrases
        .map((phrase) => String(phrase || '').trim())
        .filter(Boolean)
        .forEach((phrase) => {
            if (modifiers.length === 0) {
                queries.add(phrase);
                return;
            }

            modifiers.forEach((modifier) => queries.add(`${modifier} ${phrase}`));
            queries.add(phrase);
        });
}

function buildReadyToEatQueries(baseFood: string, profileData: any, requestedPhrases: string[] = []) {
    const modifiers = buildDietModifiers(profileData);
    const queries = new Set<string>();
    const phrases: string[] = [
        ...requestedPhrases,
        ...requestedPhrases.map((phrase) => /(restaurant|cafe|coffee shop|bakery)/.test(phrase) ? phrase : `${phrase} restaurant`),
        `${baseFood} restaurant`,
        `${baseFood} cafe`,
        'healthy restaurant'
    ];
    const upgradeQueries = buildCravingUpgradeQueries(baseFood, profileData);

    if (baseFood === 'coffee') {
        phrases.push('coffee shop', 'specialty coffee');
    }

    if (baseFood !== 'healthy food') {
        phrases.push(`${baseFood} near me`);
    }

    appendQueriesWithModifiers(queries, [...phrases, ...upgradeQueries], modifiers);
    return Array.from(queries).slice(0, 6);
}

function buildCompanionPlaceQueriesFromReply(message: string, reply: string, profileData: any) {
    const replyFoods = extractFoodTerms(reply);
    const messageFoods = extractFoodTerms(message);
    const candidateFoods = Array.from(new Set([...replyFoods, ...messageFoods])).filter(Boolean);
    const requestedPhrases = extractSpecificSearchPhrases(`${message} ${reply}`, 'ready_to_eat');

    if (candidateFoods.length === 0) {
        return [];
    }

    const queries = new Set<string>();
    candidateFoods.slice(0, 2).forEach((food) => {
        buildReadyToEatQueries(food, profileData, requestedPhrases).forEach((query) => queries.add(query));
    });

    const normalizedText = `${message} ${reply}`.toLowerCase();
    if (normalizedText.includes('burger') && normalizedText.includes('fries')) {
        buildReadyToEatQueries('burger', profileData).forEach((query) => queries.add(query));
        queries.add('burger fries restaurant');
        queries.add('burger and fries');
        queries.add('loaded fries restaurant');
    }

    return Array.from(queries).slice(0, 6);
}

function buildSearchQueries(message: string, profileData: any, tags: string[] = []) {
    const normalizedTags = normalizeChatTags(tags);
    const augmentedMessage = [String(message || '').trim(), ...getTagSearchHints(normalizedTags)].filter(Boolean).join(' ');

    if (!shouldActivatePlaceSearch(message, normalizedTags)) {
        return [];
    }

    const mode = inferFulfillmentMode(augmentedMessage, normalizedTags);
    const foods = extractFoodTerms(augmentedMessage);
    const baseFood = foods[0] || 'healthy food';
    const queries = new Set<string>();
    const modifiers = buildDietModifiers(profileData);
    const requestedPhrases = extractSpecificSearchPhrases(augmentedMessage, mode);
    const withModifiers = (...phrases: string[]) => appendQueriesWithModifiers(queries, phrases, modifiers);

    if (mode === 'ready_to_eat') {
        return buildReadyToEatQueries(baseFood, profileData, requestedPhrases);
    } else if (mode === 'raw_produce') {
        withModifiers(...requestedPhrases);
        withModifiers(`${baseFood} market`);
        withModifiers(`${baseFood} grocery`);
        queries.add('farmers market');
        queries.add('produce market');
    } else if (mode === 'prepared_for_later') {
        withModifiers(...requestedPhrases);
        withModifiers(`${baseFood} meal prep`);
        withModifiers('healthy meal prep');
        withModifiers('prepared meals');
    } else if (mode === 'recipe_ideas') {
        return [];
    } else if (mode === 'advice') {
        return [];
    } else {
        return [];
    }

    return Array.from(queries).slice(0, 6);
}

function queryHasProduceIntent(queries: string[]) {
    return queries.some((query) => /(ingredient|ingredients|produce|vegetable|vegetables|fruit|fruits|grocery|grocer|market|farmer|farm stand|recipe|cook|cooking|meal prep|herb|spice)/.test(String(query).toLowerCase()));
}

async function buildFindSearchPlan(params: {
    message: string;
    tags: string[];
    profileData: UserProfile;
    location?: string;
}) {
    const normalizedTags = normalizeChatTags(params.tags);
    const locale = resolveLocaleFromProfileAndLocation(params.profileData, params.location);
    const categoryResolution = await resolveCategoryTerms({
        userProfile: params.profileData,
        query: params.message,
        locale
    });
    const directQueries = buildSearchQueries(params.message, params.profileData, normalizedTags);
    const fulfillmentMode = inferFulfillmentMode(
        [String(params.message || '').trim(), ...getTagSearchHints(normalizedTags)].filter(Boolean).join(' '),
        normalizedTags
    );
    const sourcingMode =
        fulfillmentMode === 'raw_produce' ||
        fulfillmentMode === 'recipe_ideas' ||
        queryHasProduceIntent(directQueries) ||
        /(ingredient|ingredients|produce|grocery|market|supplier|supplement|vitamin|herb|herbs|spice|spices|farm|available|source)/i.test(params.message);

    const searchQueries = Array.from(new Set(
        (sourcingMode
            ? [...categoryResolution.searchTerms, ...directQueries.slice(0, 2)]
            : directQueries.length > 0
                ? directQueries
                : categoryResolution.searchTerms
        )
            .map((query) => String(query || '').trim())
            .filter(Boolean)
    )).slice(0, 8);

    return {
        locale,
        fulfillmentMode,
        searchQueries,
        resolvedCategories: categoryResolution.categories,
        categorySource: categoryResolution.source
    };
}

function inferSearchPlaceKind(place: any) {
    const explicitKind = String(place?.place_kind || '').trim().toLowerCase();
    if (explicitKind) return explicitKind;

    const haystack = [
        place?.name,
        place?.address,
        place?.website,
        Array.isArray(place?.types) ? place.types.join(' ') : ''
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (/(farmer.?s market|farm stand|produce stand)/.test(haystack)) return 'farm_stand';
    if (/(grocery|supermarket|market|food store|health food|organic store|co-op|coop)/.test(haystack)) return 'grocery';
    if (/(natural food|wholefood)/.test(haystack)) return 'natural_food_store';
    if (/(farm|orchard|grower)/.test(haystack)) return 'farm';
    if (/(restaurant|meal_takeaway|meal_delivery|bar|bakery)/.test(haystack)) return 'restaurant';
    if (/(cafe|coffee|juice|smoothie)/.test(haystack)) return 'cafe';
    return 'other';
}

function placeKindIntentBias(place: any, queries: string[]) {
    if (!queryHasProduceIntent(queries)) {
        return 0;
    }

    const kind = inferSearchPlaceKind(place);
    if (kind === 'farm_stand' || kind === 'farm') return 26;
    if (kind === 'grocery' || kind === 'natural_food_store') return 22;
    if (kind === 'distributor') return 18;
    if (kind === 'prepared_food') return 4;
    if (kind === 'restaurant') return -16;
    if (kind === 'cafe') return -12;
    return 0;
}

function buildFallbackChatResponse(message: string, profileData: any, location?: string) {
    const mode = inferFulfillmentMode(message);
    const foods = extractFoodTerms(message);
    const primaryFood = foods[0] || 'good food options';
    const searchArea = String(location || '').trim();

    if (mode === 'recipe_ideas') {
        return `I can help with recipe ideas for ${primaryFood}. I had trouble generating the full guided reply just now, but you can try your message again and I’ll keep it simple.`;
    }

    const areaLine = searchArea
        ? `I'm still using ${searchArea} as the search area.`
        : `I'm still using your saved local area for the search.`;

    return `I’m pulling together nearby options for ${primaryFood} now. ${areaLine} You should still see matching places in the suggestions panel, and you can refresh that list if you want a fresh set.`;
}

function formatLocationForReplyV2(location?: string) {
    const value = String(location || '').trim();
    if (!value) return 'your local area';
    if (parseCoordinates(value)) return 'your current area';
    return value;
}

function buildSmartFallbackChatResponse(message: string, profileData: any, location?: string) {
    return 'I am having a moment — please try again and I will be right with you.';
}

async function generateWithFallbackModels(
    genAI: GoogleGenerativeAI,
    message: string,
    systemInstruction: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
) {
    const configuredModel = (process.env.GEMINI_MODEL || '').trim();
    const candidates = Array.from(new Set([
        configuredModel,
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash'
    ].filter(Boolean)));

    const tried: string[] = [];
    let lastError: any = null;

    for (const modelName of candidates) {
        try {
            tried.push(modelName);
            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
            const chatSession = model.startChat({ history });
            const result = await chatSession.sendMessage(message);
            return { text: result.response.text(), modelName, tried };
        } catch (error: any) {
            lastError = error;
        }
    }

    const err = new Error(lastError?.message || 'Failed to generate AI response');
    (err as any).triedModels = tried;
    throw err;
}

function parseCoordinates(location?: string) {
    const value = String(location || '').trim();
    const match = value.match(/Lat:\s*([-0-9.]+)\s*,\s*Lng:\s*([-0-9.]+)/i);
    if (!match) return null;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

async function resolveLocationCoordinates(location?: string, locale?: LocaleCode) {
    const parsed = parseCoordinates(location);
    if (parsed) return parsed;

    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !String(location || '').trim()) {
        return null;
    }

    try {
        return await geocodeLocation(String(location).trim(), key, locale);
    } catch {
        return null;
    }
}

function getGoogleMapsRegion(locale?: LocaleCode) {
    const configuredRegion = String(process.env.GOOGLE_MAPS_REGION || process.env.GOOGLE_PLACES_REGION || '').trim().toLowerCase();
    if (configuredRegion) return configuredRegion;
    if (locale) return locale.toLowerCase();
    return undefined;
}

async function geocodeLocation(location: string, key: string, locale?: LocaleCode) {
    const region = getGoogleMapsRegion(locale);
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
            address: location,
            key,
            ...(region ? { region } : {})
        }
    });

    const first = Array.isArray(response.data?.results) ? response.data.results[0] : null;
    const lat = first?.geometry?.location?.lat;
    const lng = first?.geometry?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const haversine =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function searchGooglePlaces(query: string, location?: string, maxRadiusKm?: number, locale?: LocaleCode) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return [];

    const region = getGoogleMapsRegion(locale);
    const origin = parseCoordinates(location) || (location?.trim() ? await geocodeLocation(location, key, locale) : null);
    const desiredMaxRadiusKm = Number.isFinite(maxRadiusKm) ? Math.max(1, Number(maxRadiusKm)) : 80;
    const desiredMaxRadiusMeters = Math.round(desiredMaxRadiusKm * 1000);
    const radiusSteps = [5000, 12000, 25000, 50000, 80000].filter((radius) => radius <= desiredMaxRadiusMeters);
    const effectiveRadiusSteps = radiusSteps.length > 0 ? radiusSteps : [desiredMaxRadiusMeters];
    const collected = new Map<string, any>();

    for (const radius of effectiveRadiusSteps) {
        const textSearch = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: {
                query,
                ...(origin ? { location: `${origin.lat},${origin.lng}`, radius } : {}),
                ...(region ? { region } : {}),
                key
            }
        });

        const results = Array.isArray(textSearch.data?.results) ? textSearch.data.results : [];
        for (const result of results) {
            if (!result?.place_id || collected.has(result.place_id)) continue;
            collected.set(result.place_id, result);
        }

        if (!origin || collected.size >= 10) break;
    }

    const shortlisted = Array.from(collected.values()).slice(0, 14);
    const enriched = await Promise.all(shortlisted.map(async (result: any) => {
        const details = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id: result.place_id,
                fields: 'name,formatted_address,formatted_phone_number,rating,user_ratings_total,website,photos,url,geometry',
                key
            }
        });

        const detail = details.data?.result || {};
        const photoRef = detail?.photos?.[0]?.photo_reference;
        const image = photoRef
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${encodeURIComponent(photoRef)}&key=${encodeURIComponent(key)}`
            : null;

        const placeCoords = Number.isFinite(detail?.geometry?.location?.lat) && Number.isFinite(detail?.geometry?.location?.lng)
            ? { lat: detail.geometry.location.lat, lng: detail.geometry.location.lng }
            : null;
        const km = origin && placeCoords ? distanceKm(origin, placeCoords) : null;

        return {
            id: result.place_id,
            name: detail.name || result.name || query,
            address: detail.formatted_address || result.formatted_address || '',
            phone: detail.formatted_phone_number || '',
            rating: typeof detail.rating === 'number' ? detail.rating : (typeof result.rating === 'number' ? result.rating : null),
            reviewsCount: Number.isFinite(detail.user_ratings_total) ? detail.user_ratings_total : (result.user_ratings_total || 0),
            website: detail.website || '',
            mapsUrl: detail.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
            image,
            distance_km: km,
            types: Array.isArray(result.types) ? result.types : [],
            place_kind: inferSearchPlaceKind({
                name: detail.name || result.name || query,
                address: detail.formatted_address || result.formatted_address || '',
                website: detail.website || '',
                types: Array.isArray(result.types) ? result.types : []
            })
        };
    }));

    const filtered = enriched.filter((place) => {
        if (!origin || place.distance_km == null) return true;
        return place.distance_km <= desiredMaxRadiusKm + 1;
    });

    return filtered
        .sort((a, b) => {
            if (a.distance_km == null && b.distance_km == null) return 0;
            if (a.distance_km == null) return 1;
            if (b.distance_km == null) return -1;
            return a.distance_km - b.distance_km;
        })
        .slice(0, 12);
}

async function buildPlaceRecommendationReply(
    message: string,
    places: any[],
    profileData: any,
    userRole?: string,
    userId?: string | number
) {
    if (!process.env.GEMINI_API_KEY) {
        return '';
    }

    const topPlaces = places.slice(0, 12).map((place: any, index: number) => ({
        rank: index + 1,
        name: place.name,
        address: place.address,
        distance_km: place.distance_km,
        rating: place.rating,
        reviewsCount: place.reviewsCount,
        website: place.website || '',
        mapsUrl: place.mapsUrl,
        place_kind: place.place_kind || '',
        menu_context: typeof place.menu_context === 'string' ? place.menu_context : '',
        raw_inventory_context: typeof place.raw_inventory_context === 'string' ? place.raw_inventory_context : ''
    }));

    const promptFields = getPromptProfileFields(profileData, userRole);
    const allergySection = promptFields.allergies.length > 0
        ? `## Allergy guardrail
- Never recommend anything that conflicts with these allergies: ${promptFields.allergies.join(', ')}`
        : '';
    let memorySection = '';
    if (userId) {
        try {
            memorySection = await buildRelevantMemoryPromptSection(userId, message, userRole || 'consumer');
        } catch (error) {
            console.warn('User memory context lookup failed for place recommendation mode, continuing without memory context:', error);
        }
    }

    const systemInstruction = buildNaviSystemInstruction({
        healthConditions: promptFields.healthConditions,
        dietaryPreferences: promptFields.dietaryPreferences,
        extraSections: [
            allergySection,
            memorySection,
            `## PLACE RECOMMENDATION MODE
- You are helping the user decide from a real nearby result set that has already been retrieved.
- Only recommend places that appear in the provided place list.
- Treat the provided list as the source of truth.
- Pick the best 2 or 3 options based on likely fit, convenience, and quality.
- Mention that there are more options in the suggestions panel.
- Keep the tone warm, practical, and companion-like.
- Use the user's health profile quietly in the background when choosing what to highlight.
- Do not repeatedly explain, summarize, or restate the user's health conditions unless they directly ask for that reasoning.
- Focus on helping the user move toward a better-fit choice, not reinforcing illness identity.
- If raw_inventory_context is available for a place and the user is asking for groceries, produce, or recipe ingredients, prioritize that place first.
- Use raw_inventory_context to name exact produce, pantry ingredients, herbs, or grocery items when available.
- If menu_context is available for a place, use it to recommend specific meals or drinks by name.
- Prefer exact item suggestions from menu_context over generic place-only suggestions when possible.
- Do not invent places that are not in the list.
- Keep the response concise: usually 2 short paragraphs plus a short bullet list at most.
- If distance is available, prefer nearer places when quality seems comparable.`
        ]
    });

    const prompt = `User request:
${message}

User profile summary:
${JSON.stringify({
        health_conditions: promptFields.healthConditions,
        dietary_preferences: promptFields.dietaryPreferences,
        allergies: promptFields.allergies
    }, null, 2)}

Nearby place results:
${JSON.stringify(topPlaces, null, 2)}

Write a short reply using this structure:
1. Acknowledge the craving warmly.
2. Name the best 2 or 3 places from this exact list that fit the request best.
3. If raw_inventory_context is available for a place, name a specific produce item or ingredient from that context when relevant.
4. If menu_context is available for a place, name a specific meal or drink from that context.

Rules:
- Do not turn this into a generic ratings summary.
- Do not recommend a conflicting option just because it is nearby or highly rated.
- Only mention the user's health conditions if it materially changes the recommendation and adds clear value in that exact reply.
- Keep the emphasis on the upgrade or better-fit choice, not on labeling the user by a condition.
- If the craving is burger, coffee, sweets, fried food, or alcohol, steer toward the upgrade version of it.
- Mention that there are more options in the suggestions panel.
- Keep it to 2 or 3 sentences total.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const completion = await generateWithFallbackModels(genAI, prompt, systemInstruction, []);
    return completion.text.trim();
}

function messageReferencesCurrentPlaces(message: string) {
    const text = message.toLowerCase();
    return /(these|those|current|shown|listed|options|locations|cafes|places)/.test(text)
        || /(which one|which of these|do these|do any of these|from the list)/.test(text);
}

function buildSuggestionAwareFallbackReply(message: string, places: any[]) {
    const foodTerms = extractFoodTerms(message);
    const target = foodTerms[0] || 'that';
    const topPlaces = places.slice(0, 3);

    if (topPlaces.length === 0) {
        return `I do not have any current nearby suggestions to compare yet. If you refresh the list, I can help narrow it down from there.`;
    }

    const placeNames = topPlaces.map((place: any) => place.name).join(', ');

    if (/(do these|do any of these|which of these|have)/i.test(message)) {
        return `I cannot fully confirm each menu item from the saved place data alone, but from your current suggestions I would start with ${placeNames} for ${target}. If you want, I can help narrow down which one is the best first bet from the current list.`;
    }

    return `From your current nearby suggestions, I would start with ${placeNames}. There may be more options in the suggestions panel if you want to compare a bit wider.`;
}

async function buildSuggestionAwareReply(
    message: string,
    places: any[],
    profileData: any,
    userRole?: string,
    userId?: string | number
) {
    if (!process.env.GEMINI_API_KEY) {
        return buildSuggestionAwareFallbackReply(message, places);
    }

    const topPlaces = places.slice(0, 12).map((place: any, index: number) => ({
        rank: index + 1,
        name: place.name,
        address: place.address,
        distance_km: place.distance_km,
        rating: place.rating,
        reviewsCount: place.reviewsCount,
        website: place.website || '',
        mapsUrl: place.mapsUrl,
        place_kind: place.place_kind || '',
        menu_context: typeof place.menu_context === 'string' ? place.menu_context : '',
        raw_inventory_context: typeof place.raw_inventory_context === 'string' ? place.raw_inventory_context : ''
    }));

    const promptFields = getPromptProfileFields(profileData, userRole);
    const allergySection = promptFields.allergies.length > 0
        ? `## Allergy guardrail
- Never recommend anything that conflicts with these allergies: ${promptFields.allergies.join(', ')}`
        : '';
    let memorySection = '';
    if (userId) {
        try {
            memorySection = await buildRelevantMemoryPromptSection(userId, message, userRole || 'consumer');
        } catch (error) {
            console.warn('User memory context lookup failed for suggestion follow-up mode, continuing without memory context:', error);
        }
    }

    const systemInstruction = buildNaviSystemInstruction({
        healthConditions: promptFields.healthConditions,
        dietaryPreferences: promptFields.dietaryPreferences,
        extraSections: [
            allergySection,
            memorySection,
            `## CURRENT SUGGESTIONS FOLLOW-UP MODE
- The user is asking about the currently displayed suggestion list.
- Only refer to places that appear in the provided list.
- Treat the list as the source of truth.
- Never introduce a new place name that does not appear in the provided list.
- Preserve the exact place names from the provided list when you mention them.
- If the user asks whether these places have a specific item, be honest when you cannot confirm exact menu availability.
- In that case, say which places are the best candidates from the current list instead of pretending to know.
- If raw_inventory_context is available, use it to name specific produce or ingredient items.
- If menu_context is available, use it to name specific dishes or drinks.
- Use the user's health profile quietly in the background when deciding what to highlight.
- Do not restate the user's health conditions unless it is necessary to avoid a clear conflict or they explicitly ask why.
- Focus on better-fit choices and practical support, not illness identity framing.
- Keep the tone warm, natural, and companion-like.
- Keep it concise.`
        ]
    });

    const prompt = `User follow-up:
${message}

Current displayed suggestions:
${JSON.stringify(topPlaces, null, 2)}

Answer the user's follow-up using this exact list. Do not mention any place name that is not in the list. If exact menu availability is unknown, say that clearly and point them to the best candidates from the current list. If a place has raw_inventory_context or menu_context, use that to be more specific.`;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, prompt, systemInstruction, []);
        return completion.text.trim();
    } catch {
        return buildSuggestionAwareFallbackReply(message, places);
    }
}

router.post('/', authenticateTokenOptional, async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'AI Error', details: 'Gemini API key missing' });
        return;
    }

    const { message, location, visiblePlaces, conversationId, tags } = req.body || {};
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';
    const normalizedTags = normalizeChatTags(tags);
    const effectiveMessage = buildChatMessageFallback(String(message || ''), normalizedTags);

    if (!effectiveMessage) {
        res.status(400).json({ error: 'Message or subject tag is required' });
        return;
    }

    try {
        const topLevelIntent = await classifyFindOrKnowledge(effectiveMessage);
        let profileData: UserProfile = {};
        if (userId) {
            try {
                profileData = await fetchRoleProfileData(userId, userRole);
            } catch (profileErr) {
                console.warn('Profile context lookup failed, continuing without profile context:', profileErr);
                profileData = {};
            }
        }

        const intentClassification = classifyIntent(effectiveMessage, normalizedTags);
        const promptFields = getPromptProfileFields(profileData, userRole);
        const userSettings = getUserSettings(profileData, userRole);
        const locationLinkRule = buildLocationLinkRule(profileData, location);
        let memorySection = '';
        if (userId) {
            try {
                memorySection = await buildRelevantMemoryPromptSection(userId, effectiveMessage, userRole);
            } catch (memoryErr) {
                console.warn('User memory context lookup failed, continuing without memory context:', memoryErr);
            }
        }
        const allergySection = promptFields.allergies.length > 0
            ? `## Allergy guardrail
- Never recommend anything that conflicts with these allergies: ${promptFields.allergies.join(', ')}`
            : '';
        const systemInstruction = buildNaviSystemInstruction({
            healthConditions: promptFields.healthConditions,
            dietaryPreferences: promptFields.dietaryPreferences,
            extraSections: [
                allergySection,
                locationLinkRule,
                memorySection,
                buildUserSettingsInstruction(userSettings),
                buildIntentSystemSection(intentClassification),
                `## CURRENT USER PROFILE
User role: ${userRole}
Full profile data:
${JSON.stringify(profileData, null, 2)}

Use this profile directly for personalization. Do not ask for details already provided.
                - Filter every food and drink suggestion through the user's health profile before answering.
                - Never fall back to generic place-picking if the profile changes what the best choice should be.`
            ]
        });

        const mergedProfile = {
            ...profileData,
            ...(profileData?.consumer_health_profile || {})
        };
        const profileComplete = isProfileComplete(mergedProfile);
        const personalizationNudge = buildPersonalizationNudge(Boolean(userId), profileComplete);

        let activeConversationId = String(conversationId || '').trim();
        if (userId) {
            await ensureChatConversationSchema();
        }

        if (userId && activeConversationId) {
            const existingConversation = await pool.query(
                `SELECT id FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [activeConversationId, userId]
            );
            if (existingConversation.rows.length === 0) {
                activeConversationId = '';
            }
        }

        if (userId && !activeConversationId) {
            const newConversation = await pool.query(
                `INSERT INTO conversations (user_id, title, expires_at)
                 VALUES ($1, $2, NOW() + ($3::int || ' days')::interval)
                 RETURNING id`,
                [userId, buildConversationTitle(effectiveMessage), userSettings.chatRetentionDays]
            );
            activeConversationId = String(newConversation.rows[0].id);
        }

        if (userId && activeConversationId) {
            await pool.query(
                `INSERT INTO chat_history (user_id, conversation_id, role, message)
                 VALUES ($1, $2, $3, $4)`,
                [userId, activeConversationId, 'user', effectiveMessage]
            );
        }

        const historyRes = userId && activeConversationId
            ? await pool.query(
                `SELECT role, message FROM chat_history
                 WHERE user_id = $1 AND conversation_id = $2
                 ORDER BY created_at ASC
                 LIMIT 40`,
                [userId, activeConversationId]
            )
            : { rows: [] };

        const rawHistory = historyRes.rows.map((row: any) => ({
            role: toGeminiRole(row.role),
            parts: [{ text: String(row.message) }]
        }));

        const cleanHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        let lastRole: 'user' | 'model' | null = null;
        for (const entry of rawHistory.slice(0, -1)) {
            if ((entry.role === 'user' || entry.role === 'model') && entry.role !== lastRole) {
                cleanHistory.push(entry);
                lastRole = entry.role;
            }
        }
        while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') cleanHistory.shift();
        while (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role !== 'model') cleanHistory.pop();

        const currentVisiblePlaces = Array.isArray(visiblePlaces) ? visiblePlaces.slice(0, 12) : [];
        const isSuggestionFollowUp = currentVisiblePlaces.length > 0 && messageReferencesCurrentPlaces(message);
        const findSearchPlan = !isSuggestionFollowUp && topLevelIntent === 'find'
            ? await buildFindSearchPlan({
                message: effectiveMessage,
                tags: normalizedTags,
                profileData,
                location
            })
            : null;
        const searchQueries = isSuggestionFollowUp ? [] : (findSearchPlan?.searchQueries || []);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        let aiResponse = '';
        let modelName = 'fallback-local';
        let triedModels: string[] = [];
        let usedFallback = false;
        const preserveForHealth = Boolean(userId) && shouldPreserveConversationForHealth(intentClassification.intent, mergedProfile);
        let responseSearchQueries = searchQueries;

        if (isSuggestionFollowUp) {
            aiResponse = await buildSuggestionAwareReply(effectiveMessage, currentVisiblePlaces, profileData, userRole, userId);
            modelName = 'suggestion-aware';
        } else {
            try {
                const completion = await generateWithFallbackModels(genAI, effectiveMessage, systemInstruction, cleanHistory);
                aiResponse = completion.text;
                modelName = completion.modelName;
                triedModels = completion.tried;
            } catch (generationError: any) {
                console.error('LLM CALL FAILED:', {
                    message: generationError?.message,
                    code: generationError?.code,
                    status: generationError?.status,
                    stack: generationError?.stack?.split('\n')[0]
                });
                console.warn('AI generation failed, using local fallback reply:', generationError?.message || generationError);
                aiResponse = buildSmartFallbackChatResponse(effectiveMessage, profileData, location);
                triedModels = generationError?.triedModels || [];
                usedFallback = true;
            }

            if (
                topLevelIntent === 'find' &&
                responseSearchQueries.length === 0 &&
                (intentClassification.intent === 'meal_suggestion' ||
                    intentClassification.intent === 'food_search' ||
                    intentClassification.intent === 'general')
            ) {
                responseSearchQueries = buildCompanionPlaceQueriesFromReply(effectiveMessage, aiResponse, profileData);
            }
        }

        const shouldForceClarifier = userSettings.proactiveFollowUp
            ? shouldOfferFulfillmentClarifier(
                effectiveMessage,
                normalizedTags,
                intentClassification.intent,
                responseSearchQueries
            )
            : false;
        const shouldAskFulfillmentQuestion = userSettings.proactiveFollowUp
            ? shouldForceClarifier || Boolean(detectFulfillmentFollowUp(aiResponse))
            : false;
        const shouldAskRecipeConversionQuestion = shouldOfferRecipeConversionFollowUp(
            effectiveMessage,
            normalizedTags,
            intentClassification.intent,
            aiResponse
        );
        let followUpOptions = null;
        aiResponse = emphasizeLeadSuggestion(aiResponse);
        aiResponse = appendFulfillmentQuestion(aiResponse, shouldAskFulfillmentQuestion);
        aiResponse = appendRecipeConversionQuestion(aiResponse, shouldAskRecipeConversionQuestion);
        aiResponse = appendPersonalizationNudge(aiResponse, personalizationNudge);
        if (shouldAskRecipeConversionQuestion) {
            followUpOptions = getRecipeConversionFollowUpOptions();
        } else if (shouldAskFulfillmentQuestion) {
            followUpOptions = detectFulfillmentFollowUp(aiResponse) || getFulfillmentFollowUpOptions();
        }

        if (userId && activeConversationId) {
            await pool.query(
                `INSERT INTO chat_history (user_id, conversation_id, role, message)
                 VALUES ($1, $2, $3, $4)`,
                [userId, activeConversationId, 'assistant', aiResponse]
            );
        }

        if (userId && activeConversationId) {
            await pool.query(
                `UPDATE conversations
                 SET updated_at = NOW(),
                     title = COALESCE(NULLIF(title, ''), $1),
                     expires_at = CASE
                         WHEN saved_by_user = TRUE OR health_relevant = TRUE THEN expires_at
                         ELSE NOW() + ($4::int || ' days')::interval
                     END,
                     health_relevant = health_relevant OR $5::boolean
                 WHERE id = $2 AND user_id = $3`,
                [buildConversationTitle(effectiveMessage), activeConversationId, userId, userSettings.chatRetentionDays, preserveForHealth]
            );
        }

        res.json({
            reply: aiResponse,
            response: aiResponse,
            usedFallback,
            conversationId: activeConversationId || null,
            intent: intentClassification.intent,
            intentConfidence: intentClassification.confidence,
            mixedIntent: intentClassification.mixed,
            queryIntent: topLevelIntent,
            locale: findSearchPlan?.locale || resolveLocaleFromProfileAndLocation(profileData, location),
            resolvedCategories: findSearchPlan?.resolvedCategories || [],
            model: modelName,
            followUpOptions,
            searchQueries: responseSearchQueries,
            tried_models: triedModels
        });
    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to process chat',
            details: error.message,
            tried_models: error?.triedModels || []
        });
    }
});

router.post('/search-context', authenticateTokenOptional, async (req: Request, res: Response) => {
    const { message, tags, location } = req.body || {};
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';
    const normalizedTags = normalizeChatTags(tags);
    const effectiveMessage = buildChatMessageFallback(String(message || ''), normalizedTags);

    if (!effectiveMessage) {
        res.status(400).json({ error: 'Message or subject tag is required' });
        return;
    }

    try {
        const topLevelIntent = await classifyFindOrKnowledge(effectiveMessage);
        const profileData = userId ? await fetchRoleProfileData(userId, userRole) as UserProfile : {};

        if (topLevelIntent !== 'find') {
            res.json({
                intentType: topLevelIntent,
                locale: resolveLocaleFromProfileAndLocation(profileData, location),
                resolvedCategories: [],
                searchQueries: []
            });
            return;
        }

        const plan = await buildFindSearchPlan({
            message: effectiveMessage,
            tags: normalizedTags,
            profileData,
            location
        });
        res.json({
            intentType: topLevelIntent,
            locale: plan.locale,
            resolvedCategories: plan.resolvedCategories,
            searchQueries: plan.searchQueries
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to build search context', details: error.message });
    }
});

router.post('/extract-grocery-list', authenticateTokenOptional, async (req: Request, res: Response) => {
    const recipeText = String(req.body?.recipeText || '').trim();

    if (!recipeText) {
        res.status(400).json({ error: 'recipeText is required' });
        return;
    }

    try {
        const result = await extractGroceryList(recipeText);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to extract grocery list', details: error.message });
    }
});

router.post('/source-ingredients/premium', authenticateTokenOptional, async (req: Request, res: Response) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const queries = buildIngredientSourceQueries(items, 'premium');

    try {
        const places = await searchManagedPlaceProfiles(queries, 8);
        res.json({ places, queries });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to source premium findings', details: error.message });
    }
});

router.post('/source-inquiry/premium', authenticateTokenOptional, async (req: Request, res: Response) => {
    const queries = Array.isArray(req.body?.queries)
        ? req.body.queries.map((query: unknown) => String(query || '').trim()).filter(Boolean)
        : [];
    const limit = Number.isFinite(Number(req.body?.limit)) ? Number(req.body.limit) : 8;

    if (queries.length === 0) {
        res.json({ places: [], queries: [] });
        return;
    }

    try {
        const places = await searchManagedPlaceProfiles(queries, Math.max(1, Math.min(limit, 24)));
        res.json({ places, queries });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to source premium inquiry findings', details: error.message });
    }
});

router.post('/source-inquiry/google', authenticateTokenOptional, async (req: Request, res: Response) => {
    const queries = Array.isArray(req.body?.queries)
        ? req.body.queries.map((query: unknown) => String(query || '').trim()).filter(Boolean)
        : [];
    const location = String(req.body?.location || '').trim();
    const radiusKm = Number.isFinite(Number(req.body?.radiusKm)) ? Number(req.body.radiusKm) : 25;
    const limit = Number.isFinite(Number(req.body?.limit)) ? Number(req.body.limit) : GOOGLE_SOURCE_RESULT_LIMIT;
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';

    if (queries.length === 0) {
        res.json({ places: [], queries: [] });
        return;
    }

    try {
        const profileData = userId ? await fetchRoleProfileData(userId, userRole) as UserProfile : {};
        const locale = resolveLocaleFromProfileAndLocation(profileData, location);
        const grouped = await Promise.all(queries.map(async (query: string) => {
            try {
                const places = await searchGooglePlaces(query, location, radiusKm, locale);
                if (places.length > 0) return places;
            } catch {
                // continue collecting from remaining queries
            }
            return [];
        }));

        const deduped = new Map<string, any>();
        for (const places of grouped) {
            for (const place of places) {
                const key = String(place.id || `${place.name}-${place.address}`);
                if (!deduped.has(key)) deduped.set(key, place);
            }
        }

        const hydratedPlaces = await hydratePlacesWithProfileData(Array.from(deduped.values()));
        const places = hydratedPlaces
            .sort((a, b) => {
                const priorityDiff = placeInventoryPriority(b, queries) - placeInventoryPriority(a, queries);
                if (priorityDiff !== 0) return priorityDiff;
                if (a.distance_km == null && b.distance_km == null) return 0;
                if (a.distance_km == null) return 1;
                if (b.distance_km == null) return -1;
                return a.distance_km - b.distance_km;
            })
            .slice(0, Math.max(1, Math.min(limit, GOOGLE_SOURCE_RESULT_LIMIT)));

        res.json({ places, queries });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to source Google inquiry findings', details: error.message });
    }
});

router.post('/source-ingredients/google', authenticateTokenOptional, async (req: Request, res: Response) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const location = String(req.body?.location || '').trim();
    const radiusKm = Number.isFinite(Number(req.body?.radiusKm)) ? Number(req.body.radiusKm) : 25;
    const queries = buildIngredientSourceQueries(items, 'google');

    if (queries.length === 0) {
        res.json({ places: [], queries: [] });
        return;
    }

    try {
        const grouped = await Promise.all(queries.map(async (query) => {
            try {
                const places = await searchGooglePlaces(query, location, radiusKm);
                if (places.length > 0) return places;
            } catch {
                // continue collecting from remaining queries
            }
            return [];
        }));

        const deduped = new Map<string, any>();
        for (const places of grouped) {
            for (const place of places) {
                const key = String(place.id || `${place.name}-${place.address}`);
                if (!deduped.has(key)) deduped.set(key, place);
            }
        }

        const hydratedPlaces = await hydratePlacesWithProfileData(Array.from(deduped.values()));
        const places = hydratedPlaces
            .sort((a, b) => {
                const priorityDiff = placeInventoryPriority(b, queries) - placeInventoryPriority(a, queries);
                if (priorityDiff !== 0) return priorityDiff;
                if (a.distance_km == null && b.distance_km == null) return 0;
                if (a.distance_km == null) return 1;
                if (b.distance_km == null) return -1;
                return a.distance_km - b.distance_km;
            })
            .slice(0, GOOGLE_SOURCE_RESULT_LIMIT);

        res.json({ places, queries });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to source Google places', details: error.message });
    }
});

function queryHasInventoryIntent(queries: string[]) {
    return queries.some((query) => /(ingredient|ingredients|produce|vegetable|vegetables|fruit|fruits|grocery|grocer|market|recipe|cook|cooking|meal prep|farm|farm stand|herb|spice)/.test(String(query).toLowerCase()));
}

function tokenizeSearchQueryTerms(queries: string[]) {
    const stopWords = new Set([
        'near', 'me', 'nearby', 'local', 'restaurant', 'restaurants', 'cafe', 'cafes', 'place', 'places',
        'spot', 'spots', 'healthy', 'food', 'foods', 'option', 'options', 'delivery', 'takeout', 'pickup',
        'meal', 'meals', 'shop', 'store', 'for', 'the', 'and', 'with'
    ]);

    return Array.from(new Set(
        queries
            .flatMap((query) => String(query || '').toLowerCase().split(/[^a-z0-9]+/))
            .map((term) => term.trim())
            .filter((term) => term.length >= 3 && !stopWords.has(term))
    ));
}

function placeRequestMatchPriority(place: any, queries: string[]) {
    const normalizedQueries = queries
        .map((query) => String(query || '').trim().toLowerCase())
        .filter(Boolean);
    const queryTerms = tokenizeSearchQueryTerms(normalizedQueries);
    const haystack = [
        place?.name,
        place?.address,
        place?.website,
        place?.menu_context,
        place?.raw_inventory_context,
        Array.isArray(place?.types) ? place.types.join(' ') : ''
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    let score = 0;
    normalizedQueries.forEach((query) => {
        if (query.length >= 4 && haystack.includes(query)) {
            score += 18;
        }
    });
    queryTerms.forEach((term) => {
        if (haystack.includes(term)) {
            score += 4;
        }
    });
    return score;
}

function placeInventoryPriority(place: any, queries: string[]) {
    const normalizedQueries = queries
        .map((query) => String(query || '').trim().toLowerCase())
        .filter(Boolean);
    const inventoryContext = String(place?.raw_inventory_context || '').toLowerCase();
    const menuContext = String(place?.menu_context || '').toLowerCase();
    const name = String(place?.name || '').toLowerCase();
    const address = String(place?.address || '').toLowerCase();

    let score = Number(place?.search_priority || 0);
    score += placeKindIntentBias(place, normalizedQueries);
    score += placeRequestMatchPriority(place, normalizedQueries);

    if (inventoryContext && queryHasInventoryIntent(normalizedQueries)) {
        score += 20;
    }

    normalizedQueries.forEach((query) => {
        if (inventoryContext.includes(query)) score += 8;
        if (menuContext.includes(query)) score += 4;
        if (name.includes(query)) score += 4;
        if (address.includes(query)) score += 1;
    });

    return score;
}

router.post('/places', authenticateTokenOptional, async (req: Request, res: Response) => {
    const { queries, location, radiusKm, limit } = req.body || {};
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';
    if (!Array.isArray(queries) || queries.length === 0) {
        res.status(400).json({ error: 'queries array is required' });
        return;
    }

    try {
        const uniqueQueries = Array.from(new Set(
            queries
                .map((query: any) => String(query || '').trim())
                .filter(Boolean)
        )).slice(0, 8);

        const keyConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
        const requestedLimit = Number.isFinite(Number(limit))
            ? Math.min(48, Math.max(1, Number(limit)))
            : 16;
        const profileData = userId ? await fetchRoleProfileData(userId, userRole) as UserProfile : {};
        const locale = resolveLocaleFromProfileAndLocation(profileData, location);
        const userLocation = await resolveLocationCoordinates(location, locale);
        const results = await searchPlacesForTerms({
            searchTerms: uniqueQueries,
            userLocation,
            radiusMeters: Number.isFinite(Number(radiusKm)) ? Math.max(1000, Number(radiusKm) * 1000) : 5000,
            locale,
            limit: requestedLimit
        });

        res.json({
            places: results.combinedResults,
            premiumResults: results.premiumResults,
            googleResults: results.googleResults,
            fallbackMessage: results.fallbackMessage,
            locale,
            enriched: keyConfigured
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch places', details: error.message });
    }
});

router.post('/recommend-places', authenticateTokenOptional, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { message, places, conversationId } = req.body || {};

    if (!message || !Array.isArray(places) || places.length === 0) {
        res.status(400).json({ error: 'message and non-empty places array are required' });
        return;
    }

    try {
        const userRole = (req as any).user?.role || 'consumer';
        const profileData = userId ? await fetchRoleProfileData(userId, userRole) : {};
        const mergedProfile = {
            ...profileData,
            ...(profileData?.consumer_health_profile || {})
        };
        const response = appendPersonalizationNudge(
            await buildPlaceRecommendationReply(
                String(message),
                places,
                profileData,
                userRole,
                userId
            ),
            buildPersonalizationNudge(Boolean(userId), isProfileComplete(mergedProfile))
        );

        if (userId) {
            await pool.query(
                `UPDATE chat_history
                 SET message = $1
                 WHERE ctid IN (
                      SELECT ctid
                      FROM chat_history
                      WHERE user_id = $2 AND role = 'assistant'
                        AND ($3::uuid IS NULL OR conversation_id = $3::uuid)
                      ORDER BY created_at DESC
                      LIMIT 1
                  )`,
                [response, userId, conversationId || null]
            );
        }

        res.json({ response });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to recommend places', details: error.message });
    }
});

router.get('/history', authenticateToken, async (req: Request, res: Response) => {
    await ensureChatConversationSchema();
    const userId = (req as any).user.id;
    try {
        const summary = await pool.query(
            `SELECT id, title, created_at, updated_at
             FROM conversations
              WHERE user_id = $1
               AND ${ACTIVE_CONVERSATION_WHERE_SQL}
             ORDER BY updated_at DESC, created_at DESC`,
            [userId]
        );

        res.json(summary.rows.map((row: any) => ({
            id: String(row.id),
            title: row.title || 'Untitled Chat',
            created_at: row.created_at,
            updated_at: row.updated_at
        })));
    } catch (error) {
        console.error('History list error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

router.get('/history/:id', authenticateToken, async (req: Request, res: Response) => {
    await ensureChatConversationSchema();
    const userId = String((req as any).user.id);
    const historyId = String(req.params.id);

    const conversationRes = await pool.query(
        `SELECT id, suggestion_state
         FROM conversations
         WHERE id = $1 AND user_id = $2
           AND ${ACTIVE_CONVERSATION_WHERE_SQL}
         LIMIT 1`,
        [historyId, userId]
    );

    if (conversationRes.rows.length === 0) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const messages = await pool.query(
            `SELECT role, message AS content, created_at
             FROM chat_history WHERE user_id = $1 AND conversation_id = $2
             ORDER BY created_at ASC`,
            [userId, historyId]
        );
        res.json({
            messages: messages.rows,
            suggestionState: conversationRes.rows[0]?.suggestion_state || null
        });
    } catch (error) {
        console.error('History detail error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.put('/history/:id/suggestion-state', authenticateToken, async (req: Request, res: Response) => {
    await ensureChatConversationSchema();
    const userId = String((req as any).user.id);
    const historyId = String(req.params.id || '').trim();
    const suggestionState = req.body?.suggestionState ?? null;

    if (!historyId) {
        res.status(400).json({ error: 'conversationId is required' });
        return;
    }

    try {
        const userRes = await pool.query(
            `SELECT profile_data
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [userId]
        );
        const retentionDays = getChatRetentionDays(userRes.rows[0]?.profile_data || {});
        const updateResult = await pool.query(
            `UPDATE conversations
             SET suggestion_state = $1::jsonb,
                 updated_at = NOW(),
                 expires_at = CASE
                     WHEN saved_by_user = TRUE OR health_relevant = TRUE THEN expires_at
                     ELSE NOW() + ($4::int || ' days')::interval
                 END
              WHERE id = $2 AND user_id = $3
              RETURNING id, suggestion_state`,
            [JSON.stringify(suggestionState), historyId, userId, retentionDays]
        );

        if (updateResult.rows.length === 0) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        res.json({
            success: true,
            conversationId: historyId,
            suggestionState: updateResult.rows[0]?.suggestion_state || null
        });
    } catch (error) {
        console.error('Suggestion state save error:', error);
        res.status(500).json({ error: 'Failed to save suggestion state' });
    }
});

router.delete('/history/:id', authenticateToken, async (req: Request, res: Response) => {
    await ensureChatConversationSchema();
    const userId = String((req as any).user.id);
    const historyId = String(req.params.id || '').trim();

    if (!historyId) {
        res.status(400).json({ error: 'conversationId is required' });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const conversationRes = await client.query(
            `SELECT id
             FROM conversations
             WHERE id = $1 AND user_id = $2
             LIMIT 1`,
            [historyId, userId]
        );

        if (conversationRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        await client.query(
            `DELETE FROM conversations
             WHERE id = $1 AND user_id = $2`,
            [historyId, userId]
        );

        const userRes = await client.query(
            `SELECT profile_data
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [userId]
        );

        if (userRes.rows.length > 0) {
            const profileData = userRes.rows[0]?.profile_data || {};
            const currentFavoriteChats = Array.isArray(profileData.favorite_chats)
                ? profileData.favorite_chats
                : [];
            const nextFavoriteChats = currentFavoriteChats.filter((entry: any) => {
                if (typeof entry === 'string') return entry !== historyId;
                if (!entry || typeof entry !== 'object') return false;
                return String(entry.id || '').trim() !== historyId;
            });

            await client.query(
                `UPDATE users
                 SET profile_data = $2::jsonb,
                     updated_at = NOW()
                 WHERE id = $1`,
                [
                    userId,
                    JSON.stringify({
                        ...profileData,
                        favorite_chats: nextFavoriteChats
                    })
                ]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, conversationId: historyId });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback errors after the original failure.
        }
        console.error('History delete error:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    } finally {
        client.release();
    }
});

export default router;
