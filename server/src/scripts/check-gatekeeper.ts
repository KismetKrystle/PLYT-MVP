import pool from '../db';

async function checkGatekeeper() {
    try {
        // 1. Check if table exists
        console.log('\n--- Checking allowed_users table ---');
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'allowed_users'
            ) AS exists;
        `);
        const tableExists = tableCheck.rows[0].exists;
        console.log('Table exists:', tableExists);

        if (!tableExists) {
            console.log('\n❌ Table does not exist. Please run: npm run create-allowed-users\n');
            process.exit(0);
        }

        // 2. Show all rows (without hashed passwords)
        const users = await pool.query('SELECT id, username, created_at FROM allowed_users ORDER BY created_at DESC');
        console.log(`\n✅ Found ${users.rows.length} allowed user(s):`);

        if (users.rows.length === 0) {
            console.log('   (none)\n❌ No users found. Run: npm run add-user <username> <password>\n');
        } else {
            users.rows.forEach(row => {
                console.log(`   - ${row.username} (added: ${row.created_at})`);
            });
            console.log('');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

checkGatekeeper();
