import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import pool from '../db';

async function getUsersIdType(): Promise<'uuid' | 'integer'> {
    const check = await pool.query(
        `SELECT data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'id'
         LIMIT 1`
    );

    if (check.rows.length === 0) {
        return 'uuid';
    }

    const row = check.rows[0];
    if (row.data_type === 'uuid' || row.udt_name === 'uuid') {
        return 'uuid';
    }
    return 'integer';
}

async function migrate() {
    try {
        console.log('Running Phase 1 profile/chat migrations...');

        await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'consumer',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'consumer';`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`UPDATE users SET name = COALESCE(name, SPLIT_PART(email, '@', 1));`);

        const usersIdType = await getUsersIdType();
        const userIdSqlType = usersIdType === 'uuid' ? 'UUID' : 'INTEGER';
        console.log(`Detected users.id type: ${userIdSqlType}`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS consumer_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS farmer_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS expert_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS allowed_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Phase 1 migrations complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();

