import express, { Request, Response } from 'express';

const router = express.Router();

// Set global mode
router.post('/mode', (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode !== 'eat' && mode !== 'grow') {
        res.status(400).json({ error: 'Invalid mode. Must be "eat" or "grow"' });
        return;
    }
    // Logic to update session/user state could go here
    res.json({ message: `Mode set to ${mode}`, mode });
});

// Set grow sub-mode
router.post('/grow-mode', (req: Request, res: Response) => {
    const { growMode } = req.body;
    if (growMode !== 'learn' && growMode !== 'system') {
        res.status(400).json({ error: 'Invalid growMode. Must be "learn" or "system"' });
        return;
    }
    // Logic to update session/user state could go here
    res.json({ message: `Grow mode set to ${growMode}`, growMode });
});

export default router;
