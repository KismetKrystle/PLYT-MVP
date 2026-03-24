import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

async function getOwnedCategory(categoryId: string, userId: string | number) {
    const result = await pool.query(
        `SELECT id, user_id, label, emoji, color, sort_order, created_at
         FROM profile_categories
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [categoryId, userId]
    );

    return result.rows[0] || null;
}

router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT id, label, emoji, color, sort_order, created_at
             FROM profile_categories
             WHERE user_id = $1
             ORDER BY sort_order ASC, created_at ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get profile categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { label, emoji, color, sort_order } = req.body || {};
        const normalizedLabel = String(label || '').trim();

        if (!normalizedLabel) {
            res.status(400).json({ error: 'label is required' });
            return;
        }

        const existing = await pool.query(
            `SELECT id, label, emoji, color, sort_order, created_at
             FROM profile_categories
             WHERE user_id = $1
               AND LOWER(TRIM(label)) = LOWER(TRIM($2))
             ORDER BY sort_order ASC, created_at ASC
             LIMIT 1`,
            [userId, normalizedLabel]
        );

        if (existing.rows[0]) {
            res.status(200).json(existing.rows[0]);
            return;
        }

        const result = await pool.query(
            `INSERT INTO profile_categories (user_id, label, emoji, color, sort_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, label, emoji, color, sort_order, created_at`,
            [
                userId,
                normalizedLabel,
                emoji ? String(emoji) : null,
                color ? String(color) : null,
                Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create profile category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.patch('/categories/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categoryId = String(req.params.id || '').trim();
        const owned = await getOwnedCategory(categoryId, userId as string | number);

        if (!owned) {
            res.sendStatus(404);
            return;
        }

        const nextLabel = req.body?.label !== undefined ? String(req.body.label || '').trim() : owned.label;
        if (!nextLabel) {
            res.status(400).json({ error: 'label cannot be empty' });
            return;
        }

        const result = await pool.query(
            `UPDATE profile_categories
             SET label = $1,
                 emoji = $2,
                 color = $3,
                 sort_order = $4
             WHERE id = $5 AND user_id = $6
             RETURNING id, label, emoji, color, sort_order, created_at`,
            [
                nextLabel,
                req.body?.emoji !== undefined ? String(req.body.emoji || '') || null : owned.emoji,
                req.body?.color !== undefined ? String(req.body.color || '') || null : owned.color,
                req.body?.sort_order !== undefined && Number.isFinite(Number(req.body.sort_order))
                    ? Number(req.body.sort_order)
                    : owned.sort_order,
                categoryId,
                userId
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update profile category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/categories/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categoryId = String(req.params.id || '').trim();
        const result = await pool.query(
            `DELETE FROM profile_categories
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [categoryId, userId]
        );

        if (result.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete profile category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

router.get('/items/:categoryId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categoryId = String(req.params.categoryId || '').trim();
        const owned = await getOwnedCategory(categoryId, userId as string | number);

        if (!owned) {
            res.sendStatus(404);
            return;
        }

        const result = await pool.query(
            `SELECT id, category_id, title, media_url, media_type, description, tags, source, source_ref, is_private, created_at
             FROM profile_items
             WHERE user_id = $1 AND category_id = $2
             ORDER BY created_at DESC`,
            [userId, categoryId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get profile items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

router.post('/items', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const {
            category_id,
            title,
            media_url,
            media_type,
            description,
            tags,
            source,
            source_ref,
            is_private
        } = req.body || {};

        const categoryId = String(category_id || '').trim();
        const normalizedTitle = String(title || '').trim();

        if (!categoryId || !normalizedTitle) {
            res.status(400).json({ error: 'category_id and title are required' });
            return;
        }

        const owned = await getOwnedCategory(categoryId, userId as string | number);
        if (!owned) {
            res.status(404).json({ error: 'Category not found' });
            return;
        }

        const normalizedMediaType = String(media_type || 'image').trim().toLowerCase();
        if (!['image', 'video', 'pdf'].includes(normalizedMediaType)) {
            res.status(400).json({ error: 'media_type must be image, video, or pdf' });
            return;
        }

        const normalizedTags = Array.isArray(tags)
            ? tags.map((tag) => String(tag || '').trim()).filter(Boolean)
            : [];

        const result = await pool.query(
            `INSERT INTO profile_items (
                user_id, category_id, title, media_url, media_type, description, tags, source, source_ref, is_private
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10)
             RETURNING id, category_id, title, media_url, media_type, description, tags, source, source_ref, is_private, created_at`,
            [
                userId,
                categoryId,
                normalizedTitle,
                media_url ? String(media_url) : null,
                normalizedMediaType,
                description ? String(description) : null,
                normalizedTags,
                source ? String(source) : null,
                source_ref ? String(source_ref) : null,
                is_private === undefined ? true : Boolean(is_private)
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create profile item error:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

router.delete('/items/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const itemId = String(req.params.id || '').trim();
        const result = await pool.query(
            `DELETE FROM profile_items
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [itemId, userId]
        );

        if (result.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete profile item error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export default router;
