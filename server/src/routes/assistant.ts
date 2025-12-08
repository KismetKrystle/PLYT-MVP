import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/message', (req: Request, res: Response) => {
    const { message, mode } = req.body;

    // Mock AI Logic
    // In real implementation, this would call OpenAI/Gemini API with context.

    setTimeout(() => {
        res.json({
            assistantMessage: `[AI Stub] You said: "${message}". I can help you with that in ${mode || 'eat'} mode!`,
            intent: 'general_chat',
            proposedItems: [],
            proposedSystems: []
        });
    }, 500); // Simulate network delay
});

export default router;
