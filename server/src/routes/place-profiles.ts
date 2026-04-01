import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
    ensurePlaceProfileSchema,
    createUserPlaceVisit,
    deleteUserPlaceVisit,
    getPlaceProfileByExternalId,
    getPlaceProfileById,
    listManagedPlaceProfiles,
    listPlaceFeedback,
    listUserPlaceVisits,
    normalizeManagedPlaceKind,
    updateUserPlaceVisit
} from '../services/placeProfiles';

const router = express.Router();

function isAdmin(req: AuthRequest) {
    return req.user?.role === 'admin';
}

function canManagePlaces(req: AuthRequest) {
    return ['admin', 'farmer', 'distributor'].includes(String(req.user?.role || '').trim());
}

router.get('/manage/mine', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!canManagePlaces(req)) {
        res.status(403).json({ error: 'Farmer or distributor access required' });
        return;
    }

    try {
        const rows = await listManagedPlaceProfiles(req.user?.id as string | number);
        res.json(rows);
    } catch (error) {
        console.error('List managed place profiles error:', error);
        res.status(500).json({ error: 'Failed to fetch managed place profiles' });
    }
});

router.post('/manage', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!canManagePlaces(req)) {
        res.status(403).json({ error: 'Farmer or distributor access required' });
        return;
    }

    try {
        const userId = req.user?.id as string | number;
        const {
            placeProfileId,
            name,
            place_kind,
            address,
            website,
            mapsUrl,
            phone,
            menu_context,
            menu_sources,
            raw_inventory_context,
            raw_inventory_items
        } = req.body || {};

        const trimmedName = String(name || '').trim();
        const trimmedAddress = String(address || '').trim();

        if (!trimmedName) {
            res.status(400).json({ error: 'Place name is required' });
            return;
        }

        await ensurePlaceProfileSchema();

        const normalizedKind = normalizeManagedPlaceKind(place_kind);
        const normalizedSources = Array.isArray(menu_sources)
            ? menu_sources
                .filter((source) => source && typeof source === 'object')
                .map((source) => ({
                    id: String(source.id || '').trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    name: String(source.name || '').trim(),
                    type: String(source.type || 'text/plain').trim(),
                    excerpt: String(source.excerpt || '').trim()
                }))
                .filter((source) => source.name || source.excerpt)
            : [];
        const normalizedInventoryItems = Array.isArray(raw_inventory_items)
            ? raw_inventory_items
                .filter((item) => item && typeof item === 'object')
                .map((item, index) => ({
                    id: String(item.id || '').trim() || `inventory-${Date.now()}-${index}`,
                    name: String(item.name || '').trim(),
                    detail: String(item.detail || '').trim()
                }))
                .filter((item) => item.name || item.detail)
            : [];

        if (placeProfileId) {
            const existing = await pool.query(
                `SELECT *
                 FROM place_profiles
                 WHERE id = $1
                 LIMIT 1`,
                [placeProfileId]
            );

            const row = existing.rows[0];
            if (!row) {
                res.status(404).json({ error: 'Place profile not found' });
                return;
            }

            if (!isAdmin(req) && String(row.owner_user_id || row.created_by_user_id || '') !== String(userId)) {
                res.status(403).json({ error: 'You do not manage this place profile' });
                return;
            }
        }

        const externalPlaceId = String(placeProfileId || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const result = await pool.query(
            `INSERT INTO place_profiles (
                id,
                external_source,
                external_place_id,
                name,
                place_kind,
                network_status,
                owner_user_id,
                created_by_user_id,
                claimed_at,
                profile_data,
                updated_at
            )
             VALUES (
                COALESCE($1::uuid, gen_random_uuid()),
                'plyt_manual',
                $2,
                $3,
                $4,
                'on_network',
                $5,
                $5,
                NOW(),
                $6::jsonb,
                NOW()
             )
             ON CONFLICT (id)
             DO UPDATE SET
                name = EXCLUDED.name,
                place_kind = EXCLUDED.place_kind,
                network_status = 'on_network',
                owner_user_id = EXCLUDED.owner_user_id,
                claimed_at = COALESCE(place_profiles.claimed_at, NOW()),
                profile_data = COALESCE(place_profiles.profile_data, '{}'::jsonb) || EXCLUDED.profile_data,
                updated_at = NOW()
             RETURNING *`,
            [
                placeProfileId || null,
                externalPlaceId,
                trimmedName,
                normalizedKind,
                userId,
                JSON.stringify({
                    address: trimmedAddress,
                    website: String(website || '').trim(),
                    mapsUrl: String(mapsUrl || '').trim(),
                    phone: String(phone || '').trim(),
                    menu_context: String(menu_context || '').trim(),
                    menu_sources: normalizedSources,
                    raw_inventory_context: String(raw_inventory_context || '').trim(),
                    raw_inventory_items: normalizedInventoryItems,
                    place_type: normalizedKind,
                    is_on_network: true
                })
            ]
        );

        res.status(placeProfileId ? 200 : 201).json(result.rows[0]);
    } catch (error) {
        console.error('Manage place profile save error:', error);
        res.status(500).json({ error: 'Failed to save managed place profile' });
    }
});

