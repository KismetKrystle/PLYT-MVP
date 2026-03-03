import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createAdmin(email: string, password: string) {
    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
            ['Admin', email, passwordHash, 'admin']
        );

        console.log('Admin user created successfully:');
        console.log(`  Email: ${result.rows[0].email}`);
        console.log(`  Role: ${result.rows[0].role}`);
        console.log(`  ID: ${result.rows[0].id}`);
    } catch (e: any) {
        console.error('Error creating admin:', e.message);
    } finally {
        await pool.end();
    }
}

const email = process.argv[2] || 'admin@plyt.local';
const password = process.argv[3] || 'admin123';

console.log('\nCreating admin user...');
console.log(`  Email: ${email}`);
createAdmin(email, password);
