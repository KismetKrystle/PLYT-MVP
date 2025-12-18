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

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            res.status(400).json({ error: 'Invalid email or password' });
            return;
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            res.status(400).json({ error: 'Invalid email or password' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1h' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
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

    try {
        // Find user by wallet address
        const userResult = await pool.query('SELECT * FROM users WHERE wallet_address = $1', [walletAddress]);

        let user;

        if (userResult.rows.length === 0) {
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

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        let user;

        if (userResult.rows.length === 0) {
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

export default router;
