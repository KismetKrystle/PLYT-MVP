import jwt from 'jsonwebtoken';
import '../env';
import pool from '../db';

console.log('--- JWT Diagnostic ---');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET value (hidden):', process.env.JWT_SECRET ? '******' : 'MISSING');

const testPayload = { id: 1, email: 'test@example.com' };
const secret = process.env.JWT_SECRET || 'fallback_secret';

try {
    const token = jwt.sign(testPayload, secret, { expiresIn: '1h' });
    console.log('Token Signed Successfully');

    jwt.verify(token, secret, (err) => {
        if (err) {
            console.error('Verification Failed IMMEDIATELY:', err.message);
        } else {
            console.log('Verification Successful with same secret instance');
        }
    });
} catch (e: any) {
    console.error('Encryption failed:', e.message);
}

console.log('--- DB Diagnostic ---');
pool.query('SELECT NOW()')
    .then(() => {
        console.log('DB Connection: OK');
        process.exit(0);
    })
    .catch((e) => {
        console.error('DB Connection: FAILED', e.message);
        process.exit(1);
    });
