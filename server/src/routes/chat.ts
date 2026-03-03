import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { SYSTEM_INSTRUCTION } from '../config/persona';
import { fetchRoleProfileData } from '../services/profileContext';

const router = express.Router();

function toGeminiRole(role: string): 'model' | 'user' {
    return role === 'assistant' ? 'model' : 'user';
}

async function generateWithFallbackModels(
    genAI: GoogleGenerativeAI,
    message: string,
    systemInstruction: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
) {
    const configuredModel = (process.env.GEMINI_MODEL || '').trim();
    const candidates = [
        configuredModel,
        'gemini-2.0-flash',
        'gemini-1.5-flash'
    ].filter(Boolean);

    const tried: string[] = [];
    let lastError: any = null;

    for (const modelName of candidates) {
        try {
            tried.push(modelName);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction
            });
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

router.post('/', authenticateToken, async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'AI Error', details: 'Gemini API key missing' });
        return;
    }

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
        const systemInstruction = `${SYSTEM_INSTRUCTION}

User role: ${userRole}
Role-specific profile_data JSON:
${JSON.stringify(profileData, null, 2)}

Use this profile_data directly for personalization.
Do not ask for details already provided in profile_data unless necessary for safety.`;

        await pool.query(
            `INSERT INTO chat_history (user_id, role, message)
             VALUES ($1, $2, $3)`,
            [userId, 'user', message]
        );

        const historyRes = await pool.query(
            `SELECT role, message
             FROM chat_history
             WHERE user_id = $1
             ORDER BY created_at ASC
             LIMIT 40`,
            [userId]
        );

        const rawHistory: Array<{ role: 'model' | 'user'; parts: Array<{ text: string }> }> = historyRes.rows.map((row: any) => ({
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
        while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
            cleanHistory.shift();
        }
        while (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role !== 'model') {
            cleanHistory.pop();
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const completion = await generateWithFallbackModels(genAI, message, systemInstruction, cleanHistory);
        const aiResponse = completion.text;

        await pool.query(
            `INSERT INTO chat_history (user_id, role, message)
             VALUES ($1, $2, $3)`,
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

router.get('/history', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const summary = await pool.query(
            `SELECT MIN(created_at) AS created_at, MAX(created_at) AS updated_at
             FROM chat_history
             WHERE user_id = $1`,
            [userId]
        );

        if (!summary.rows[0]?.created_at) {
            res.json([]);
            return;
        }

        res.json([
            {
                id: String(userId),
                title: 'Personalized Chat',
                created_at: summary.rows[0].created_at,
                updated_at: summary.rows[0].updated_at
            }
        ]);
    } catch (error) {
        console.error('History list error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

router.get('/history/:id', authenticateToken, async (req: Request, res: Response) => {
    const userId = String((req as any).user.id);
    const historyId = String(req.params.id);

    if (historyId !== userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const messages = await pool.query(
            `SELECT role, message AS content, created_at
             FROM chat_history
             WHERE user_id = $1
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
