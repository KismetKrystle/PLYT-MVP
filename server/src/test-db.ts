import { Client } from 'pg';
import './env';

const testConnection = async () => {
    console.log('Testing connection to:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('SUCCESS: Connected to database');
        const res = await client.query('SELECT NOW()');
        console.log('Query success:', res.rows[0]);
        await client.end();
    } catch (err: any) {
        console.error('FAILURE: Could not connect');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.stack) console.error('Stack trace:', err.stack);
    }
};

testConnection();
