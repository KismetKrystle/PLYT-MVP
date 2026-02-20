import express, { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../db';
import { authenticateToken } from '../middleware/auth';
import { SYSTEM_INSTRUCTION } from '../config/persona';

const router = express.Router();

/**
 * POST /chat
 * Gemini Implementation with History and Persona
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    if (!process.env.GEMINI_API_KEY) {
        console.error('ERROR: GEMINI_API_KEY is not defined in .env');
        return res.status(500).json({ error: 'AI Error', details: 'Gemini API Key is missing on the server.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { message, conversationId, scope, location } = req.body;
    const userId = (req as any).user.id;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        console.log('--- Chat Request ---');
        console.log('User ID:', userId);
        console.log('Scope:', scope);
        console.log('Location:', location);
        console.log('Message:', message);

        let currentConvId = conversationId;

        // 1. Create a new conversation if one doesn't exist
        if (!currentConvId) {
            const convRes = await pool.query(
                'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id',
                [userId, message.substring(0, 50)]
            );
            currentConvId = convRes.rows[0].id;
        }

        // 2. Save user message to DB
        await pool.query(
            'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
            [currentConvId, 'user', message]
        );

        // 3. Fetch History for Context
        const historyRes = await pool.query(
            'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 15',
            [currentConvId]
        );

        // Gemini requires alternating roles (user/model) and starting with user.
        const rawHistory = historyRes.rows.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const cleanHistory: any[] = [];
        let lastRole: string | null = null;

        // Gemini expects history to strictly alternate: user -> model -> user -> model
        // And it expects the NEXT message (sendMessage) to be the opposite of the last history role.
        // Since sendMessage is ALWAYS 'user', the last message in history MUST be 'model'.
        for (const msg of rawHistory.slice(0, -1)) {
            if (msg.role !== lastRole) {
                cleanHistory.push(msg);
                lastRole = msg.role;
            } else {
                // If consecutive same roles, keep the latest one (overwrite previous)
                cleanHistory[cleanHistory.length - 1] = msg;
            }
        }

        // 1. Ensure history starts with 'user'
        while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
            cleanHistory.shift();
        }

        // 2. Ensure history ends with 'model' (so next sendMessage 'user' is valid)
        while (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role !== 'model') {
            cleanHistory.pop();
        }

        console.log(`Cleaned history to ${cleanHistory.length} messages.`);

        // 4. Simplified Chat Logic
        const getGeminiResponse = async () => {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: SYSTEM_INSTRUCTION
            });

            const chatSession = model.startChat({
                history: cleanHistory,
            });

            // Just send the raw message, let the system prompt handle context or ask for it
            const result = await chatSession.sendMessage(message);
            return result.response.text();
        };

        let aiResponse: string;
        try {
            console.log('Attempting Gemini chat...');
            aiResponse = await getGeminiResponse();
        } catch (error: any) {
            console.error('Gemini Chat Error:', error.message || error);
            throw error;
        }

        // 6. Save AI Response to DB
        await pool.query(
            'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
            [currentConvId, 'assistant', aiResponse]
        );

        res.json({
            response: aiResponse,
            conversationId: currentConvId
        });

    } catch (error: any) {
        console.error('FINAL Gemini Chat Error:', error);
        res.status(500).json({
            error: 'Failed to process chat',
            details: error.message,
            status: error.status
        });
    }
});

/**
 * GET /chat/history
 * Fetch list of conversations for the user
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const convs = await pool.query(
            'SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(convs.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * GET /chat/history/:id
 * Fetch messages for a specific conversation
 */
router.get('/history/:id', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const convId = req.params.id;

    try {
        // Verify ownership
        const conv = await pool.query('SELECT user_id FROM conversations WHERE id = $1', [convId]);
        if (conv.rows.length === 0 || conv.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const messages = await pool.query(
            'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
            [convId]
        );
        res.json(messages.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export default router;
