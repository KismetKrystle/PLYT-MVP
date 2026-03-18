import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
    ensurePlaceProfileSchema,
    getPlaceProfileByExternalId,
    getPlaceProfileById,
    listPlaceFeedback
} from '../services/placeProfiles';

const router = express.Router();

function isAdmin(req: AuthRequest) {
    return req.user?.role === 'admin';
}

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
