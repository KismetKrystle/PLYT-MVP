import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../.env.local')
];

envPaths.forEach((envPath, index) => {
    if (!fs.existsSync(envPath)) {
        return;
    }

    dotenv.config({
        path: envPath,
        override: index > 0
    });
});
