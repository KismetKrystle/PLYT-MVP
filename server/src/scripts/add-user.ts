import pool from '../db';
import bcrypt from 'bcrypt';

async function addUser() {
    const args = process.argv.slice(2);

    if (args.length !== 2) {
        console.error('Usage: npm run add-user <username> <password>');
        process.exit(1);
    }

    const username = args[0].toLowerCase().trim();
    const password = args[1];

    try {
        console.log(`Adding / Updating gatekeeper user: ${username}...`);

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert or update — ON CONFLICT allows updating passwords for existing usernames
        const query = `
            INSERT INTO allowed_users (username, hashed_password) 
            VALUES ($1, $2)
            ON CONFLICT (username) 
            DO UPDATE SET hashed_password = EXCLUDED.hashed_password
            RETURNING id, username;
        `;

        const result = await pool.query(query, [username, hashedPassword]);

        console.log('✅ Successfully configured gatekeeper access for:', result.rows[0].username);

    } catch (error) {
        console.error('❌ Error adding user:', error);
    } finally {
        await pool.end();
    }
}

addUser();
