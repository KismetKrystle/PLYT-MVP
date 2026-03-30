import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClerkClient, verifyToken } from '@clerk/backend';
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

function buildProfileDataPatch(fullName?: string | null) {
    const normalized = String(fullName || '').trim();
    return normalized ? { full_name: normalized } : {};
}

function signToken(user: { id: string | number; email: string; role: string }) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '24h' }
    );
}

function getClerkClient() {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        throw new Error('CLERK_SECRET_KEY is not configured');
    }

    return createClerkClient({ secretKey });
}

function getPrimaryClerkEmail(clerkUser: any) {
    const emailAddresses = Array.isArray(clerkUser?.emailAddresses) ? clerkUser.emailAddresses : [];
    const primaryId = clerkUser?.primaryEmailAddressId;
    const primaryEmail = emailAddresses.find((email: any) => email?.id === primaryId) || emailAddresses[0];
    const emailAddress = String(primaryEmail?.emailAddress || '').trim().toLowerCase();

    return emailAddress || null;
}

router.post('/signup', async (req: Request, res: Response) => {
    const { name, full_name, email, password, role } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const providedFullName = String(full_name || name || '').trim();
    const normalizedName = String(providedFullName || normalizedEmail.split('@')[0] || 'new-user').trim();
    const profileDataPatch = buildProfileDataPatch(providedFullName);

    const normalizedRole = role || 'consumer';
    if (!VALID_ROLES.has(normalizedRole)) {
        res.status(400).json({ error: 'Invalid role. Expected consumer, farmer, or expert.' });
        return;
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, profile_data)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             RETURNING id, name, email, role, created_at, updated_at`,
            [normalizedName, normalizedEmail, passwordHash, normalizedRole, JSON.stringify(profileDataPatch)]
        );

        const user = sanitizeUser(result.rows[0]);
        const token = signToken(user);
        res.status(201).json({ token, user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/google-login', async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email) {
        res.status(400).json({ error: 'email is required' });
        return;
    }

    try {
        const normalizedEmail = String(email).toLowerCase().trim();
        const providedFullName = String(name || '').trim();
        const fallbackName = normalizedEmail.split('@')[0] || 'google-user';
        const normalizedName = providedFullName || fallbackName;
        const profileDataPatch = buildProfileDataPatch(providedFullName || fallbackName);

        const existing = await pool.query(
            'SELECT id, name, email, role, created_at, updated_at, profile_data FROM users WHERE email = $1 LIMIT 1',
            [normalizedEmail]
        );

        if (existing.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO users (name, email, password_hash, role, profile_data)
                 VALUES ($1, $2, $3, $4, $5::jsonb)
                 RETURNING id, name, email, role, created_at, updated_at`,
                [normalizedName, normalizedEmail, '', 'consumer', JSON.stringify(profileDataPatch)]
            );

            const user = sanitizeUser(created.rows[0]);
            const token = signToken(user);
            res.status(201).json({ token, user, isNewUser: true });
            return;
        }

        const existingUser = existing.rows[0];
        const mergedProfileData = {
            ...(existingUser.profile_data || {}),
            ...profileDataPatch
        };

        const updated = await pool.query(
            `UPDATE users
             SET name = COALESCE(NULLIF($1, ''), name),
                 profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, name, email, role, created_at, updated_at`,
            [providedFullName || normalizedName, JSON.stringify(mergedProfileData), existingUser.id]
        );

        const user = sanitizeUser(updated.rows[0]);
        const token = signToken(user);
        res.json({ token, user });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/clerk-login', async (req: Request, res: Response) => {
    const clerkToken = String(req.body?.clerkToken || req.body?.token || '').trim();

    if (!clerkToken) {
        res.status(400).json({ error: 'clerkToken is required' });
        return;
    }

    if (!process.env.CLERK_SECRET_KEY) {
        res.status(500).json({ error: 'CLERK_SECRET_KEY is not configured' });
        return;
    }

    try {
        const payload = await verifyToken(clerkToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
            jwtKey: process.env.CLERK_JWT_KEY,
            authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES
                ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map((value) => value.trim()).filter(Boolean)
                : undefined
        });

        const clerkUserId = String(payload?.sub || '').trim();
        if (!clerkUserId) {
            res.status(401).json({ error: 'Invalid Clerk session token' });
            return;
        }

        const clerkClient = getClerkClient();
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = getPrimaryClerkEmail(clerkUser);

        if (!email) {
            res.status(400).json({ error: 'Clerk user does not have a primary email address' });
            return;
        }

        const fullName = [
            String(clerkUser.firstName || '').trim(),
            String(clerkUser.lastName || '').trim()
        ].filter(Boolean).join(' ') || String(clerkUser.fullName || '').trim();
        const fallbackName = email.split('@')[0] || 'clerk-user';
        const normalizedName = fullName || fallbackName;
        const profileDataPatch = {
            ...buildProfileDataPatch(normalizedName),
            auth_provider: 'clerk',
            clerk_user_id: clerkUserId
        };

        const existing = await pool.query(
            `SELECT id, name, email, role, created_at, updated_at, profile_data
             FROM users
             WHERE profile_data->>'clerk_user_id' = $1
                OR email = $2
             ORDER BY CASE WHEN profile_data->>'clerk_user_id' = $1 THEN 0 ELSE 1 END
             LIMIT 1`,
            [clerkUserId, email]
        );

        let appUser;
        let isNewUser = false;

        if (existing.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO users (name, email, password_hash, role, profile_data)
                 VALUES ($1, $2, $3, $4, $5::jsonb)
                 RETURNING id, name, email, role, created_at, updated_at`,
                [normalizedName, email, '', 'consumer', JSON.stringify(profileDataPatch)]
            );

            appUser = created.rows[0];
            isNewUser = true;
        } else {
            const existingUser = existing.rows[0];
            const mergedProfileData = {
                ...(existingUser.profile_data || {}),
                ...profileDataPatch
            };

            const updated = await pool.query(
                `UPDATE users
                 SET name = COALESCE(NULLIF($1, ''), name),
                     email = $2,
                     profile_data = COALESCE(profile_data, '{}'::jsonb) || $3::jsonb,
                     updated_at = NOW()
                 WHERE id = $4
                 RETURNING id, name, email, role, created_at, updated_at`,
                [normalizedName, email, JSON.stringify(mergedProfileData), existingUser.id]
            );

            appUser = updated.rows[0];
        }

        const user = sanitizeUser(appUser);
        const token = signToken(user);
        res.json({ token, user, isNewUser });
    } catch (error) {
        console.error('Clerk login error:', error);
        const message = error instanceof Error && error.message
            ? error.message
            : 'Failed to verify Clerk session';
        res.status(401).json({ error: message });
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'email and password are required' });
        return;
    }

    try {
        const normalizedEmail = String(email).toLowerCase().trim();
        const result = await pool.query(
            'SELECT id, name, email, role, password_hash, created_at, updated_at FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            const passwordHash = await bcrypt.hash(password, 10);
            const defaultName = normalizedEmail.split('@')[0] || 'new-user';
            const created = await pool.query(
                `INSERT INTO users (name, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, email, role, created_at, updated_at`,
                [defaultName, normalizedEmail, passwordHash, 'consumer']
            );

            const user = sanitizeUser(created.rows[0]);
            const token = signToken(user);
            res.status(201).json({ token, user, isNewUser: true });
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

        const syntheticEmail = lowerUsername.includes('@')
            ? lowerUsername
            : `${lowerUsername}@plyt.internal`;
        const defaultName = lowerUsername.includes('@')
            ? lowerUsername.split('@')[0]
            : lowerUsername;
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
                [defaultName, syntheticEmail, allowedUser.hashed_password, 'consumer']
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
