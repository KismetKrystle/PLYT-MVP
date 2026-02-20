import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';

export const softAuthenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token, just continue without user
        return next();
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';

    jwt.verify(token, secret, (err: any, user: any) => {
        if (err) {
            // Token invalid, just continue. user will be undefined.
            // Optionally log or whatever, but avoiding side effects for now.
            // console.warn('Soft Auth: Invalid token', err.message);
            return next();
        }

        // Token valid, attach user
        req.user = user;
        next();
    });
};
