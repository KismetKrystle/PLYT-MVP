import express, { Response } from 'express';
import type { PoolClient } from 'pg';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
    upsertPlaceProfileFromFavorite,
    removePlaceFavorite
} from '../services/placeProfiles';
import {
    ensureConversationRetentionColumns,
    markConversationSavedByUser,
    syncConversationSavedState
} from '../services/chatRetention';

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
        'full_name',
        'health_areas',
        'health_conditions',
        'dietary_preferences',
        'allergies',
        'wellness_goals',
        'auto_meal_plan_enabled',
        'location',
        'notes',
        'health_documents',
        'favorite_places',
        'favorite_chats'
    ];

    for (const key of candidateKeys) {
        if (key in profileData && profileData[key] !== undefined) {
            consumerProfile[key] = profileData[key];
        }
    }

    return consumerProfile;
}

async function syncUserProfileData(
    client: PoolClient,
    userId: string | number,
    role: string | null | undefined,
    profilePatch: Record<string, unknown>,
    nameOverride?: string | null
) {
    const existingResult = await client.query(
        `SELECT id, name, email, role, profile_data, created_at, updated_at
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );

    if (existingResult.rows.length === 0) {
        throw new Error('USER_NOT_FOUND');
    }

    const existingUser = existingResult.rows[0];
    const mergedProfileData = {
        ...(existingUser.profile_data || {}),
        ...profilePatch
    };

    const result = await client.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             role = COALESCE($2, role),
             profile_data = $3::jsonb,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, email, role, profile_data, created_at, updated_at`,
        [
            nameOverride ?? null,
            role ?? existingUser.role ?? null,
            JSON.stringify(mergedProfileData),
            userId
        ]
    );

    const nextRole = role ?? existingUser.role;
    if (nextRole === 'consumer') {
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

    return result.rows[0];
}

function normalizeFavoritePlace(place: any) {
    return {
        id: place?.id ? String(place.id) : null,
        name: place?.name ? String(place.name) : (place?.title ? String(place.title) : null),
        title: place?.title ? String(place.title) : undefined,
        address: place?.address ? String(place.address) : undefined,
        city: place?.city ? String(place.city) : undefined,
        location: place?.location ? String(place.location) : undefined,
        mapsUrl: place?.mapsUrl ? String(place.mapsUrl) : undefined,
        image: place?.image ? String(place.image) : undefined,
        notes: place?.notes ? String(place.notes) : undefined,
        rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating) : undefined,
        distance_km: Number.isFinite(Number(place?.distance_km)) ? Number(place.distance_km) : undefined,
        saved_at: new Date().toISOString()
    };
}

function placeIdentity(place: any) {
    return String(place?.id || place?.mapsUrl || `${place?.name || place?.title || ''}-${place?.address || place?.location || ''}`).trim();
}

