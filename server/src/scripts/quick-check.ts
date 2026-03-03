import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Testing DB connection...');
        const connTest = await pool.query('SELECT NOW()');
        console.log('Database connected at:', connTest.rows[0].now);

        console.log('\nChecking users table...');
        const users = await pool.query('SELECT id, email, role FROM users');
        console.log(`Found ${users.rows.length} user(s):`);
        users.rows.forEach(u => console.log(`  - ${u.email} (role: ${u.role})`));

        console.log('\nChecking admin users...');
        const admins = await pool.query('SELECT id, email, role FROM users WHERE role = $1', ['admin']);
        console.log(`Found ${admins.rows.length} admin user(s):`);
        admins.rows.forEach(a => console.log(`  - ${a.email}`));

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

check();
