import '../env';
import pool from '../db';
import {
    buildRelevantMemoryPromptSection,
    buildUserMemoryContext,
    ensureUserMemorySchema
} from '../services/userMemory';

async function main() {
    const [, , userIdArg, roleArg, ...queryParts] = process.argv;
    const userId = String(userIdArg || '').trim();
    const role = String(roleArg || 'consumer').trim() || 'consumer';
    const query = queryParts.join(' ').trim();

    if (!userId) {
        throw new Error('Usage: ts-node src/scripts/inspect-user-memory.ts <userId> [role] [query]');
    }

    await ensureUserMemorySchema(pool);
    const memory = await buildUserMemoryContext(userId, role);
    const promptSection = query
        ? await buildRelevantMemoryPromptSection(userId, query, role)
        : '';

    console.log(JSON.stringify({
        userId,
        role,
        query: query || null,
        promptSection,
        memory
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('Inspect user memory failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
