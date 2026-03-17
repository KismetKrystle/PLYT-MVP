import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const VALID_ROLES = new Set(['consumer', 'farmer', 'expert', 'distributor', 'servicer']);

function buildUserResponse(user: any) {
    const profileData = user.profile_data || {};

    return {
        id: user.id,
        name: user.name ?? profileData.full_name ?? null,
        email: user.email,
        role: user.role,
        full_name: profileData.full_name ?? user.name ?? null,
        phone_number: profileData.phone_number ?? null,
        location_city: profileData.location_city ?? null,
        location_address: profileData.location_address ?? null,
        bio: profileData.bio ?? null,
        avatar_url: profileData.avatar_url ?? null,
        profile_data: profileData,
        created_at: user.created_at,
        updated_at: user.updated_at
    };
}

function extractConsumerProfileData(profileData: Record<string, unknown>) {
    const consumerProfile: Record<string, unknown> = {};
    const candidateKeys = [
        'health_areas',
        'health_conditions',
        'dietary_preferences',
        'allergies',
        'wellness_goals',
        'auto_meal_plan_enabled',
        'location',
        'notes',
        'health_documents'
    ];

    for (const key of candidateKeys) {
        if (key in profileData && profileData[key] !== undefined) {
            consumerProfile[key] = profileData[key];
        }
    }

    return consumerProfile;
}

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        const user = userResult.rows[0];
        res.json(buildUserResponse(user));
    } catch (error) {
        console.error('Get user error:', error);
        res.sendStatus(500);
    }
});

router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

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

        const mergedProfileData = {
            ...(full_name ? { full_name } : {}),
            ...rest,
            ...(profile_data && typeof profile_data === 'object' ? profile_data : {})
        };

        await client.query('BEGIN');

        const result = await client.query(
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
                JSON.stringify(mergedProfileData),
                userId
            ]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            res.sendStatus(404);
            return;
        }

        const shouldSyncConsumerProfile = nextRole === 'consumer';
        if (shouldSyncConsumerProfile) {
            const consumerProfileData = extractConsumerProfileData(mergedProfileData);
            if (Object.keys(consumerProfileData).length > 0) {
                await client.query(
                    `INSERT INTO consumer_profiles (user_id, profile_data)
                     VALUES ($1, $2::jsonb)
                     ON CONFLICT (user_id)
                     DO UPDATE SET profile_data = EXCLUDED.profile_data, updated_at = NOW()`,
                    [userId, JSON.stringify(consumerProfileData)]
                );
            }
        }

        await client.query('COMMIT');
        res.json(buildUserResponse(result.rows[0]));
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Ignore rollback failures after the original error.
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    } finally {
        client.release();
    }
});

export default router;
