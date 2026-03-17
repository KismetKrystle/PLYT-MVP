import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { buildNaviSystemInstruction } from '../config/persona';
import { fetchRoleProfileData } from '../services/profileContext';

const router = express.Router();
let chatSchemaReady: Promise<void> | null = null;

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
        })().catch((error) => {
            chatSchemaReady = null;
            throw error;
        });
    }

    return chatSchemaReady;
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

    return [
        { id: 'ready_to_eat', label: 'Ready to Eat', prompt: 'I want ready-to-eat options near me.' },
        { id: 'recipe_ideas', label: 'Recipe Ideas', prompt: 'I want recipe ideas for this.' },
        { id: 'prepared_for_later', label: 'Prepared for Later', prompt: 'I want prepared-for-later or meal prep options.' },
        { id: 'raw_produce', label: 'Raw Produce Nearby', prompt: 'I want raw produce to buy nearby.' }
    ];
}

function inferFulfillmentMode(message: string) {
    const text = message.toLowerCase();
    if (/(recipe|cook|make|prepare at home|how do i make)/.test(text)) return 'recipe_ideas';
    if (/(meal prep|prepared for later|prep ahead|for later)/.test(text)) return 'prepared_for_later';
    if (/(produce|market|grocer|grocery|ingredients|farmers market|vegetable|fruit)/.test(text)) return 'raw_produce';
    if (/(restaurant|cafe|takeout|delivery|ready to eat|eat out|meal near me|salad|smoothie|juice|bowl)/.test(text)) return 'ready_to_eat';
    return 'unknown';
}

function extractFoodTerms(message: string) {
    const text = message.toLowerCase();
    const knownFoods = [
        'coffee', 'tea', 'matcha', 'salad', 'smoothie', 'juice', 'bowl', 'wrap', 'sandwich',
        'soup', 'kale', 'spinach', 'tomato', 'avocado', 'fruit', 'vegetable', 'greens',
        'protein bowl', 'raw food', 'brunch', 'dessert', 'pizza', 'sushi', 'burger', 'bakery', 'cafe'
    ];
    const found = knownFoods.filter((food) => text.includes(food));
    return found.length > 0 ? found.slice(0, 3) : [];
}

function buildDietModifiers(profileData: any) {
    const preferences = new Set<string>((profileData?.dietary_preferences || []).map((value: string) => value.toLowerCase()));
    const modifiers: string[] = [];
    if (preferences.has('vegan') || preferences.has('raw_vegan')) modifiers.push('vegan');
    else if (preferences.has('vegetarian')) modifiers.push('vegetarian');
    else if (preferences.has('pescatarian') || preferences.has('pescetarian')) modifiers.push('pescatarian');
    if (preferences.has('gluten_free') || preferences.has('celiac')) modifiers.push('gluten free');
    if (preferences.has('dairy_free')) modifiers.push('dairy free');
    return modifiers.slice(0, 2);
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

    return Array.from(queries);
}

