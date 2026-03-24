import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

function normalizeConsumerLocation(profileData: Record<string, any>) {
    const rawLocation = profileData?.location;

    if (rawLocation && typeof rawLocation === 'object' && !Array.isArray(rawLocation)) {
        return {
            city: String(rawLocation.city || profileData.location_city || '').trim(),
            address: String(rawLocation.address || profileData.location_address || '').trim()
        };
    }

    const stringLocation = typeof rawLocation === 'string' ? rawLocation.trim() : '';
    return {
        city: String(profileData.location_city || '').trim(),
        address: String(profileData.location_address || stringLocation).trim()
    };
}

async function syncConsumerProfileToUser(userId: string | number, profileData: Record<string, any>) {
    const existingUser = await pool.query(
        `SELECT profile_data
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );

    if (existingUser.rows.length === 0) {
        return;
    }

    const currentProfile = existingUser.rows[0]?.profile_data || {};
    const normalizedLocation = normalizeConsumerLocation(profileData);
    const nextProfile = {
        ...currentProfile,
        ...profileData,
        location: {
            city: normalizedLocation.city,
            address: normalizedLocation.address
        },
        location_city: normalizedLocation.city || currentProfile.location_city || '',
        location_address: normalizedLocation.address || currentProfile.location_address || ''
    };

    await pool.query(
        `UPDATE users
         SET profile_data = $2::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [userId, JSON.stringify(nextProfile)]
    );
}

export async function getProfileByUserId(
    table: 'consumer_profiles' | 'farmer_profiles' | 'expert_profiles',
    userId: string | number
) {
    const result = await pool.query(
        `SELECT id, user_id, profile_data, created_at, updated_at
         FROM ${table}
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

export function canAccess(requesterId: string | number, requesterRole: string | undefined, targetUserId: string | number) {
    return requesterRole === 'expert' || String(requesterId) === String(targetUserId);
}

export async function createProfile(
    req: AuthRequest,
    res: Response,
    table: 'consumer_profiles' | 'farmer_profiles' | 'expert_profiles'
) {
    const { user_id, profile_data } = req.body || {};
    if (!user_id || !profile_data || typeof profile_data !== 'object' || Array.isArray(profile_data)) {
        res.status(400).json({ error: 'user_id and object profile_data are required' });
        return;
    }

    if (!canAccess(req.user?.id as string | number, req.user?.role, user_id)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    try {
        const created = await pool.query(
            `INSERT INTO ${table} (user_id, profile_data)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (user_id)
             DO UPDATE SET profile_data = EXCLUDED.profile_data, updated_at = NOW()
             RETURNING id, user_id, profile_data, created_at, updated_at`,
            [user_id, JSON.stringify(profile_data)]
        );

        if (table === 'consumer_profiles') {
            await syncConsumerProfileToUser(user_id, profile_data as Record<string, any>);
        }

        res.status(201).json(created.rows[0]);
    } catch (error) {
        console.error(`Create ${table} error:`, error);
        res.status(500).json({ error: `Failed to create ${table}` });
    }
}

export async function getProfile(req: AuthRequest, res: Response, table: 'consumer_profiles' | 'farmer_profiles' | 'expert_profiles') {
    const targetUserId = req.params.userId;
    if (!canAccess(req.user?.id as string | number, req.user?.role, targetUserId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    try {
        const profile = await getProfileByUserId(table, targetUserId);
        if (!profile) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        res.json(profile);
    } catch (error) {
        console.error(`Get ${table} error:`, error);
        res.status(500).json({ error: `Failed to fetch ${table}` });
    }
}

export async function updateProfile(
    req: AuthRequest,
    res: Response,
    table: 'consumer_profiles' | 'farmer_profiles' | 'expert_profiles'
) {
    const targetUserId = req.params.userId;
    if (!canAccess(req.user?.id as string | number, req.user?.role, targetUserId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    const { profile_data } = req.body || {};
    if (!profile_data || typeof profile_data !== 'object' || Array.isArray(profile_data)) {
        res.status(400).json({ error: 'object profile_data is required' });
        return;
    }

    try {
        const updated = await pool.query(
            `UPDATE ${table}
             SET profile_data = $1::jsonb,
                 updated_at = NOW()
             WHERE user_id = $2
             RETURNING id, user_id, profile_data, created_at, updated_at`,
            [JSON.stringify(profile_data), targetUserId]
        );

        if (updated.rows.length === 0) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        if (table === 'consumer_profiles') {
            await syncConsumerProfileToUser(targetUserId, profile_data as Record<string, any>);
        }

        res.json(updated.rows[0]);
    } catch (error) {
        console.error(`Update ${table} error:`, error);
        res.status(500).json({ error: `Failed to update ${table}` });
    }
}

export async function deleteProfile(
    req: AuthRequest,
    res: Response,
    table: 'consumer_profiles' | 'farmer_profiles' | 'expert_profiles'
) {
    const targetUserId = req.params.userId;
    if (!canAccess(req.user?.id as string | number, req.user?.role, targetUserId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    try {
        const deleted = await pool.query(
            `DELETE FROM ${table}
             WHERE user_id = $1
             RETURNING id`,
            [targetUserId]
        );

        if (deleted.rows.length === 0) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error(`Delete ${table} error:`, error);
        res.status(500).json({ error: `Failed to delete ${table}` });
    }
}

