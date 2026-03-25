export type IntentName =
    | 'food_search'
    | 'recipe_search'
    | 'health_advice'
    | 'meal_suggestion'
    | 'research'
    | 'library_action'
    | 'general';

export type IntentConfidence = 'low' | 'medium' | 'high';

export type IntentClassification = {
    intent: IntentName;
    confidence: IntentConfidence;
    mixed: IntentName | null;
    scores: Partial<Record<Exclude<IntentName, 'general'>, number>>;
};

type IntentRule = {
    keywords: string[];
    weight: number;
};

const INTENT_PATTERNS: Record<Exclude<IntentName, 'general'>, IntentRule> = {
    food_search: {
        keywords: [
            'food',
            'foods',
            'eat',
            'eating',
            'ingredient',
            'ingredients',
            'produce',
            'fruit',
            'vegetable',
            'grocery',
            'superfood',
            'nutrient',
            'nutrition',
            'what should i eat',
            'what can i eat',
            'good for',
            'bad for',
            'avoid',
            'helps with',
            'rich in',
            'high in',
            'low in',
            'contains'
        ],
        weight: 1
    },
    recipe_search: {
        keywords: [
            'recipe',
            'recipes',
            'cook',
            'cooking',
            'make',
            'bake',
            'baking',
            'prepare',
            'meal prep',
            'how to make',
            'dish',
            'ingredients for',
            'instructions',
            'steps',
            'method',
            'quick meal',
            'easy meal',
            'dinner idea',
            'lunch idea',
            'breakfast idea'
        ],
        weight: 1
    },
    health_advice: {
        keywords: [
            'health',
            'condition',
            'symptom',
            'symptoms',
            'inflammation',
            'gut',
            'digestion',
            'energy',
            'fatigue',
            'immune',
            'immunity',
            'hormone',
            'blood sugar',
            'cholesterol',
            'blood pressure',
            'anxiety',
            'sleep',
            'skin',
            'weight',
            'lose weight',
            'gain weight',
            'detox',
            'cleanse',
            'healing',
            'remedy',
            'natural',
            'holistic',
            'what causes',
            'how does',
            'why do i',
            'should i',
            'is it safe'
        ],
        weight: 1
    },
    meal_suggestion: {
        keywords: [
            'meal',
            'meals',
            'dinner',
            'lunch',
            'breakfast',
            'snack',
            'restaurant',
            'place to eat',
            'where to eat',
            'what to eat tonight',
            'what to have',
            'craving',
            'suggest',
            'recommendation',
            'recommend',
            'options near',
            'nearby',
            'near me',
            'today',
            'tonight',
            'this week',
            'menu'
        ],
        weight: 1
    },
    research: {
        keywords: [
            'study',
            'research',
            'article',
            'paper',
            'evidence',
            'science',
            'scientifically',
            'proven',
            'according to',
            'published',
            'journal',
            'source',
            'link',
            'read',
            'found this',
            'what does research say',
            'what does science say'
        ],
        weight: 1
    },
    library_action: {
        keywords: [
            'save',
            'saved',
            'add to',
            'store',
            'my library',
            'my recipes',
            'my meals',
            'my foods',
            'my favourites',
            'my favorites',
            'my notes',
            'i saved',
            'i have saved',
            'show me my',
            'open my',
            'find in my',
            'from my library'
        ],
        weight: 1.5
    }
};

const TAG_INTENT_BOOSTS: Record<string, Array<{ intent: Exclude<IntentName, 'general'>; score: number }>> = {
    fresh: [
        { intent: 'food_search', score: 1.5 },
        { intent: 'meal_suggestion', score: 0.75 }
    ],
    cooked: [
        { intent: 'meal_suggestion', score: 1.5 }
    ],
    'meal prep': [
        { intent: 'recipe_search', score: 1.5 },
        { intent: 'meal_suggestion', score: 1 }
    ],
    receipes: [
        { intent: 'recipe_search', score: 2 }
    ],
    recipes: [
        { intent: 'recipe_search', score: 2 }
    ],
    advice: [
        { intent: 'health_advice', score: 1.75 }
    ]
};

