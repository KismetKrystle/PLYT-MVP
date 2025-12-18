
import pool from '../db';

async function check() {
    try {
        console.log('Checking users table schema...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('Columns:', res.rows);
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

check();