function chatIdentity(chat: any) {
    return String(chat?.id || chat?.conversationId || '').trim();
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

        let updatedUser;
        try {
            updatedUser = await syncUserProfileData(
                client,
                userId as string | number,
                nextRole,
                mergedProfileData,
                name ?? full_name ?? null
            );
        } catch (error: any) {
            await client.query('ROLLBACK');
            if (error?.message === 'USER_NOT_FOUND') {
                res.sendStatus(404);
                return;
            }
            throw error;
        }

        await client.query('COMMIT');
        res.json(buildUserResponse(updatedUser));
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

router.get('/favorites', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userResult = await pool.query(
            `SELECT profile_data FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        const profileData = userResult.rows[0]?.profile_data || {};
        res.json({
            favorite_places: Array.isArray(profileData.favorite_places) ? profileData.favorite_places : [],
            favorite_chats: Array.isArray(profileData.favorite_chats) ? profileData.favorite_chats : []
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

router.post('/favorites/places', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'consumer';
        const { place } = req.body || {};

        if (!place || typeof place !== 'object' || Array.isArray(place)) {
            res.status(400).json({ error: 'place object is required' });
            return;
        }

        const normalizedPlace = normalizeFavoritePlace(place);
        const identity = placeIdentity(normalizedPlace);
        if (!identity || !normalizedPlace.name) {
            res.status(400).json({ error: 'place must include at least a stable id or name' });
            return;
        }

        await client.query('BEGIN');
        const existingResult = await client.query(
            `SELECT profile_data FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (existingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.sendStatus(404);
            return;
        }

        const profileData = existingResult.rows[0]?.profile_data || {};
        const currentPlaces = Array.isArray(profileData.favorite_places) ? profileData.favorite_places : [];
        const nextPlaces = [
            normalizedPlace,
            ...currentPlaces.filter((entry: any) => placeIdentity(entry) !== identity)
        ].slice(0, 50);

        const placeProfile = await upsertPlaceProfileFromFavorite(client, userId as string | number, {
            ...place,
            ...normalizedPlace
        });

        const updatedUser = await syncUserProfileData(client, userId as string | number, userRole, {
            favorite_places: nextPlaces
        });

        await client.query('COMMIT');
        res.json({
            favorite_places: Array.isArray(updatedUser.profile_data?.favorite_places)
                ? updatedUser.profile_data.favorite_places
                : [],
            place_profile: placeProfile
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Save favorite place error:', error);
        res.status(500).json({ error: 'Failed to save favorite place' });
    } finally {
        client.release();
    }
});

router.delete('/favorites/places', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'consumer';
        const { placeId, mapsUrl, name } = req.body || {};
        const targetIdentity = String(placeId || mapsUrl || name || '').trim();

        if (!targetIdentity) {
            res.status(400).json({ error: 'placeId, mapsUrl, or name is required' });
            return;
        }

        await client.query('BEGIN');
        const existingResult = await client.query(
            `SELECT profile_data FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (existingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.sendStatus(404);
            return;
        }

        const profileData = existingResult.rows[0]?.profile_data || {};
        const currentPlaces = Array.isArray(profileData.favorite_places) ? profileData.favorite_places : [];
        const nextPlaces = currentPlaces.filter((entry: any) => placeIdentity(entry) !== targetIdentity);

        const placeProfile = await removePlaceFavorite(client, userId as string | number, targetIdentity);

        const updatedUser = await syncUserProfileData(client, userId as string | number, userRole, {
            favorite_places: nextPlaces
        });

        await client.query('COMMIT');
        res.json({
            favorite_places: Array.isArray(updatedUser.profile_data?.favorite_places)
                ? updatedUser.profile_data.favorite_places
                : [],
            place_profile: placeProfile
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Remove favorite place error:', error);
        res.status(500).json({ error: 'Failed to remove favorite place' });
    } finally {
        client.release();
    }
});

router.post('/favorites/chats', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'consumer';
        const { conversationId, title } = req.body || {};
        const normalizedConversationId = String(conversationId || '').trim();

        if (!normalizedConversationId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        const conversationResult = await client.query(
            `SELECT id, title, updated_at
             FROM conversations
             WHERE id = $1 AND user_id = $2
             LIMIT 1`,
            [normalizedConversationId, userId]
        );

        if (conversationResult.rows.length === 0) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const conversation = conversationResult.rows[0];
        const favoriteChat = {
            id: String(conversation.id),
            title: String(title || conversation.title || 'Saved Chat'),
            updated_at: conversation.updated_at,
            saved_at: new Date().toISOString()
        };

        await client.query('BEGIN');
        await ensureConversationRetentionColumns(client);
        const existingResult = await client.query(
            `SELECT profile_data FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (existingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.sendStatus(404);
            return;
        }

        const profileData = existingResult.rows[0]?.profile_data || {};
        const currentChats = Array.isArray(profileData.favorite_chats) ? profileData.favorite_chats : [];
        const nextChats = [
            favoriteChat,
            ...currentChats.filter((entry: any) => chatIdentity(entry) !== favoriteChat.id)
        ].slice(0, 50);

        const updatedUser = await syncUserProfileData(client, userId as string | number, userRole, {
            favorite_chats: nextChats
        });
        await markConversationSavedByUser(client, userId as string | number, favoriteChat.id, true);

        await client.query('COMMIT');
        res.json({
            favorite_chats: Array.isArray(updatedUser.profile_data?.favorite_chats)
                ? updatedUser.profile_data.favorite_chats
                : []
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Save favorite chat error:', error);
        res.status(500).json({ error: 'Failed to save favorite chat' });
    } finally {
        client.release();
    }
});

router.delete('/favorites/chats/:conversationId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const userId = req.user?.id;
        const userRole = req.user?.role || 'consumer';
        const normalizedConversationId = String(req.params.conversationId || '').trim();

        if (!normalizedConversationId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        await client.query('BEGIN');
        await ensureConversationRetentionColumns(client);
        const existingResult = await client.query(
            `SELECT profile_data FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );

        if (existingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.sendStatus(404);
            return;
        }

        const profileData = existingResult.rows[0]?.profile_data || {};
        const currentChats = Array.isArray(profileData.favorite_chats) ? profileData.favorite_chats : [];
        const nextChats = currentChats.filter((entry: any) => chatIdentity(entry) !== normalizedConversationId);

        const updatedUser = await syncUserProfileData(client, userId as string | number, userRole, {
            favorite_chats: nextChats
        });
        await syncConversationSavedState(
            client,
            userId as string | number,
            normalizedConversationId,
            updatedUser.profile_data
        );

        await client.query('COMMIT');
        res.json({
            favorite_chats: Array.isArray(updatedUser.profile_data?.favorite_chats)
                ? updatedUser.profile_data.favorite_chats
                : []
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Remove favorite chat error:', error);
        res.status(500).json({ error: 'Failed to remove favorite chat' });
    } finally {
        client.release();
    }
});

export default router;
