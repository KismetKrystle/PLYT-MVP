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

// Update user profile (KYC)
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { full_name, phone_number, location_city, location_address, bio, role } = req.body;

        // Dynamic update query builder could be better, but fixed is fine for now
        // We'll update role too as this is the first time setting it properly
        const updateQuery = `
            UPDATE users 
            SET full_name = COALESCE($1, full_name),
                phone_number = COALESCE($2, phone_number),
                location_city = COALESCE($3, location_city),
                location_address = COALESCE($4, location_address),
                bio = COALESCE($5, bio),
                role = COALESCE($6, role)
            WHERE id = $7
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            full_name, phone_number, location_city, location_address, bio, role, userId
        ]);

        if (result.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
