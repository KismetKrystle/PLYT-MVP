import express, { Request, Response } from 'express';
import pool from '../db';

const router = express.Router();

// Search inventory
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT * FROM inventory WHERE 1=1';
        const params: any[] = [];

        if (category) {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Inventory search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
