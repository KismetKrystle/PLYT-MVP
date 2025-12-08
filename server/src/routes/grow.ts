import express, { Request, Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// --- Grow Systems ---

// Search grow systems
router.get('/systems/search', async (req: Request, res: Response) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM grow_systems WHERE 1=1';
        const params: any[] = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Grow systems search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get grow system details
router.get('/systems/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM grow_systems WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get grow system error:', error);
        res.sendStatus(500);
    }
});

// --- Lessons ---

// Get user lessons
router.get('/lessons', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query('SELECT * FROM lessons WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get lessons error:', error);
        res.sendStatus(500);
    }
});

// Save a lesson (mock)
router.post('/lessons', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { title, content } = req.body;

        const result = await pool.query(
            'INSERT INTO lessons (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
            [userId, title, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Save lesson error:', error);
        res.sendStatus(500);
    }
});

export default router;
