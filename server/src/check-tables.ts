import path from 'path';
import './env';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');

        const tableResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('\n📋 Tables in DB:');
        if (tableResult.rows.length === 0) {
            console.log('  ❌ No tables found!');
        } else {
            tableResult.rows.forEach(r => console.log(' -', r.table_name));
        }

        // Check allowed_users rows
        try {
            const au = await pool.query('SELECT id, username, created_at FROM allowed_users');
            console.log(`\n✅ allowed_users has ${au.rows.length} row(s):`);
            au.rows.forEach(r => console.log(`  - ${r.username} (id: ${r.id})`));
        } catch (e: any) {
            console.log('\n❌ allowed_users query failed:', e.message);
        }

        // Check users rows
        try {
            const u = await pool.query('SELECT id, email, role FROM users');
            console.log(`\n✅ users has ${u.rows.length} row(s):`);
            u.rows.forEach(r => console.log(`  - ${r.email} (role: ${r.role})`));
        } catch (e: any) {
            console.log('\n❌ users query failed:', e.message);
        }

    } catch (e: any) {
        console.error('Fatal error:', e.message);
    } finally {
        await pool.end();
    }
}

checkTables();
