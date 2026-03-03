import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const VALID_ROLES = new Set(['consumer', 'farmer', 'expert', 'distributor', 'servicer']);

function sanitizeUser(row: any) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

router.post('/', async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ error: 'name, email, and password are required' });
        return;
    }

    const nextRole = role || 'consumer';
    if (!VALID_ROLES.has(nextRole)) {
        res.status(400).json({ error: 'Invalid role. Expected consumer, farmer, or expert.' });
        return;
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Email already exists' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const created = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at, updated_at`,
            [name, email, passwordHash, nextRole]
        );

        res.status(201).json(sanitizeUser(created.rows[0]));
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

router.get('/', authenticateToken, async (_req: AuthRequest, res: Response) => {
    try {
        const users = await pool.query(
            'SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
        );
        res.json(users.rows.map(sanitizeUser));
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const requesterId = String(req.user?.id);
        const requesterRole = req.user?.role;
        if (requesterRole !== 'expert' && requesterId !== String(req.params.id)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        res.json(sanitizeUser(result.rows[0]));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    const requesterId = String(req.user?.id);
    const requesterRole = req.user?.role;
    if (requesterRole !== 'expert' && requesterId !== String(req.params.id)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    const { name, email, role, password } = req.body;
    if (role && !VALID_ROLES.has(role)) {
        res.status(400).json({ error: 'Invalid role. Expected consumer, farmer, or expert.' });
        return;
    }

    try {
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;
        const result = await pool.query(
            `UPDATE users
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 role = COALESCE($3, role),
                 password_hash = COALESCE($4, password_hash),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING id, name, email, role, created_at, updated_at`,
            [name ?? null, email ?? null, role ?? null, passwordHash, req.params.id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(sanitizeUser(result.rows[0]));
    } catch (error: any) {
        if (error?.code === '23505') {
            res.status(409).json({ error: 'Email already exists' });
            return;
        }
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    const requesterId = String(req.user?.id);
    const requesterRole = req.user?.role;
    if (requesterRole !== 'expert' && requesterId !== String(req.params.id)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;

