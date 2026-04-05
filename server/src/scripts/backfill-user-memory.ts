import '../env';
import pool from '../db';
import {
    ensureUserMemorySchema,
    refreshUserMemory
} from '../services/userMemory';

type UserRow = {
    id: string | number;
    role: string | null;
    profile_data: Record<string, any> | null;
};

async function insertEventIfMissing(
    userId: string | number,
    eventType: string,
    sourceTable: string,
    sourceId: string,
    payload: Record<string, any>
) {
    await pool.query(
        `INSERT INTO user_memory_events (user_id, event_type, source_table, source_id, payload)
         SELECT $1, $2, $3, $4, $5::jsonb
         WHERE NOT EXISTS (
             SELECT 1
             FROM user_memory_events
             WHERE user_id = $1
               AND event_type = $2
               AND COALESCE(source_table, '') = COALESCE($3, '')
               AND COALESCE(source_id, '') = COALESCE($4, '')
         )`,
        [userId, eventType, sourceTable, sourceId, JSON.stringify(payload)]
    );
}

function normalizeFavoriteChats(profileData: Record<string, any> | null | undefined) {
    const favoriteChats = Array.isArray(profileData?.favorite_chats) ? profileData.favorite_chats : [];
    return favoriteChats
        .map((entry) => {
            if (typeof entry === 'string') {
                return {
                    id: entry,
                    title: 'Saved Chat',
                    updated_at: null,
                    saved_at: null
                };
            }

            if (!entry || typeof entry !== 'object') {
                return null;
            }

            return {
                id: String((entry as any).id || '').trim(),
                title: String((entry as any).title || 'Saved Chat').trim() || 'Saved Chat',
                updated_at: (entry as any).updated_at || null,
                saved_at: (entry as any).saved_at || null
            };
        })
        .filter((entry): entry is { id: string; title: string; updated_at: string | null; saved_at: string | null } => Boolean(entry?.id));
}

async function backfillUser(user: UserRow) {
    const userId = user.id;
    const userRole = String(user.role || 'consumer');
    const profileData = user.profile_data && typeof user.profile_data === 'object' ? user.profile_data : {};

    const [favoritePlacesRes, placeVisitsRes, libraryItemsRes] = await Promise.all([
        pool.query(
            `SELECT
                uf.place_profile_id,
                pp.name,
                pp.place_kind,
                COALESCE(
                    pp.profile_data->>'address',
                    pp.profile_data->>'formatted_address',
                    uf.saved_place_data->>'address',
                    ''
                ) AS address
             FROM user_place_favorites uf
             JOIN place_profiles pp ON pp.id = uf.place_profile_id
             WHERE uf.user_id = $1`,
            [userId]
        ),
        pool.query(
            `SELECT
                pv.id,
                pv.meal_name,
                pv.body_response,
                pv.rating,
                pp.name,
                pp.place_kind,
                COALESCE(
                    pp.profile_data->>'address',
                    pp.profile_data->>'formatted_address',
                    pv.profile_data->>'address',
                    ''
                ) AS address
             FROM place_visits pv
             JOIN place_profiles pp ON pp.id = pv.place_profile_id
             WHERE pv.user_id = $1`,
            [userId]
        ),
        pool.query(
            `SELECT id, title, source, tags
             FROM profile_items
             WHERE user_id = $1`,
            [userId]
        )
    ]);

    for (const row of favoritePlacesRes.rows) {
        await insertEventIfMissing(
            userId,
            'place_favorited',
            'user_place_favorites',
            String(row.place_profile_id),
            {
                place_name: String(row.name || ''),
                place_kind: String(row.place_kind || ''),
                address: String(row.address || '')
            }
        );
    }

    for (const row of placeVisitsRes.rows) {
        await insertEventIfMissing(
            userId,
            'place_visit_logged',
            'place_visits',
            String(row.id),
            {
                place_name: String(row.name || ''),
                place_kind: String(row.place_kind || ''),
                address: String(row.address || ''),
                meal_name: String(row.meal_name || ''),
                body_response: String(row.body_response || ''),
                rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : null
            }
        );
    }

    for (const entry of normalizeFavoriteChats(profileData)) {
        await insertEventIfMissing(
            userId,
            'chat_favorited',
            'conversations',
            entry.id,
            {
                title: entry.title,
                updated_at: entry.updated_at,
                saved_at: entry.saved_at
            }
        );
    }

    for (const row of libraryItemsRes.rows) {
        await insertEventIfMissing(
            userId,
            'library_item_saved',
            'profile_items',
            String(row.id),
            {
                title: String(row.title || ''),
                source: row.source ? String(row.source) : null,
                tags: Array.isArray(row.tags) ? row.tags : []
            }
        );
    }

    await refreshUserMemory(pool, userId, userRole);

    return {
        favoritePlaces: favoritePlacesRes.rows.length,
        placeVisits: placeVisitsRes.rows.length,
        favoriteChats: normalizeFavoriteChats(profileData).length,
        libraryItems: libraryItemsRes.rows.length
    };
}

async function main() {
    await ensureUserMemorySchema(pool);

    const usersRes = await pool.query(
        `SELECT id, role, profile_data
         FROM users
         ORDER BY created_at ASC`
    );

    console.log(`Backfilling user memory for ${usersRes.rows.length} users...`);

    for (const user of usersRes.rows as UserRow[]) {
        const summary = await backfillUser(user);
        console.log(
            `Backfilled user ${user.id}: ` +
            `${summary.favoritePlaces} favorite places, ` +
            `${summary.placeVisits} visits, ` +
            `${summary.favoriteChats} favorite chats, ` +
            `${summary.libraryItems} library items`
        );
    }

    console.log('User memory backfill complete.');
}

main()
    .catch((error) => {
        console.error('User memory backfill failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
