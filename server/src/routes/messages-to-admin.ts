import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { softAuthenticateToken } from '../middleware/softAuth';

const router = express.Router();
let messagesToAdminSchemaReady: Promise<void> | null = null;

async function getUsersIdType() {
    const check = await pool.query(
        `SELECT data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'id'
         LIMIT 1`
    );

    if (check.rows.length === 0) {
        return 'UUID';
    }

    const row = check.rows[0];
    return row.data_type === 'uuid' || row.udt_name === 'uuid' ? 'UUID' : 'INTEGER';
}

async function ensureMessagesToAdminSchema() {
    if (!messagesToAdminSchemaReady) {
        messagesToAdminSchemaReady = (async () => {
            const userIdSqlType = await getUsersIdType();

            await pool.query(`
                CREATE TABLE IF NOT EXISTS messages_to_admin (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
                    subject TEXT NOT NULL DEFAULT 'store_request',
                    message TEXT NOT NULL,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    status TEXT NOT NULL DEFAULT 'new',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);

            await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_to_admin_created_at ON messages_to_admin(created_at DESC);`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_to_admin_status ON messages_to_admin(status, created_at DESC);`);
        })().catch((error) => {
            messagesToAdminSchemaReady = null;
            throw error;
        });
    }

    return messagesToAdminSchemaReady;
}

function isAdmin(req: AuthRequest) {
    return req.user?.role === 'admin';
}

router.post('/', softAuthenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        await ensureMessagesToAdminSchema();

        const userId = req.user?.id as string | number;
        const { message, subject, context, email } = req.body || {};
        const trimmedMessage = String(message || '').trim();
        const trimmedSubject = String(subject || 'store_request').trim() || 'store_request';
        const trimmedEmail = String(email || '').trim();

        if (!trimmedMessage) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO messages_to_admin (user_id, subject, message, metadata)
             VALUES ($1, $2, $3, $4::jsonb)
             RETURNING *`,
            [userId, trimmedSubject, trimmedMessage, JSON.stringify({
                context: String(context || '').trim(),
                email: trimmedEmail || null,
                source: userId ? 'authenticated' : 'guest'
            })]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create message to admin error:', error);
        res.status(500).json({ error: 'Failed to save message to admin' });
    }
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!isAdmin(req)) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    try {
        await ensureMessagesToAdminSchema();

        const result = await pool.query(
            `SELECT mta.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
             FROM messages_to_admin mta
             LEFT JOIN users u ON u.id = mta.user_id
             ORDER BY mta.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List messages to admin error:', error);
        res.status(500).json({ error: 'Failed to fetch messages to admin' });
    }
});

export default router;
