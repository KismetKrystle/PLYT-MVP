import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const VALID_ROLES = new Set(['consumer', 'farmer', 'expert']);

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

function signToken(user: { id: string | number; email: string; role: string }) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
    );
}

router.post('/signup', async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ error: 'name, email, and password are required' });
        return;
    }

    const normalizedRole = role || 'consumer';
    if (!VALID_ROLES.has(normalizedRole)) {
        res.status(400).json({ error: 'Invalid role. Expected consumer, farmer, or expert.' });
        return;
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at, updated_at`,
            [name, email, passwordHash, normalizedRole]
        );

        const user = sanitizeUser(result.rows[0]);
        const token = signToken(user);
        res.status(201).json({ token, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }

    try {
        const result = await pool.query(
            'SELECT id, name, email, role, password_hash, created_at, updated_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const row = result.rows[0];
        const validPassword = await bcrypt.compare(password, row.password_hash);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const user = sanitizeUser(row);
        const token = signToken(user);
        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/gatekeeper-login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }

    try {
        const lowerUsername = String(username).toLowerCase().trim();

        const allowedUserResult = await pool.query(
            'SELECT * FROM allowed_users WHERE username = $1',
            [lowerUsername]
        );

        if (allowedUserResult.rows.length === 0) {
            res.status(401).json({ error: 'Username not recognised.' });
            return;
        }

        const allowedUser = allowedUserResult.rows[0];
        const isValidPassword = await bcrypt.compare(password, allowedUser.hashed_password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid password.' });
            return;
        }

        const syntheticEmail = `${lowerUsername}@plyt.internal`;
        let appUser;

        const appUserResult = await pool.query(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE email = $1',
            [syntheticEmail]
        );

        if (appUserResult.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO users (name, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, email, role, created_at, updated_at`,
                [lowerUsername, syntheticEmail, allowedUser.hashed_password, 'consumer']
            );
            appUser = created.rows[0];
        } else {
            appUser = appUserResult.rows[0];
        }

        const user = sanitizeUser(appUser);
        const token = signToken(user);
        res.json({ token, user });
    } catch (error: any) {
        if (error?.code === '42P01') {
            res.status(500).json({ error: 'allowed_users table is missing. Run: npm run create-allowed-users' });
            return;
        }
        console.error('Gatekeeper login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(sanitizeUser(result.rows[0]));
    } catch (error) {
        console.error('Auth /me error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
