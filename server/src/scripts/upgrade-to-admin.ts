import '../env';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function upgradeToAdmin(email: string, password: string) {
    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'UPDATE users SET role = $1, password_hash = $2 WHERE email = $3 RETURNING id, email, role',
            ['admin', passwordHash, email]
        );

        if (result.rows.length === 0) {
            console.log('User not found');
        } else {
            console.log('User upgraded to admin successfully:');
            console.log(`  Email: ${result.rows[0].email}`);
            console.log(`  Role: ${result.rows[0].role}`);
            console.log(`  ID: ${result.rows[0].id}`);
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

const email = process.argv[2] || 'kkwilsontech@gmail.com';
const password = process.argv[3] || 'ChangeMe123!';

console.log('\nUpgrading user to admin...');
console.log(`  Email: ${email}`);
upgradeToAdmin(email, password);
