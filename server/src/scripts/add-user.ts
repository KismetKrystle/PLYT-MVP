import pool from '../db';
import bcrypt from 'bcrypt';

async function addUser() {
    const args = process.argv.slice(2);

    if (args.length !== 2) {
        console.error('Usage: npm run add-user <email> <password>');
        process.exit(1);
    }

    const email = args[0].toLowerCase().trim();
    const password = args[1];

    try {
        console.log(`Adding / Updating gatekeeper user: ${email}...`);

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert or update
        // We use ON CONFLICT to allow updating passwords for existing emails easily
        const query = `
            INSERT INTO allowed_users (email, hashed_password) 
            VALUES ($1, $2)
            ON CONFLICT (email) 
            DO UPDATE SET hashed_password = EXCLUDED.hashed_password
            RETURNING id, email;
        `;

        const result = await pool.query(query, [email, hashedPassword]);

        console.log('✅ Successfully configured gatekeeper access for:', result.rows[0].email);

    } catch (error) {
        console.error('❌ Error adding user:', error);
    } finally {
        await pool.end();
    }
}

addUser();
