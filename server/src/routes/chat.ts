import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { SYSTEM_INSTRUCTION } from '../config/persona';
import { fetchRoleProfileData } from '../services/profileContext';

const router = express.Router();

function toGeminiRole(role: string): 'model' | 'user' {
    return role === 'assistant' ? 'model' : 'user';
}

// ─── Health condition guidance injected into system prompt ───────────────────
function buildHealthContext(profileData: any): string {
    const conditions: string[] = profileData?.health_conditions || [];
    const allergies: string[] = profileData?.allergies || [];
    const preferences: string[] = profileData?.dietary_preferences || [];

    if (!conditions.length && !allergies.length && !preferences.length) return '';

    const conditionGuidance: Record<string, string> = {
        fibroids: `
FIBROIDS PROTOCOL:
- Recommend: Cruciferous vegetables (broccoli, cauliflower, kale), flaxseed, leafy greens, turmeric, green tea, omega-3 rich foods (walnuts, chia seeds)
- Avoid recommending: Processed foods, excess red meat, alcohol, conventional dairy, high-estrogen foods, soy in excess
- Tone: Warm and encouraging — this is a real daily struggle. Celebrate small wins.
- Always mention: Fiber-rich foods help the body eliminate excess estrogen`,

        no_gallbladder: `
NO GALLBLADDER PROTOCOL:
- Recommend: Low-fat meals, smaller portions throughout the day, easily digestible foods, steamed vegetables, lean proteins
- Avoid recommending: High-fat foods, fried foods, large heavy meals, excess oils even healthy ones
- Note: Without a gallbladder bile drips constantly so fat digestion is impaired`,

        diabetes: `
DIABETES PROTOCOL:
- Recommend: Low-glycemic vegetables, high-fiber foods, raw nuts and seeds, leafy greens, berries, avocado, cucumbers
- Avoid recommending: Refined sugar, white rice, white bread, high-GI fruits like watermelon in excess
- Always mention: Raw foods reduce blood sugar spikes due to fiber and enzyme content`,

        high_blood_pressure: `
HIGH BLOOD PRESSURE PROTOCOL:
- Recommend: Potassium-rich foods (bananas, leafy greens, avocado), celery, beets, watermelon, low-sodium options
- Avoid recommending: High-sodium foods, processed snacks`,

        digestive_issues: `
DIGESTIVE ISSUES PROTOCOL:
- Recommend: Enzyme-rich raw foods, papaya, pineapple, fermented foods (kimchi, sauerkraut), sprouted seeds
- Note: Suggest starting slow with raw foods to allow gut adjustment`,
    };

    let healthSection = `
## ACTIVE HEALTH CONTEXT — CRITICAL: READ BEFORE RESPONDING

This user has specific health conditions. Every food recommendation MUST account for these.`;

    if (conditions.length) {
        healthSection += `\n\nHealth conditions: ${conditions.join(', ')}`;
        conditions.forEach(c => {
            const key = c.toLowerCase().replace(/\s+/g, '_');
            if (conditionGuidance[key]) {
                healthSection += `\n${conditionGuidance[key]}`;
            }
        });
    }

    if (allergies.length) {
        healthSection += `\n\n⚠️ ALLERGIES — NEVER recommend foods containing: ${allergies.join(', ')}`;
        healthSection += `\nCheck every single recommendation against this list before responding.`;
    }

    if (preferences.length) {
        healthSection += `\n\nDietary preferences: ${preferences.join(', ')} — respect these in all suggestions.`;
    }

    healthSection += `\n\n ALWAYS:
- Explain WHY a food helps their specific condition (not just what to eat)
- Suggest where to find or how to source the food locally
- Be warm and encouraging — managing health through food is hard and deserves support
- Add a brief disclaimer: "This is general nutritional guidance. Please consult your healthcare provider for personalized medical advice."

RESPONSE STYLE:
- Be conversational and warm, not clinical
- Keep responses concise — 3 to 5 short paragraphs max
- Lead with the direct answer first
- Use bullet points sparingly, only when listing 4 or more items
- Feel like a knowledgeable friend, not a medical report`;

    return healthSection;
}

function buildLocationLinkRule(profileData: any, requestLocation?: string): string {
    // Priority: 1. Live/custom location from frontend, 2. Profile city, 3. Ask user
    const loc = profileData?.location || {};
    const profileCity = String(loc.city || '').trim();
    const profileRegion = String(loc.address || '').trim();
    const profileLocation = [profileCity, profileRegion].filter(Boolean).join(', ');

    const activeLocation = requestLocation?.trim() || profileLocation;

    return `
## LOCAL PLACE LINK RULE
- When you recommend any place (market, grocery, farm, clinic, restaurant, co-op, food bank), include a Google Maps link immediately after the place name.
- Use this format: https://www.google.com/maps/search/?api=1&query=<PLACE+CITY+REGION>
- Always include city/region in the query for accuracy.
${activeLocation
    ? `- User is currently near: ${activeLocation}. Prioritize recommendations in this area.`
    : `- Location unknown. Ask one short follow-up question for city before listing places.`
}`;
}

