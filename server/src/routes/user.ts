import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userResult = await pool.query(
            'SELECT id, email, role, wallet_address, plyt_balance, staked_balance FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.json(userResult.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.sendStatus(500);
    }
});

export default router;
