import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// Define the shape of the user object attached to the request
interface UserPayload {
    id: number;
    email: string;
    role: string;
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export const checkGatekeeper = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Check if Access Wall is enabled
    if (process.env.ACCESS_WALL_ENABLED !== 'true') {
        return next();
    }

    const publicRoutes = [
        '/',
        '/health',
        '/auth/login',            // Allowed to hit route, but router will block it
        '/auth/wallet-login',     // Allowed to hit route, but router will block it
        '/auth/google-login',     // Allowed to hit route, but router will block it
        '/auth/gatekeeper-login', // <--- Gatekeeper Login
        '/me',                    // Session check (mounted at / not /auth/)
    ];

    // 2. Allow Public Routes
    if (publicRoutes.includes(req.path)) {
        return next();
    }

    // 3. Block Registration
    // Check for exact match or if it falls under a registration path if added later
    if (req.path === '/auth/signup') {
        return res.status(403).json({
            error: 'Registration is currently disabled.',
            code: 'REGISTRATION_DISABLED'
        });
    }

    // 4. Check Authentication for Protected Routes
    // If we are here, it's a protected route (by default)
    if (!req.user) {
        // If the user is not authenticated, we return 401. 
        // The client should redirect to login.
        // NOTE: This assumes an auth middleware ran BEFORE this to populate req.user
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 5. Check Allowlist via Postgres directly
    // This ensures revocation is instant if removed from the DB
    try {
        const userEmail = req.user.email.toLowerCase();

        const result = await pool.query('SELECT id FROM allowed_users WHERE email = $1', [userEmail]);

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'Access denied. Your email is not on the allowed list.',
                code: 'GATEKEEPER_DENIED'
            });
        }

        return next();
    } catch (err) {
        console.error('Error verifying user against allowed_users db:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