router.get('/external/:externalPlaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await getPlaceProfileByExternalId(String(req.params.externalPlaceId || '').trim());
        if (!profile) {
            res.status(404).json({ error: 'Place profile not found' });
            return;
        }

        const feedback = await listPlaceFeedback(String(profile.id));
        res.json({ ...profile, feedback });
    } catch (error) {
        console.error('Get place profile by external id error:', error);
        res.status(500).json({ error: 'Failed to fetch place profile' });
    }
});

router.get('/:placeProfileId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await getPlaceProfileById(String(req.params.placeProfileId || '').trim());
        if (!profile) {
            res.status(404).json({ error: 'Place profile not found' });
            return;
        }

        const feedback = await listPlaceFeedback(String(profile.id));
        res.json({ ...profile, feedback });
    } catch (error) {
        console.error('Get place profile error:', error);
        res.status(500).json({ error: 'Failed to fetch place profile' });
    }
});

router.post('/:placeProfileId/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const placeProfileId = String(req.params.placeProfileId || '').trim();
        const userId = req.user?.id;
        const {
            rating,
            feedback,
            body_response,
            tasted_well,
            would_repeat,
            keep_as_favorite,
            profile_data
        } = req.body || {};

        if (!placeProfileId) {
            res.status(400).json({ error: 'placeProfileId is required' });
            return;
        }

        await ensurePlaceProfileSchema(client);

        const profileExists = await client.query(
            `SELECT id FROM place_profiles WHERE id = $1 LIMIT 1`,
            [placeProfileId]
        );

        if (profileExists.rows.length === 0) {
            res.status(404).json({ error: 'Place profile not found' });
            return;
        }

        await client.query(
            `INSERT INTO place_profile_feedback (
                place_profile_id,
                user_id,
                rating,
                feedback,
                body_response,
                tasted_well,
                would_repeat,
                keep_as_favorite,
                profile_data,
                updated_at
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
             ON CONFLICT (place_profile_id, user_id)
             DO UPDATE SET
                rating = EXCLUDED.rating,
                feedback = EXCLUDED.feedback,
                body_response = EXCLUDED.body_response,
                tasted_well = EXCLUDED.tasted_well,
                would_repeat = EXCLUDED.would_repeat,
                keep_as_favorite = EXCLUDED.keep_as_favorite,
                profile_data = EXCLUDED.profile_data,
                updated_at = NOW()`,
            [
                placeProfileId,
                userId,
                Number.isFinite(Number(rating)) ? Number(rating) : null,
                typeof feedback === 'string' ? feedback : null,
                typeof body_response === 'string' ? body_response : null,
                typeof tasted_well === 'boolean' ? tasted_well : null,
                typeof would_repeat === 'boolean' ? would_repeat : null,
                typeof keep_as_favorite === 'boolean' ? keep_as_favorite : null,
                JSON.stringify(profile_data && typeof profile_data === 'object' ? profile_data : {})
            ]
        );

        const aggregateRes = await client.query(
            `SELECT
                COUNT(*)::int AS feedback_count,
                COALESCE(AVG(rating), 0)::numeric(4,2) AS average_rating
             FROM place_profile_feedback
             WHERE place_profile_id = $1`,
            [placeProfileId]
        );

        const aggregates = aggregateRes.rows[0] || { feedback_count: 0, average_rating: 0 };

        await client.query(
            `UPDATE place_profiles
             SET feedback_count = $1,
                 average_rating = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [aggregates.feedback_count || 0, Number(aggregates.average_rating || 0), placeProfileId]
        );

        const profile = await getPlaceProfileById(placeProfileId);
        const allFeedback = await listPlaceFeedback(placeProfileId);
        res.json({ ...profile, feedback: allFeedback });
    } catch (error) {
        console.error('Save place feedback error:', error);
        res.status(500).json({ error: 'Failed to save place feedback' });
    } finally {
        client.release();
    }
});

router.get('/:placeProfileId/visits/mine', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const placeProfileId = String(req.params.placeProfileId || '').trim();
        const userId = req.user?.id;

        if (!placeProfileId) {
            res.status(400).json({ error: 'placeProfileId is required' });
            return;
        }

        const visits = await listUserPlaceVisits(placeProfileId, userId as string | number);
        res.json({ visits });
    } catch (error) {
        console.error('List user place visits error:', error);
        res.status(500).json({ error: 'Failed to fetch place visits' });
    }
});

router.post('/:placeProfileId/visits', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const placeProfileId = String(req.params.placeProfileId || '').trim();
        const userId = req.user?.id;
        const { visit } = req.body || {};

        if (!placeProfileId) {
            res.status(400).json({ error: 'placeProfileId is required' });
            return;
        }

        await client.query('BEGIN');
        const createdVisit = await createUserPlaceVisit(client, placeProfileId, userId as string | number, visit || {});
        const visits = await listUserPlaceVisits(placeProfileId, userId as string | number, client);
        await client.query('COMMIT');

        res.status(201).json({ visit: createdVisit, visits });
    } catch (error: any) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }

        if (error?.message === 'PLACE_PROFILE_NOT_FOUND') {
            res.status(404).json({ error: 'Place profile not found' });
            return;
        }

        console.error('Create place visit error:', error);
        res.status(500).json({ error: 'Failed to create place visit' });
    } finally {
        client.release();
    }
});

router.put('/visits/:visitId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const visitId = String(req.params.visitId || '').trim();
        const userId = req.user?.id;
        const { visit } = req.body || {};

        if (!visitId) {
            res.status(400).json({ error: 'visitId is required' });
            return;
        }

        await client.query('BEGIN');
        const updatedVisit = await updateUserPlaceVisit(client, visitId, userId as string | number, visit || {});
        const visits = await listUserPlaceVisits(String(updatedVisit.place_profile_id), userId as string | number, client);
        await client.query('COMMIT');

        res.json({ visit: updatedVisit, visits });
    } catch (error: any) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }

        if (error?.message === 'PLACE_VISIT_NOT_FOUND') {
            res.status(404).json({ error: 'Place visit not found' });
            return;
        }

        console.error('Update place visit error:', error);
        res.status(500).json({ error: 'Failed to update place visit' });
    } finally {
        client.release();
    }
});

router.delete('/visits/:visitId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const visitId = String(req.params.visitId || '').trim();
        const userId = req.user?.id;

        if (!visitId) {
            res.status(400).json({ error: 'visitId is required' });
            return;
        }

        await client.query('BEGIN');
        const deletedVisit = await deleteUserPlaceVisit(client, visitId, userId as string | number);
        const visits = await listUserPlaceVisits(String(deletedVisit.place_profile_id), userId as string | number, client);
        await client.query('COMMIT');

        res.json({ visit: deletedVisit, visits });
    } catch (error: any) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }

        if (error?.message === 'PLACE_VISIT_NOT_FOUND') {
            res.status(404).json({ error: 'Place visit not found' });
            return;
        }

        console.error('Delete place visit error:', error);
        res.status(500).json({ error: 'Failed to delete place visit' });
    } finally {
        client.release();
    }
});

router.put('/:placeProfileId', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!isAdmin(req)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    try {
        const placeProfileId = String(req.params.placeProfileId || '').trim();
        const { name, place_kind, network_status, owner_user_id, profile_data } = req.body || {};

        const updated = await pool.query(
            `UPDATE place_profiles
             SET name = COALESCE($1, name),
                 place_kind = COALESCE($2, place_kind),
                 network_status = COALESCE($3, network_status),
                 owner_user_id = COALESCE($4, owner_user_id),
                 claimed_at = CASE WHEN $4 IS NOT NULL THEN NOW() ELSE claimed_at END,
                 profile_data = COALESCE(profile_data, '{}'::jsonb) || $5::jsonb,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [
                typeof name === 'string' ? name : null,
                typeof place_kind === 'string' ? place_kind : null,
                typeof network_status === 'string' ? network_status : null,
                owner_user_id ?? null,
                JSON.stringify(profile_data && typeof profile_data === 'object' ? profile_data : {}),
                placeProfileId
            ]
        );

        if (updated.rows.length === 0) {
            res.status(404).json({ error: 'Place profile not found' });
            return;
        }

        res.json(updated.rows[0]);
    } catch (error) {
        console.error('Admin update place profile error:', error);
        res.status(500).json({ error: 'Failed to update place profile' });
    }
});

export default router;
