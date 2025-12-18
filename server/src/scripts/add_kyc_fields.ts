
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function migrate() {
    console.log('Starting migration...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Connected to DB. Migrating users table...');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS location_city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS location_address TEXT,
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS avatar_url TEXT
        `);

        console.log('Migration complete!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

migrate();
