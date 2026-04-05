import { GoogleGenerativeAI } from '@google/generative-ai';

export type IntentType = 'find' | 'knowledge';
export type LocaleCode = 'ID' | 'US';
export type ResolvedCategory =
    | 'produce'
    | 'protein'
    | 'health_specialty'
    | 'supplements'
    | 'herbs_fresh'
    | 'fermented'
    | 'juice';

export interface UserProfile {
    health_conditions?: string[];
    dietary_preferences?: string[];
    location?: {
        city?: string;
        address?: string;
        country?: string;
    } | string | null;
    location_city?: string;
    location_address?: string;
    location_country?: string;
    country?: string;
    [key: string]: any;
}

export interface ResolvedCategories {
    locale: LocaleCode;
    categories: ResolvedCategory[];
    searchTerms: string[];
    source: 'rule' | 'llm' | 'fallback';
}

const vendorKeywordMap: Record<'conditions' | 'dietary_preference', Record<string, ResolvedCategory[]>> = {
    conditions: {
        inflammation: ['produce', 'herbs_fresh', 'supplements'],
        diabetes: ['produce', 'health_specialty'],
        gut_health: ['produce', 'fermented', 'supplements'],
        low_energy: ['produce', 'supplements', 'protein'],
        detox: ['produce', 'herbs_fresh', 'juice'],
        hypertension: ['produce', 'health_specialty'],
        weight_loss: ['produce', 'protein', 'health_specialty'],
        autoimmune: ['produce', 'herbs_fresh', 'supplements']
    },
    dietary_preference: {
        vegan: ['produce', 'health_specialty'],
        vegetarian: ['produce', 'health_specialty'],
        keto: ['protein', 'produce'],
        gluten_free: ['health_specialty', 'produce'],
        halal: ['protein', 'produce']
    }
};

const vendorKeywords: Record<LocaleCode, Record<ResolvedCategory, string[]>> = {
    ID: {
        produce: ['pasar', 'pasar segar', 'pasar pagi', 'pasar tradisional', 'fruit stall', 'vegetable stall'],
        protein: ['fishmonger', 'fish market', 'seafood market', 'butcher', 'halal butcher', 'pasar ikan'],
        health_specialty: ['toko organik', 'organic shop', 'health food store', 'natural foods'],
        supplements: ['apotek', 'toko herbal', 'natural remedy', 'herbal shop', 'vitamin shop'],
        herbs_fresh: ['rempah', 'tanaman obat', 'herbal garden', 'jamu', 'spice market'],
        fermented: ['fermented foods', 'probiotics store', 'tempeh', 'culture foods'],
        juice: ['juice bar', 'cold press', 'smoothie bar']
    },
    US: {
        produce: ['farmers market', 'farmstand', 'CSA pickup', 'u-pick farm', 'produce market', 'fresh market'],
        protein: ['butcher shop', 'artisan butcher', 'meat market', 'fishmonger', 'seafood market'],
        health_specialty: ['natural grocery', 'food co-op', 'Whole Foods', 'Sprouts', 'Natural Grocers', 'organic market'],
        supplements: ['vitamin shop', 'supplement store', 'natural pharmacy', 'apothecary', 'health food store'],
        herbs_fresh: ['herb nursery', 'herb farm', 'botanical shop', 'herbal dispensary', 'spice shop'],
        fermented: ['fermented foods store', 'culture foods', 'probiotic shop', 'kombucha brewery'],
        juice: ['juice bar', 'cold press juice', 'smoothie bar', 'raw juice']
    }
};

const categoryHints: Record<ResolvedCategory, string[]> = {
    produce: ['produce', 'fruit', 'fruits', 'vegetable', 'vegetables', 'market', 'grocery', 'grocer', 'fresh food', 'ingredients'],
    protein: ['protein', 'meat', 'fish', 'seafood', 'butcher', 'halal butcher', 'chicken', 'beef'],
    health_specialty: ['organic', 'natural', 'gluten free', 'health food', 'co-op', 'specialty'],
    supplements: ['supplement', 'vitamin', 'apothecary', 'pharmacy', 'pharmacy', 'remedy'],
    herbs_fresh: ['herb', 'herbs', 'spice', 'spices', 'jamu', 'botanical'],
    fermented: ['fermented', 'probiotic', 'kombucha', 'kimchi', 'tempeh', 'culture foods'],
    juice: ['juice', 'cold press', 'smoothie', 'smoothie bar']
};

const llmFallbackModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

function normalizeValue(value: unknown) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

function normalizeText(value: unknown) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function normalizeStringList(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => normalizeValue(entry)).filter(Boolean);
}

function getAllowedCategories(locale: LocaleCode) {
    return Object.keys(vendorKeywords[locale]) as ResolvedCategory[];
}

