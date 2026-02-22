const fs = require('fs');
const content = fs.readFileSync('src/config/system_prompt.md', 'utf-8');
const escapedContent = content.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const tsContent = `export const SYSTEM_INSTRUCTION = \`${escapedContent}\`;\n`;
fs.writeFileSync('src/config/system_prompt.ts', tsContent, 'utf-8');
console.log('Successfully wrote system_prompt.ts');
