import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { JwtUser } from '../types/auth';

export interface AuthRequest extends Request {
    user?: JwtUser;
}

function verifyBearerToken(token: string, req: AuthRequest, res: Response, next: NextFunction) {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const logPath = path.join(process.cwd(), 'auth_logs.txt');

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            const logMsg = `[${new Date().toISOString()}] JWT Error: ${err.message} | Secret Len: ${secret.length} | Token: ${token.substring(0, 15)}...\n`;
            fs.appendFileSync(logPath, logMsg);
            console.error('JWT Verification Error:', err.message);
            res.status(403).json({ error: 'Auth Error', details: err.message });
            return;
        }

        req.user = decoded as JwtUser;
        next();
    });
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const logPath = path.join(process.cwd(), 'auth_logs.txt');

    if (!token) {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Auth Failure: No token found\n`);
        res.sendStatus(401);
        return;
    }

    verifyBearerToken(token, req, res, next);
};

export const authenticateTokenOptional = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    verifyBearerToken(token, req, res, next);
};