// ─── Fallback model logic (unchanged from your original) ─────────────────────
async function generateWithFallbackModels(
    genAI: GoogleGenerativeAI,
    message: string,
    systemInstruction: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
) {
    const configuredModel = (process.env.GEMINI_MODEL || '').trim();
    const candidates = Array.from(new Set([
        configuredModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash-lite',
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
            continue;
        }
    }

    const err = new Error(lastError?.message || 'Failed to generate AI response');
    (err as any).triedModels = tried;
    throw err;
}

async function fetchGooglePlace(query: string) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return null;

    const textSearch = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query, key }
    });
    const first = textSearch.data?.results?.[0];
    if (!first?.place_id) return null;

    const details = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
            place_id: first.place_id,
            fields: 'name,formatted_address,formatted_phone_number,rating,user_ratings_total,website,photos,url',
            key
        }
    });
    const d = details.data?.result || {};
    const photoRef = d?.photos?.[0]?.photo_reference;
    const image = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${encodeURIComponent(photoRef)}&key=${encodeURIComponent(key)}`
        : null;

    return {
        name: d.name || first.name || query,
        address: d.formatted_address || first.formatted_address || '',
        phone: d.formatted_phone_number || '',
        rating: typeof d.rating === 'number' ? d.rating : (typeof first.rating === 'number' ? first.rating : null),
        reviewsCount: Number.isFinite(d.user_ratings_total) ? d.user_ratings_total : (first.user_ratings_total || 0),
        website: d.website || '',
        mapsUrl: d.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
        image
    };
}

// ─── Main chat route ──────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'AI Error', details: 'Gemini API key missing' });
        return;
    }

    const { message, location } = req.body || {};
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
            // Do not fail chat when profile context lookup fails.
            console.warn('Profile context lookup failed, continuing without profile context:', profileErr);
            profileData = {};
        }

        // Build full system instruction with health context injected
        const healthContext = buildHealthContext(profileData);
        const locationLinkRule = buildLocationLinkRule(profileData, location);
        const systemInstruction = `${SYSTEM_INSTRUCTION}

${healthContext}
${locationLinkRule}

## CURRENT USER PROFILE
User role: ${userRole}
Full profile data:
${JSON.stringify(profileData, null, 2)}

Use this profile directly for personalization. Do not ask for details already provided.`;

        // Save user message
        await pool.query(
            `INSERT INTO chat_history (user_id, role, message) VALUES ($1, $2, $3)`,
            [userId, 'user', message]
        );

        // Fetch history
        const historyRes = await pool.query(
            `SELECT role, message FROM chat_history
             WHERE user_id = $1
             ORDER BY created_at ASC
             LIMIT 40`,
            [userId]
        );

        // Build and clean Gemini history (same logic as your original)
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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, message, systemInstruction, cleanHistory);
        const aiResponse = completion.text;

        // Save assistant response
        await pool.query(
            `INSERT INTO chat_history (user_id, role, message) VALUES ($1, $2, $3)`,
            [userId, 'assistant', aiResponse]
        );

        res.json({
            response: aiResponse,
            conversationId: String(userId),
            model: completion.modelName
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

router.post('/places', authenticateToken, async (req: Request, res: Response) => {
    const { queries } = req.body || {};
    if (!Array.isArray(queries) || queries.length === 0) {
        res.status(400).json({ error: 'queries array is required' });
        return;
    }

    try {
        const uniqueQueries = Array.from(new Set(
            queries
                .map((q: any) => String(q || '').trim())
                .filter(Boolean)
        )).slice(0, 6);

        const keyConfigured = Boolean(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
        const enriched = await Promise.all(
            uniqueQueries.map(async (query) => {
                try {
                    const place = await fetchGooglePlace(query);
                    if (place) return place;
                } catch {
                    // fallback below
                }
                return {
                    name: query.split(',')[0]?.trim() || query,
                    address: query,
                    phone: '',
                    rating: null,
                    reviewsCount: 0,
                    website: '',
                    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                    image: null
                };
            })
        );

        res.json({ places: enriched, enriched: keyConfigured });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch places', details: error.message });
    }
});

// ─── History routes (unchanged) ──────────────────────────────────────────────
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const summary = await pool.query(
            `SELECT MIN(created_at) AS created_at, MAX(created_at) AS updated_at
             FROM chat_history WHERE user_id = $1`,
            [userId]
        );

        if (!summary.rows[0]?.created_at) { res.json([]); return; }

        res.json([{
            id: String(userId),
            title: 'My Health & Food Chat',
            created_at: summary.rows[0].created_at,
            updated_at: summary.rows[0].updated_at
        }]);
    } catch (error) {
        console.error('History list error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

router.get('/history/:id', authenticateToken, async (req: Request, res: Response) => {
    const userId = String((req as any).user.id);
    const historyId = String(req.params.id);

    if (historyId !== userId) { res.status(403).json({ error: 'Unauthorized' }); return; }

    try {
        const messages = await pool.query(
            `SELECT role, message AS content, created_at
             FROM chat_history WHERE user_id = $1
             ORDER BY created_at ASC`,
            [userId]
        );
        res.json(messages.rows);
    } catch (error) {
        console.error('History detail error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