function resolveRuleCategories(userProfile: UserProfile, query: string) {
    const categories = new Set<ResolvedCategory>();
    const queryText = normalizeText(query);
    const normalizedConditions = normalizeStringList(userProfile?.health_conditions);
    const normalizedDietaryPreferences = normalizeStringList(userProfile?.dietary_preferences);

    normalizedConditions.forEach((condition) => {
        const matches = vendorKeywordMap.conditions[condition];
        if (matches) matches.forEach((category) => categories.add(category));
    });

    normalizedDietaryPreferences.forEach((preference) => {
        const matches = vendorKeywordMap.dietary_preference[preference];
        if (matches) matches.forEach((category) => categories.add(category));
    });

    (Object.entries(vendorKeywordMap.conditions) as Array<[string, ResolvedCategory[]]>).forEach(([condition, matches]) => {
        const readableCondition = condition.replace(/_/g, ' ');
        if (queryText.includes(readableCondition)) {
            matches.forEach((category) => categories.add(category));
        }
    });

    (Object.entries(vendorKeywordMap.dietary_preference) as Array<[string, ResolvedCategory[]]>).forEach(([preference, matches]) => {
        const readablePreference = preference.replace(/_/g, ' ');
        if (queryText.includes(readablePreference)) {
            matches.forEach((category) => categories.add(category));
        }
    });

    (Object.entries(categoryHints) as Array<[ResolvedCategory, string[]]>).forEach(([category, hints]) => {
        if (hints.some((hint) => queryText.includes(hint))) {
            categories.add(category);
        }
    });

    return Array.from(categories).slice(0, 3);
}

async function classifyCategoriesWithLlm(query: string, userProfile: UserProfile, locale: LocaleCode) {
    if (!process.env.GEMINI_API_KEY) {
        return [];
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const allowedCategories = getAllowedCategories(locale);
    const prompt = `Return ONLY a JSON array of up to 3 category strings from this exact allowed list:
${JSON.stringify(allowedCategories)}

User profile:
${JSON.stringify({
        health_conditions: Array.isArray(userProfile?.health_conditions) ? userProfile.health_conditions : [],
        dietary_preferences: Array.isArray(userProfile?.dietary_preferences) ? userProfile.dietary_preferences : []
    })}

User query:
${query}

Rules:
- Return only a JSON array like ["produce","supplements"]
- No markdown
- No explanation
- Use only values from the allowed list`;

    for (const modelName of llmFallbackModels) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: 'You classify sourcing categories. Return only valid JSON.'
            });
            const chatSession = model.startChat({ history: [] });
            const result = await chatSession.sendMessage(prompt);
            const rawText = result.response.text().trim();
            const parsed = JSON.parse(rawText);
            if (!Array.isArray(parsed)) continue;
            return Array.from(new Set(
                parsed
                    .map((value) => normalizeValue(value))
                    .filter((value): value is ResolvedCategory => allowedCategories.includes(value as ResolvedCategory))
            )).slice(0, 3);
        } catch {
            // Continue to the next fallback model or final fallback.
        }
    }

    return [];
}

export function resolveLocaleFromProfileAndLocation(userProfile: UserProfile, requestLocation?: string): LocaleCode {
    const profileCountryCandidates = [
        userProfile?.country,
        userProfile?.location_country,
        typeof userProfile?.location === 'object' && userProfile.location ? userProfile.location.country : '',
        userProfile?.location_address
    ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

    const requestText = normalizeText(requestLocation);
    const combined = [...profileCountryCandidates, requestText].join(' ');

    if (/(indonesia|jakarta|bali|bandung|surabaya|\bid\b)/.test(combined)) {
        return 'ID';
    }

    if (/(united states|usa|u\.s\.|us\b|california|new york|texas|florida|zip code)/.test(combined)) {
        return 'US';
    }

    return 'US';
}

export async function resolveCategoryTerms(params: {
    userProfile: UserProfile;
    query: string;
    locale: LocaleCode;
}) : Promise<ResolvedCategories> {
    const ruleCategories = resolveRuleCategories(params.userProfile, params.query);
    if (ruleCategories.length > 0) {
        return {
            locale: params.locale,
            categories: ruleCategories,
            searchTerms: Array.from(new Set(ruleCategories.flatMap((category) => vendorKeywords[params.locale][category] || []))),
            source: 'rule'
        };
    }

    const llmCategories = await classifyCategoriesWithLlm(params.query, params.userProfile, params.locale);
    if (llmCategories.length > 0) {
        return {
            locale: params.locale,
            categories: llmCategories,
            searchTerms: Array.from(new Set(llmCategories.flatMap((category) => vendorKeywords[params.locale][category] || []))),
            source: 'llm'
        };
    }

    return {
        locale: params.locale,
        categories: [],
        searchTerms: [],
        source: 'fallback'
    };
}
