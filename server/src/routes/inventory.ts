import express, { Request, Response } from 'express';
import pool from '../db';
import { ensureBusinessSchema } from '../services/businesses';

const router = express.Router();

// Search inventory
router.get('/search', async (req: Request, res: Response) => {
    try {
        await ensureBusinessSchema();
        const { category, search } = req.query;

        let query = `
            SELECT 
                i.*, 
                COALESCE(
                    b.name,
                    NULLIF(fp.profile_data->>'business_name', ''),
                    NULLIF(u.name, ''),
                    SPLIT_PART(u.email, '@', 1)
                ) as supplier_name,
                COALESCE(
                    b.name,
                    NULLIF(fp.profile_data->>'business_name', ''),
                    NULLIF(u.name, ''),
                    SPLIT_PART(u.email, '@', 1)
                ) as farmer_name,
                COALESCE(
                    b.business_type,
                    CASE WHEN u.role = 'distributor' THEN 'distributor' ELSE 'farmer' END
                ) as supplier_type,
                COALESCE(
                    NULLIF(b.primary_location, ''),
                    NULLIF(b.service_region, ''),
                    NULLIF(fp.profile_data->>'location', '')
                ) as supplier_location,
                (FLOOR(RANDOM() * 10 + 1))::int as distance_km
            FROM inventory i
            LEFT JOIN businesses b ON i.business_id = b.id
            LEFT JOIN users u ON i.farmer_id = u.id
            LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
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
