import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = express.Router();

// Signup
router.post('/signup', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    if (process.env.ACCESS_WALL_ENABLED === 'true') {
        res.status(403).json({ error: 'Standard registration is disabled during private beta.', code: 'REGISTRATION_DISABLED' });
        return;
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, role, plyt_balance) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
            [email, hashedPassword, 'consumer', 0]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    if (process.env.ACCESS_WALL_ENABLED === 'true') {
        res.status(403).json({ error: 'Standard login is disabled during private beta. Please use the member login.', code: 'LOGIN_DISABLED' });
        return;
    }

    try {
        let user;
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            // Auto-signup check
            if (process.env.ACCESS_WALL_ENABLED === 'true') {
                return res.status(403).json({ error: 'Registration is currently disabled.' });
            }

            // Auto-signup for any new email
            const hashedPassword = await bcrypt.hash(password || 'default_password', 10);
            const newUser = await pool.query(
                'INSERT INTO users (email, password_hash, role, plyt_balance) VALUES ($1, $2, $3, $4) RETURNING *',
                [email, hashedPassword, 'consumer', 100] // Give some initial balance
            );
            user = newUser.rows[0];
            console.log(`Auto-signed up new user: ${email}`);
        } else {
            user = userResult.rows[0];
            console.log(`Loging in existing user: ${email} (Password check bypassed)`);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
        console.error('Login error details:', {
            message: error.message,
            stack: error.stack,
            email: email
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Wallet Login
router.post('/wallet-login', async (req: Request, res: Response) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
    }

    if (process.env.ACCESS_WALL_ENABLED === 'true') {
        res.status(403).json({ error: 'Wallet login is currently disabled.', code: 'LOGIN_DISABLED' });
        return;
    }

    if (process.env.ACCESS_WALL_ENABLED === 'true') {
        res.status(403).json({ error: 'Wallet login is currently disabled.', code: 'LOGIN_DISABLED' });
        return;
    }

    try {
        // Find user by wallet address
        const userResult = await pool.query('SELECT * FROM users WHERE wallet_address = $1', [walletAddress]);

        let user;

        if (userResult.rows.length === 0) {
            if (process.env.ACCESS_WALL_ENABLED === 'true') {
                return res.status(403).json({ error: 'Registration is currently disabled.' });
            }

            // Create new user (Simulated email for wallet users)
            const email = `${walletAddress.substring(0, 8)}@wallet.plyt`;
            // Random password hash (they can't login with password unless they set it later)
            const passwordHash = await bcrypt.hash(Date.now().toString(), 10);

            const newUser = await pool.query(
                'INSERT INTO users (email, password_hash, role, wallet_address, plyt_balance) VALUES ($1, $2, $3, $4, 0) RETURNING *',
                [email, passwordHash, 'consumer', walletAddress]
            );
            user = newUser.rows[0];
        } else {
            user = userResult.rows[0];
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, wallet_address: user.wallet_address } });

    } catch (error) {
        console.error('Wallet login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Google Login (Simulation)
router.post('/google-login', async (req: Request, res: Response) => {
    const { email, name } = req.body; // In real app, verify ID token

    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    if (process.env.ACCESS_WALL_ENABLED === 'true') {
        res.status(403).json({ error: 'Google login is currently disabled.', code: 'LOGIN_DISABLED' });
        return;
    }

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        let user;

        if (userResult.rows.length === 0) {
            if (process.env.ACCESS_WALL_ENABLED === 'true') {
                return res.status(403).json({ error: 'Registration is currently disabled.' });
            }

            // Create new user
            const passwordHash = await bcrypt.hash(Date.now().toString(), 10);
            const newUser = await pool.query(
                'INSERT INTO users (email, password_hash, role, plyt_balance) VALUES ($1, $2, $3, 100) RETURNING *',
                [email, passwordHash, 'consumer']
            );
            user = newUser.rows[0];
        } else {
            user = userResult.rows[0];
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, wallet_address: user.wallet_address } });

    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Gatekeeper Login - checks against allowed_users table in Neon Postgres
router.post('/gatekeeper-login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    try {
        const lowerEmail = email.toLowerCase().trim();

        // 1. Find user in allowed_users table
        const allowedUserResult = await pool.query('SELECT * FROM allowed_users WHERE email = $1', [lowerEmail]);
        if (allowedUserResult.rows.length === 0) {
            res.status(401).json({ error: 'Account not found in the allowed list.' });
            return;
        }

        const allowedUser = allowedUserResult.rows[0];

        // 2. Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, allowedUser.hashed_password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid password.' });
            return;
        }

        // 3. Find or auto-create corresponding app user
        let appUser;
        const appUserResult = await pool.query('SELECT * FROM users WHERE email = $1', [lowerEmail]);

        if (appUserResult.rows.length === 0) {
            const newUser = await pool.query(
                'INSERT INTO users (email, password_hash, role, plyt_balance) VALUES ($1, $2, $3, $4) RETURNING *',
                [lowerEmail, allowedUser.hashed_password, 'consumer', 100]
            );
            appUser = newUser.rows[0];
            console.log(`Auto-created app user for gatekeeper member: ${lowerEmail}`);
        } else {
            appUser = appUserResult.rows[0];
        }

        // 4. Issue JWT token
        const token = jwt.sign(
            { id: appUser.id, email: appUser.email, role: appUser.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: appUser.id, email: appUser.email, role: appUser.role } });

    } catch (error: any) {
        console.error('Gatekeeper login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
