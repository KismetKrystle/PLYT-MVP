import path from 'path';
import '../env';
import pool from '../db';

async function check() {
    try {
        const convs = await pool.query('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Conversations:');
        console.table(convs.rows);

        const users = await pool.query('SELECT id, email, role FROM users LIMIT 10');
        console.log('Registered Users:');
        console.table(users.rows);
        process.exit(0);
    } catch (e) {
        console.error('DB Error:', e);
        process.exit(1);
    }
}

check();
