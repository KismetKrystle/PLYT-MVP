import '../env';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Checking allowed_users table (gatekeeper)...');
        const result = await pool.query('SELECT id, username, created_at FROM allowed_users ORDER BY created_at DESC');

        if (result.rows.length === 0) {
            console.log('No gatekeeper users found');
            console.log('\nTo add gatekeeper users, run:');
            console.log('  npm run add-user youremail@example.com StrongPassword!');
        } else {
            console.log(`Found ${result.rows.length} gatekeeper user(s):`);
            result.rows.forEach(u => console.log(`  - ${u.username} (ID: ${u.id})`));
        }

        await pool.end();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

check();
