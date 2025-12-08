import pool from './db';
import fs from 'fs';
import path from 'path';

const migrate = async () => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
        console.log('Running migrations...');
        await pool.query(schema);
        console.log('Migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error running migrations:', err);
        process.exit(1);
    }
};

migrate();
