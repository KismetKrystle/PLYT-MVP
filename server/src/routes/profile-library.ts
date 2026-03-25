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

async function getUserCategories(userId: string | number) {
    const result = await pool.query(
        `SELECT id, label, emoji, color, sort_order, created_at
         FROM profile_categories
         WHERE user_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [userId]
    );

    return result.rows;
}

async function getUserItems(
    userId: string | number,
    options: {
        categoryId?: string;
        source?: string;
        limit?: number;
    } = {}
) {
    const clauses = ['user_id = $1'];
    const values: Array<string | number> = [userId];

    if (options.categoryId) {
        values.push(options.categoryId);
        clauses.push(`category_id = $${values.length}`);
    }

    if (options.source) {
        values.push(options.source);
        clauses.push(`source = $${values.length}`);
    }

    let limitClause = '';
    if (options.limit && Number.isFinite(options.limit) && options.limit > 0) {
        values.push(options.limit);
        limitClause = ` LIMIT $${values.length}`;
    }

    const result = await pool.query(
        `SELECT id, category_id, title, media_url, media_type, document_type, description, content_markdown, content_json,
                tags, source, source_ref, source_conversation_id, source_message_index, selection_text, metadata, is_private, created_at
         FROM profile_items
         WHERE ${clauses.join(' AND ')}
         ORDER BY created_at DESC${limitClause}`,
        values
    );

    return result.rows;
}

router.get('/init', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const requestedCategoryId = String(req.query.activeCategoryId || '').trim();
        const categories = await getUserCategories(userId as string | number);
        const activeCategory = categories.find((category: any) => String(category.id) === requestedCategoryId) || categories[0] || null;
        const activeItems = activeCategory
            ? await getUserItems(userId as string | number, { categoryId: String(activeCategory.id) })
            : [];

        res.json({
            categories,
            activeCategory,
            activeItems
        });
    } catch (error) {
        console.error('Init profile library error:', error);
        res.status(500).json({ error: 'Failed to initialize profile library' });
    }
});

router.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categories = await getUserCategories(userId as string | number);
        res.json(categories);
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

router.get('/items', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categoryId = String(req.query.categoryId || '').trim();
        const source = String(req.query.source || '').trim();
        const rawLimit = Number.parseInt(String(req.query.limit || ''), 10);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : undefined;

        if (categoryId) {
            const owned = await getOwnedCategory(categoryId, userId as string | number);
            if (!owned) {
                res.sendStatus(404);
                return;
            }
        }

        const items = await getUserItems(userId as string | number, {
            categoryId: categoryId || undefined,
            source: source || undefined,
            limit
        });

        res.json(items);
    } catch (error) {
        console.error('Get filtered profile items error:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

router.get('/items/:categoryId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const categoryId = String(req.params.categoryId || '').trim();
        const result = await pool.query(
            `SELECT pi.id, pi.category_id, pi.title, pi.media_url, pi.media_type, pi.document_type, pi.description, pi.content_markdown,
                    pi.content_json, pi.tags, pi.source, pi.source_ref, pi.source_conversation_id, pi.source_message_index,
                    pi.selection_text, pi.metadata, pi.is_private, pi.created_at
             FROM profile_items pi
             JOIN profile_categories pc ON pc.id = pi.category_id
             WHERE pi.category_id = $1
               AND pc.user_id = $2
             ORDER BY pi.created_at DESC`,
            [categoryId, userId]
        );

        res.json({ items: result.rows });
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
            document_type,
            description,
            content_markdown,
            content_json,
            tags,
            source,
            source_ref,
            source_conversation_id,
            source_message_index,
            selection_text,
            metadata,
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

        const normalizedMediaType = String(media_type || (content_markdown ? 'markdown' : 'image')).trim().toLowerCase();
        if (!['image', 'video', 'pdf', 'markdown'].includes(normalizedMediaType)) {
            res.status(400).json({ error: 'media_type must be image, video, pdf, or markdown' });
            return;
        }

        const normalizedTags = Array.isArray(tags)
            ? tags.map((tag) => String(tag || '').trim()).filter(Boolean)
            : [];

        const result = await pool.query(
            `INSERT INTO profile_items (
                user_id, category_id, title, media_url, media_type, document_type, description, content_markdown, content_json,
                tags, source, source_ref, source_conversation_id, source_message_index, selection_text, metadata, is_private
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], $11, $12, $13, $14, $15, $16::jsonb, $17)
             RETURNING id, category_id, title, media_url, media_type, document_type, description, content_markdown, content_json,
                       tags, source, source_ref, source_conversation_id, source_message_index, selection_text, metadata, is_private, created_at`,
            [
                userId,
                categoryId,
                normalizedTitle,
                media_url ? String(media_url) : null,
                normalizedMediaType,
                document_type ? String(document_type) : null,
                description ? String(description) : null,
                content_markdown ? String(content_markdown) : null,
                content_json ? JSON.stringify(content_json) : null,
                normalizedTags,
                source ? String(source) : null,
                source_ref ? String(source_ref) : null,
                source_conversation_id ? String(source_conversation_id) : null,
                Number.isFinite(Number(source_message_index)) ? Number(source_message_index) : null,
                selection_text ? String(selection_text) : null,
                metadata ? JSON.stringify(metadata) : JSON.stringify({}),
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