const INTENT_PRIORITY: IntentName[] = [
    'library_action',
    'recipe_search',
    'meal_suggestion',
    'food_search',
    'health_advice',
    'research',
    'general'
];

const INTENT_GUIDANCE: Record<IntentName, string[]> = {
    food_search: [
        'Lead with concrete foods, ingredients, and nutrient fit for the user profile.',
        'Keep recipes secondary unless the user clearly asks for cooking instructions.'
    ],
    recipe_search: [
        'Answer with practical recipe guidance, including ingredients and concise steps when useful.',
        'Keep the recipe aligned with the user health profile and pantry context.'
    ],
    health_advice: [
        'Answer as nutrition and wellness guidance, not a diagnosis.',
        'Use the user profile to tailor food, habit, and safety guidance.'
    ],
    meal_suggestion: [
        'Prioritize what the user can eat or order now, especially nearby options if location is relevant.',
        'Keep recommendations practical, short, and easy to act on.'
    ],
    research: [
        'Focus on evidence quality, nuance, and what is supported versus uncertain.',
        'Prefer grounded summaries over overconfident claims.'
    ],
    library_action: [
        'Treat this as a library-oriented request.',
        'Never imply something was saved, opened, or modified unless the route actually performed that action.'
    ],
    general: [
        'Answer naturally and keep an eye out for mixed food, place, recipe, or health intent.'
    ]
};

function normalizeText(value: string) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function messageIncludesKeyword(message: string, keyword: string) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return false;

    if (normalizedKeyword.includes(' ')) {
        return message.includes(normalizedKeyword);
    }

    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`);
    return pattern.test(message);
}

function compareIntentEntries(a: [IntentName, number], b: [IntentName, number]) {
    if (b[1] !== a[1]) return b[1] - a[1];
    return INTENT_PRIORITY.indexOf(a[0]) - INTENT_PRIORITY.indexOf(b[0]);
}

export function classifyIntent(message: string, tags: string[] = []): IntentClassification {
    const normalizedMessage = normalizeText(message);
    const scores: Partial<Record<Exclude<IntentName, 'general'>, number>> = {};

    (Object.entries(INTENT_PATTERNS) as Array<[Exclude<IntentName, 'general'>, IntentRule]>).forEach(([intent, config]) => {
        let score = 0;

        config.keywords.forEach((keyword) => {
            if (!messageIncludesKeyword(normalizedMessage, keyword)) return;
            score += (keyword.includes(' ') ? 2 : 1) * config.weight;
        });

        if (score > 0) {
            scores[intent] = score;
        }
    });

    tags
        .map((tag) => normalizeText(tag))
        .forEach((tag) => {
            const boosts = TAG_INTENT_BOOSTS[tag] || [];
            boosts.forEach(({ intent, score }) => {
                scores[intent] = (scores[intent] || 0) + score;
            });
        });

    const ranked = (Object.entries(scores) as Array<[Exclude<IntentName, 'general'>, number]>)
        .sort(compareIntentEntries as (a: [Exclude<IntentName, 'general'>, number], b: [Exclude<IntentName, 'general'>, number]) => number);

    if (ranked.length === 0) {
        return {
            intent: 'general',
            confidence: 'low',
            mixed: null,
            scores
        };
    }

    const [topIntent, topScore] = ranked[0];
    const runnerUp = ranked[1] || null;
    const gap = runnerUp ? topScore - runnerUp[1] : topScore;
    const mixed = runnerUp && gap <= 1 ? runnerUp[0] : null;
    const confidence: IntentConfidence =
        topScore >= 4 && gap >= 1.5 ? 'high' : topScore >= 2 ? 'medium' : 'low';

    return {
        intent: topIntent,
        confidence,
        mixed,
        scores
    };
}

export function buildIntentSystemSection(classification: IntentClassification) {
    const guidance = INTENT_GUIDANCE[classification.intent] || INTENT_GUIDANCE.general;
    const lines = [
        '## CURRENT MESSAGE INTENT',
        `- Primary intent: ${classification.intent}`,
        `- Confidence: ${classification.confidence}`,
        classification.mixed ? `- Secondary intent signal: ${classification.mixed}` : '',
        ...guidance.map((rule) => `- ${rule}`)
    ].filter(Boolean);

    return lines.join('\n');
}