function buildSearchQueries(message: string, profileData: any) {
    const mode = inferFulfillmentMode(message);
    const foods = extractFoodTerms(message);
    const modifiers = buildDietModifiers(profileData);
    const baseFood = foods[0] || 'healthy food';
    const queries = new Set<string>();
    const upgradeQueries = buildCravingUpgradeQueries(baseFood, profileData);

    const withModifiers = (phrase: string) => {
        if (modifiers.length === 0) {
            queries.add(phrase);
            return;
        }
        modifiers.forEach((modifier) => queries.add(`${modifier} ${phrase}`));
        queries.add(phrase);
    };

    if (mode === 'ready_to_eat') {
        withModifiers(`${baseFood} restaurant`);
        withModifiers(`${baseFood} cafe`);
        upgradeQueries.forEach((query) => withModifiers(query));
        if (baseFood === 'coffee') {
            withModifiers('coffee shop');
            withModifiers('specialty coffee');
        }
        if (baseFood !== 'healthy food') withModifiers(`${baseFood} near me`);
        withModifiers('healthy restaurant');
    } else if (mode === 'raw_produce') {
        withModifiers(`${baseFood} market`);
        withModifiers(`${baseFood} grocery`);
        queries.add('farmers market');
        queries.add('produce market');
    } else if (mode === 'prepared_for_later') {
        withModifiers(`${baseFood} meal prep`);
        withModifiers('healthy meal prep');
        withModifiers('prepared meals');
    } else if (mode === 'recipe_ideas') {
        return [];
    } else {
        withModifiers(`${baseFood} restaurant`);
        withModifiers(`${baseFood} cafe`);
        queries.add('healthy food');
    }

    return Array.from(queries).slice(0, 6);
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

async function geocodeLocation(location: string, key: string) {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: location, key, region: 'id' }
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

async function searchGooglePlaces(query: string, location?: string, maxRadiusKm?: number) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return [];

    const origin = parseCoordinates(location) || (location?.trim() ? await geocodeLocation(location, key) : null);
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
                region: 'id',
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
            distance_km: km
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

async function buildPlaceRecommendationReply(message: string, places: any[], profileData: any, userRole?: string) {
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
        mapsUrl: place.mapsUrl
    }));

    const promptFields = getPromptProfileFields(profileData, userRole);
    const allergySection = promptFields.allergies.length > 0
        ? `## Allergy guardrail
- Never recommend anything that conflicts with these allergies: ${promptFields.allergies.join(', ')}`
        : '';

    const systemInstruction = buildNaviSystemInstruction({
        healthConditions: promptFields.healthConditions,
        dietaryPreferences: promptFields.dietaryPreferences,
        extraSections: [
            allergySection,
            `## PLACE RECOMMENDATION MODE
- You are helping the user decide from a real nearby result set that has already been retrieved.
- Only recommend places that appear in the provided place list.
- Treat the provided list as the source of truth.
- Pick the best 2 or 3 options based on likely fit, convenience, and quality.
- Mention that there are more options in the suggestions panel.
- Keep the tone warm, practical, and companion-like.
- Use the user's health profile naturally when choosing which places or drinks to highlight.
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
2. Explain in one sentence what would address that craving better through the user's health profile.
3. Name the best 2 or 3 places from this exact list that fit that upgraded direction best.

Rules:
- Do not turn this into a generic ratings summary.
- Do not recommend a conflicting option just because it is nearby or highly rated.
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

async function buildSuggestionAwareReply(message: string, places: any[], profileData: any, userRole?: string) {
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
        mapsUrl: place.mapsUrl
    }));

    const promptFields = getPromptProfileFields(profileData, userRole);
    const allergySection = promptFields.allergies.length > 0
        ? `## Allergy guardrail
- Never recommend anything that conflicts with these allergies: ${promptFields.allergies.join(', ')}`
        : '';

    const systemInstruction = buildNaviSystemInstruction({
        healthConditions: promptFields.healthConditions,
        dietaryPreferences: promptFields.dietaryPreferences,
        extraSections: [
            allergySection,
            `## CURRENT SUGGESTIONS FOLLOW-UP MODE
- The user is asking about the currently displayed suggestion list.
- Only refer to places that appear in the provided list.
- Treat the list as the source of truth.
- If the user asks whether these places have a specific item, be honest when you cannot confirm exact menu availability.
- In that case, say which places are the best candidates from the current list instead of pretending to know.
- Use the user's health profile naturally when deciding what to highlight.
- Keep the tone warm, natural, and companion-like.
- Keep it concise.`
        ]
    });

    const prompt = `User follow-up:
${message}

Current displayed suggestions:
${JSON.stringify(topPlaces, null, 2)}

Answer the user's follow-up using this exact list. If exact menu availability is unknown, say that clearly and point them to the best candidates from the current list.`;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, prompt, systemInstruction, []);
        return completion.text.trim();
    } catch {
        return buildSuggestionAwareFallbackReply(message, places);
    }
}

router.post('/', authenticateToken, async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'AI Error', details: 'Gemini API key missing' });
        return;
    }

    await ensureChatConversationSchema();

    const { message, location, visiblePlaces, conversationId } = req.body || {};
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';

    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    try {
        let profileData: any = {};
        try {
            profileData = await fetchRoleProfileData(userId, userRole);
        } catch (profileErr) {
            console.warn('Profile context lookup failed, continuing without profile context:', profileErr);
            profileData = {};
        }

        const promptFields = getPromptProfileFields(profileData, userRole);
        const locationLinkRule = buildLocationLinkRule(profileData, location);
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
                `## CURRENT USER PROFILE
User role: ${userRole}
Full profile data:
${JSON.stringify(profileData, null, 2)}

Use this profile directly for personalization. Do not ask for details already provided.
- Filter every food and drink suggestion through the user's health profile before answering.
- Never fall back to generic place-picking if the profile changes what the best choice should be.`
            ]
        });

        let activeConversationId = String(conversationId || '').trim();
        if (activeConversationId) {
            const existingConversation = await pool.query(
                `SELECT id FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [activeConversationId, userId]
            );
            if (existingConversation.rows.length === 0) {
                activeConversationId = '';
            }
        }

        if (!activeConversationId) {
            const newConversation = await pool.query(
                `INSERT INTO conversations (user_id, title)
                 VALUES ($1, $2)
                 RETURNING id`,
                [userId, buildConversationTitle(message)]
            );
            activeConversationId = String(newConversation.rows[0].id);
        }

        await pool.query(
            `INSERT INTO chat_history (user_id, conversation_id, role, message)
             VALUES ($1, $2, $3, $4)`,
            [userId, activeConversationId, 'user', message]
        );

        const historyRes = await pool.query(
            `SELECT role, message FROM chat_history
             WHERE user_id = $1 AND conversation_id = $2
             ORDER BY created_at ASC
             LIMIT 40`,
            [userId, activeConversationId]
        );

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
        const searchQueries = isSuggestionFollowUp ? [] : buildSearchQueries(message, profileData);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        let aiResponse = '';
        let modelName = 'fallback-local';
        let triedModels: string[] = [];
        let usedFallback = false;

        if (isSuggestionFollowUp) {
            aiResponse = await buildSuggestionAwareReply(message, currentVisiblePlaces, profileData, userRole);
            modelName = 'suggestion-aware';
        } else {
            try {
                const completion = await generateWithFallbackModels(genAI, message, systemInstruction, cleanHistory);
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
                aiResponse = buildSmartFallbackChatResponse(message, profileData, location);
                triedModels = generationError?.triedModels || [];
                usedFallback = true;
            }
        }

        await pool.query(
            `INSERT INTO chat_history (user_id, conversation_id, role, message)
             VALUES ($1, $2, $3, $4)`,
            [userId, activeConversationId, 'assistant', aiResponse]
        );

        await pool.query(
            `UPDATE conversations
             SET updated_at = NOW(),
                 title = COALESCE(NULLIF(title, ''), $1)
             WHERE id = $2 AND user_id = $3`,
            [buildConversationTitle(message), activeConversationId, userId]
        );

        res.json({
            reply: aiResponse,
            response: aiResponse,
            usedFallback,
            conversationId: activeConversationId,
            model: modelName,
            followUpOptions: detectFulfillmentFollowUp(aiResponse),
            searchQueries,
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

router.post('/search-context', authenticateToken, async (req: Request, res: Response) => {
    const { message } = req.body || {};
    const user = (req as any).user;
    const userId = user?.id;
    const userRole = user?.role || 'consumer';

    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    try {
        const profileData = await fetchRoleProfileData(userId, userRole);
        const searchQueries = buildSearchQueries(String(message), profileData);
        res.json({ searchQueries });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to build search context', details: error.message });
    }
});

router.post('/places', authenticateToken, async (req: Request, res: Response) => {
    const { queries, location, radiusKm, limit } = req.body || {};
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
        const grouped = await Promise.all(uniqueQueries.map(async (query) => {
            try {
                const places = await searchGooglePlaces(query, location, Number(radiusKm));
                if (places.length > 0) return places;
            } catch {
                // fallback below
            }

            return [{
                id: query,
                name: query.split(',')[0]?.trim() || query,
                address: query,
                phone: '',
                rating: null,
                reviewsCount: 0,
                website: '',
                mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                image: null,
                distance_km: null
            }];
        }));

        const deduped = new Map<string, any>();
        for (const places of grouped) {
            for (const place of places) {
                const key = String(place.id || `${place.name}-${place.address}`);
                if (!deduped.has(key)) deduped.set(key, place);
            }
        }

        const requestedLimit = Number.isFinite(Number(limit))
            ? Math.min(48, Math.max(1, Number(limit)))
            : 16;

        const places = Array.from(deduped.values())
            .sort((a, b) => {
                if (a.distance_km == null && b.distance_km == null) return 0;
                if (a.distance_km == null) return 1;
                if (b.distance_km == null) return -1;
                return a.distance_km - b.distance_km;
            })
            .slice(0, requestedLimit);

        res.json({ places, enriched: keyConfigured });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch places', details: error.message });
    }
});

router.post('/recommend-places', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { message, places, conversationId } = req.body || {};

    if (!message || !Array.isArray(places) || places.length === 0) {
        res.status(400).json({ error: 'message and non-empty places array are required' });
        return;
    }

    try {
            const profileData = await fetchRoleProfileData(userId, (req as any).user?.role || 'consumer');
            const response = await buildPlaceRecommendationReply(
                String(message),
                places,
                profileData,
                (req as any).user?.role || 'consumer'
            );

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
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
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
        res.json(messages.rows);
    } catch (error) {
        console.error('History detail error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
