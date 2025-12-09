require('dotenv').config();
const { Client } = require('pg');
console.log('Connecting to:', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')); // Hide password
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
    .then(() => {
        console.log('SUCCESS: Connected to database.');
        client.end();
    })
    .catch(err => {
        console.error('ERROR FULL:', err);
        console.error('ERROR CODE:', err.code);
        console.error('ERROR ERRNO:', err.errno);
        console.error('ERROR SYSCALL:', err.syscall);
        console.error('ERROR HOST:', err.hostname);
        client.end();
    });
