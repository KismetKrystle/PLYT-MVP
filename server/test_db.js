
require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
console.log('Original DATABASE_URL length:', dbUrl ? dbUrl.length : 'undefined');

// Mask password for logging
if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('Connecting to:', maskedUrl);
}

const pool = new Pool({
    connectionString: dbUrl,
});

async function testConnection() {
    try {
        console.log('Attempting to connect to database...');
        const client = await pool.connect();
        console.log('Typically connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        client.release();
        await pool.end();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConnection();
