import fs from 'fs';
import path from 'path';

export const SYSTEM_INSTRUCTION = fs.readFileSync(path.join(__dirname, 'system_prompt.md'), 'utf-8');
