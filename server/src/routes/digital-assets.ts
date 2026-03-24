import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { findCatalogAsset } from '../services/digitalAssetCatalog';

const router = express.Router();

function normalizeSource(value: unknown, fallback: string) {
    const source = String(value || fallback).trim().toLowerCase();
    return source || fallback;
}

async function ensureAsset(assetId: string) {
    const asset = findCatalogAsset(assetId);
    if (!asset) return null;

    await pool.query(
        `INSERT INTO digital_assets (
            id, name, asset_type, status, image_url, chain_hash, uploaded_at,
            minted_from, creator_name, file_format, usage_license, summary, tags, metadata, updated_at
        )
         VALUES (
            $1, $2, $3, $4, $5, $6, $7::timestamp, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, NOW()
         )
         ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            asset_type = EXCLUDED.asset_type,
            status = EXCLUDED.status,
            image_url = EXCLUDED.image_url,
            chain_hash = EXCLUDED.chain_hash,
            uploaded_at = EXCLUDED.uploaded_at,
            minted_from = EXCLUDED.minted_from,
            creator_name = EXCLUDED.creator_name,
            file_format = EXCLUDED.file_format,
            usage_license = EXCLUDED.usage_license,
            summary = EXCLUDED.summary,
            tags = EXCLUDED.tags,
            updated_at = NOW()`,
        [
            asset.id,
            asset.name,
            asset.assetType,
            asset.status,
            asset.imageUrl,
            asset.chainHash,
            asset.uploadedAt,
            asset.mintedFrom,
            asset.creatorName,
            asset.fileFormat,
            asset.usageLicense,
            asset.summary,
            JSON.stringify(asset.tags),
            JSON.stringify({})
        ]
    );

    return asset;
}

async function refreshCounts(assetId: string) {
    await pool.query(
        `UPDATE digital_assets
         SET view_count = (SELECT COUNT(*)::int FROM digital_asset_views WHERE asset_id = $1),
             like_count = (SELECT COUNT(*)::int FROM digital_asset_likes WHERE asset_id = $1),
             save_count = (SELECT COUNT(*)::int FROM digital_asset_saves WHERE asset_id = $1),
             ai_referral_count = (SELECT COUNT(*)::int FROM digital_asset_ai_referrals WHERE asset_id = $1),
             updated_at = NOW()
         WHERE id = $1`,
        [assetId]
    );
}

async function buildAnalyticsResponse(assetId: string, viewerUserId?: string | number) {
    const assetResult = await pool.query(
        `SELECT id, view_count, like_count, save_count, ai_referral_count
         FROM digital_assets
         WHERE id = $1
         LIMIT 1`,
        [assetId]
    );

    if (assetResult.rows.length === 0) return null;

    let hasLiked = false;
    let hasSaved = false;

    if (viewerUserId) {
        const [likedResult, savedResult] = await Promise.all([
            pool.query(`SELECT 1 FROM digital_asset_likes WHERE asset_id = $1 AND user_id = $2 LIMIT 1`, [assetId, viewerUserId]),
            pool.query(`SELECT 1 FROM digital_asset_saves WHERE asset_id = $1 AND user_id = $2 LIMIT 1`, [assetId, viewerUserId])
        ]);

        hasLiked = likedResult.rows.length > 0;
        hasSaved = savedResult.rows.length > 0;
    }

    const row = assetResult.rows[0];

    return {
        assetId: row.id,
        totals: {
            views: Number(row.view_count || 0),
            likes: Number(row.like_count || 0),
            saves: Number(row.save_count || 0),
            aiReferrals: Number(row.ai_referral_count || 0)
        },
        viewer: {
            hasLiked,
            hasSaved
        }
    };
}

router.get('/:assetId/analytics', async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        const asset = await ensureAsset(assetId);
        if (!asset) {
            res.sendStatus(404);
            return;
        }

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Get digital asset analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch digital asset analytics' });
    }
});

router.post('/:assetId/views', async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        const sessionId = req.body?.sessionId ? String(req.body.sessionId).trim() : null;
        const source = normalizeSource(req.body?.source, 'direct');

        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        const asset = await ensureAsset(assetId);
        if (!asset) {
            res.sendStatus(404);
            return;
        }

        await pool.query(
            `INSERT INTO digital_asset_views (asset_id, viewer_user_id, session_id, source)
             VALUES ($1, $2, $3, $4)`,
            [assetId, req.user?.id || null, sessionId, source]
        );

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Track digital asset view error:', error);
        res.status(500).json({ error: 'Failed to track digital asset view' });
    }
});

router.post('/:assetId/likes', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        const asset = await ensureAsset(assetId);
        if (!asset) {
            res.sendStatus(404);
            return;
        }

        await pool.query(
            `INSERT INTO digital_asset_likes (asset_id, user_id, source)
             VALUES ($1, $2, $3)
             ON CONFLICT (asset_id, user_id) DO NOTHING`,
            [assetId, req.user?.id, normalizeSource(req.body?.source, 'plyt_app')]
        );

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Like digital asset error:', error);
        res.status(500).json({ error: 'Failed to like digital asset' });
    }
});

router.delete('/:assetId/likes', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        await pool.query(`DELETE FROM digital_asset_likes WHERE asset_id = $1 AND user_id = $2`, [assetId, req.user?.id]);

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Unlike digital asset error:', error);
        res.status(500).json({ error: 'Failed to unlike digital asset' });
    }
});

router.post('/:assetId/saves', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        const asset = await ensureAsset(assetId);
        if (!asset) {
            res.sendStatus(404);
            return;
        }

        await pool.query(
            `INSERT INTO digital_asset_saves (asset_id, user_id, source)
             VALUES ($1, $2, $3)
             ON CONFLICT (asset_id, user_id) DO NOTHING`,
            [assetId, req.user?.id, normalizeSource(req.body?.source, 'plyt_app')]
        );

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Save digital asset error:', error);
        res.status(500).json({ error: 'Failed to save digital asset' });
    }
});

router.delete('/:assetId/saves', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        await pool.query(`DELETE FROM digital_asset_saves WHERE asset_id = $1 AND user_id = $2`, [assetId, req.user?.id]);

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Unsave digital asset error:', error);
        res.status(500).json({ error: 'Failed to unsave digital asset' });
    }
});

router.post('/:assetId/ai-referrals', async (req: AuthRequest, res: Response) => {
    try {
        const assetId = String(req.params.assetId || '').trim();
        const sessionId = req.body?.sessionId ? String(req.body.sessionId).trim() : null;
        const source = normalizeSource(req.body?.source, 'assistant');
        const context = req.body?.context && typeof req.body.context === 'object' && !Array.isArray(req.body.context)
            ? req.body.context
            : {};

        if (!assetId) {
            res.status(400).json({ error: 'assetId is required' });
            return;
        }

        const asset = await ensureAsset(assetId);
        if (!asset) {
            res.sendStatus(404);
            return;
        }

        await pool.query(
            `INSERT INTO digital_asset_ai_referrals (asset_id, user_id, session_id, source, context)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [assetId, req.user?.id || null, sessionId, source, JSON.stringify(context)]
        );

        await refreshCounts(assetId);
        const analytics = await buildAnalyticsResponse(assetId, req.user?.id);
        res.json(analytics);
    } catch (error) {
        console.error('Track digital asset AI referral error:', error);
        res.status(500).json({ error: 'Failed to track digital asset AI referral' });
    }
});

export default router;
