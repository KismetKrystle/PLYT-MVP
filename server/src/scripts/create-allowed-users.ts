import pool from '../db';

async function createAllowedUsersTable() {
    try {
        console.log('Connecting to database...');

        const query = `
            CREATE TABLE IF NOT EXISTS allowed_users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await pool.query(query);
        console.log('✅ Successfully created `allowed_users` table (or it already exists).');

    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createAllowedUsersTable();
