import path from 'path';
import dotenv from 'dotenv';
// Adjusted path to .env (up two levels from src/scripts)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Adjusted import to db (up one level from src/scripts to src/db)
import pool from '../db';
import bcrypt from 'bcrypt';

async function seed() {
    try {
        console.log('Seeding demo user...');
        const email = 'demo@plyt.com';
        const password = 'PLYTdemo2024!';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if exists
        const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log('User already exists.');
            process.exit(0);
        }

        const res = await pool.query(
            'INSERT INTO users (email, password_hash, role, plyt_balance) VALUES ($1, $2, $3, $4) RETURNING id, email',
            [email, hashedPassword, 'consumer', 1000]
        );
        console.log('User created:', res.rows[0]);
        console.log('Credentials:', { email, password });
        process.exit(0);
    } catch (e) {
        console.error('Seed Error:', e);
        process.exit(1);
    }
}

seed();
