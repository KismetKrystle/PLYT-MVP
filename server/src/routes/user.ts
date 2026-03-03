import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const VALID_ROLES = new Set(['consumer', 'farmer', 'expert', 'distributor', 'servicer']);

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        const user = userResult.rows[0];
        const profileData = user.profile_data || {};

        res.json({
            id: user.id,
            name: user.name ?? profileData.full_name ?? null,
            email: user.email,
            role: user.role,
            profile_data: profileData,
            created_at: user.created_at,
            updated_at: user.updated_at
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.sendStatus(500);
    }
});

router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const {
            name,
            full_name,
            role,
            profile_data,
            ...rest
        } = req.body || {};

        const nextRole = role ?? req.user?.role;
        if (nextRole && !VALID_ROLES.has(nextRole)) {
            res.status(400).json({ error: 'Invalid role. Expected consumer, farmer, or expert.' });
            return;
        }

        const result = await pool.query(
            `UPDATE users
             SET name = COALESCE($1, name),
                 role = COALESCE($2, role),
                 profile_data = COALESCE(profile_data, '{}'::jsonb) || $3::jsonb,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING id, name, email, role, profile_data, created_at, updated_at`,
            [
                name ?? full_name ?? null,
                nextRole ?? null,
                JSON.stringify({
                    ...(full_name ? { full_name } : {}),
                    ...rest,
                    ...(profile_data && typeof profile_data === 'object' ? profile_data : {})
                }),
                userId
            ]
        );

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
