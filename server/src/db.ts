import { Pool } from 'pg';
import './env';

const databaseUrl = process.env.DATABASE_URL;
const isLocalRuntime = process.env.NODE_ENV !== 'production';
const isRemoteDatabase =
    !!databaseUrl &&
    !databaseUrl.includes('localhost') &&
    !databaseUrl.includes('127.0.0.1');

if (isLocalRuntime && isRemoteDatabase) {
    console.warn(
        '[db]: Local server is using a remote DATABASE_URL. Confirm this points to a dev or beta database, not your main production data.'
    );
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
