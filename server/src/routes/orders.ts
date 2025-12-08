import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// List orders
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { type } = req.query;

        let query = 'SELECT * FROM orders WHERE user_id = $1';
        const params: any[] = [userId];

        if (type) {
            params.push(type);
            query += ` AND type = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('List orders error:', error);
        res.sendStatus(500);
    }
});

// Get order details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);

        if (orderResult.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

        res.json({ ...orderResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        console.error('Get order error:', error);
        res.sendStatus(500);
    }
});

// Create Order (Simulated transaction)
router.post('/confirm', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id;
        const { type, items, total } = req.body; // items: [{ item_id, quantity, price, item_type }]

        // Check balance (Logic skipped for brevity, assumed valid for MVP start)
        // In real app, we would query user balance and rollback if insufficient.

        // 1. Create Order
        const orderResult = await client.query(
            'INSERT INTO orders (user_id, type, status, total_plyt) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, type, 'paid', total]
        );
        const orderId = orderResult.rows[0].id;

        // 2. Create Order Items
        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, item_type, item_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4, $5)',
                [orderId, item.item_type || 'inventory', item.item_id, item.quantity, item.price]
            );
        }

        // 3. Deduct Balance (simple update)
        await client.query(
            'UPDATE users SET plyt_balance = plyt_balance - $1 WHERE id = $2',
            [total, userId]
        );

        await client.query('COMMIT');

        res.status(201).json({ id: orderId, message: 'Order confirmed' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Transaction failed' });
    } finally {
        client.release();
    }
});

export default router;
