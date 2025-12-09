import express, { Request, Response } from 'express';
import pool from '../db';

const router = express.Router();

// Search inventory
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { category, search } = req.query;

        let query = `
            SELECT 
                i.*, 
                SPLIT_PART(u.email, '@', 1) as farmer_name,
                (FLOOR(RANDOM() * 10 + 1))::int as distance_km
            FROM inventory i
            JOIN users u ON i.farmer_id = u.id
            WHERE 1=1
        `;

        const params: any[] = [];

        if (category) {
            params.push(category);
            query += ` AND i.category = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length})`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Inventory search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
