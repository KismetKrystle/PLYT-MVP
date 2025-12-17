
require('dotenv').config();
const fs = require('fs');

const dbUrl = process.env.DATABASE_URL;
fs.writeFileSync('debug_env.txt', `URL: [${dbUrl}]\nLength: ${dbUrl ? dbUrl.length : 0}`);
console.log('Done writing debug_env.txt');
