import type { PoolClient } from 'pg';
import pool from '../db';

let placeProfileSchemaReady: Promise<void> | null = null;
const ALLOWED_PLACE_KINDS = new Set([
    'restaurant',
    'cafe',
    'juice_bar',
    'natural_food_store',
    'grocery',
    'farm_stand',
    'prepared_food',
    'farm',
    'distributor',
    'other'
]);

async function getUsersIdType(client: PoolClient) {
    const usersIdTypeRes = await client.query(`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
        LIMIT 1
    `);

    return usersIdTypeRes.rows[0]?.data_type === 'uuid' ? 'UUID' : 'INTEGER';
}

export async function ensurePlaceProfileSchema(client?: PoolClient) {
    if (!placeProfileSchemaReady) {
        placeProfileSchemaReady = (async () => {
            const localClient = client || await pool.connect();
            const shouldRelease = !client;

            try {
                const usersIdType = await getUsersIdType(localClient);

                await localClient.query(`
                    CREATE TABLE IF NOT EXISTS place_profiles (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        external_source TEXT NOT NULL DEFAULT 'google_places',
                        external_place_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        place_kind TEXT NOT NULL DEFAULT 'restaurant',
                        network_status TEXT NOT NULL DEFAULT 'not_on_network',
                        owner_user_id ${usersIdType} REFERENCES users(id) ON DELETE SET NULL,
                        created_by_user_id ${usersIdType} REFERENCES users(id) ON DELETE SET NULL,
                        claimed_at TIMESTAMP NULL,
                        save_count INTEGER NOT NULL DEFAULT 0,
                        feedback_count INTEGER NOT NULL DEFAULT 0,
                        average_rating NUMERIC(4, 2) NOT NULL DEFAULT 0,
                        profile_data JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE (external_source, external_place_id)
                    );
                `);

                await localClient.query(`
                    CREATE TABLE IF NOT EXISTS user_place_favorites (
                        user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                        place_profile_id UUID REFERENCES place_profiles(id) ON DELETE CASCADE,
                        saved_place_data JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        PRIMARY KEY (user_id, place_profile_id)
                    );
                `);

                await localClient.query(`
                    CREATE TABLE IF NOT EXISTS place_profile_feedback (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        place_profile_id UUID REFERENCES place_profiles(id) ON DELETE CASCADE,
                        user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                        rating INTEGER,
                        feedback TEXT,
                        body_response TEXT,
                        tasted_well BOOLEAN,
                        would_repeat BOOLEAN,
                        keep_as_favorite BOOLEAN,
                        profile_data JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE (place_profile_id, user_id)
                    );
                `);

                await localClient.query(`
                    CREATE TABLE IF NOT EXISTS place_visits (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        place_profile_id UUID REFERENCES place_profiles(id) ON DELETE CASCADE,
                        user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                        visited_at TIMESTAMP NULL,
                        meal_name TEXT,
                        meal_notes TEXT,
                        rating INTEGER,
                        body_response TEXT,
                        liked_it BOOLEAN,
                        would_repeat BOOLEAN,
                        keep_as_favorite BOOLEAN,
                        profile_data JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                `);

                await localClient.query(`
                    ALTER TABLE place_profiles
                    ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0;
                `);
            } finally {
                if (shouldRelease) localClient.release();
            }
        })().catch((error) => {
            placeProfileSchemaReady = null;
            throw error;
        });
    }

    return placeProfileSchemaReady;
}

export function inferPlaceKind(place: any) {
    const explicitKind = String(place?.place_kind || place?.kind || '').trim().toLowerCase();
    if (ALLOWED_PLACE_KINDS.has(explicitKind)) {
        return explicitKind;
    }

    const haystack = [
        place?.name,
        place?.title,
        place?.address,
        place?.website,
        Array.isArray(place?.types) ? place.types.join(' ') : '',
        place?.notes
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (/(juice|smoothie|tonic|elixir)/.test(haystack)) return 'juice_bar';
    if (/(cafe|coffee)/.test(haystack)) return 'cafe';
    if (/(natural food|organic store|health store|wholefood)/.test(haystack)) return 'natural_food_store';
    if (/(grocery|grocer|market|co-op|coop)/.test(haystack)) return 'grocery';
    if (/(farm stand|stand)/.test(haystack)) return 'farm_stand';
    if (/(farm|farmer|orchard|grower|nursery|hydroponic|agro)/.test(haystack)) return 'farm';
    if (/(distributor|distribution|wholesale|supplier)/.test(haystack)) return 'distributor';
    return 'restaurant';
}

export function normalizeManagedPlaceKind(value: string | null | undefined) {
    const normalized = String(value || '').trim().toLowerCase();
    return ALLOWED_PLACE_KINDS.has(normalized) ? normalized : 'other';
}

function combineMenuContext(profileData: any) {
    const baseContext = typeof profileData?.menu_context === 'string' ? profileData.menu_context.trim() : '';
    const sourceContext = Array.isArray(profileData?.menu_sources)
        ? profileData.menu_sources
            .map((source: any) => {
                const name = String(source?.name || '').trim();
                const excerpt = String(source?.excerpt || '').trim();
                if (!excerpt) return '';
                return name ? `${name}: ${excerpt}` : excerpt;
            })
            .filter(Boolean)
            .join('\n\n')
        : '';

    return [baseContext, sourceContext].filter(Boolean).join('\n\n').trim();
}

function normalizeRawInventoryItems(profileData: any) {
    if (!Array.isArray(profileData?.raw_inventory_items)) {
        return [];
    }

    return profileData.raw_inventory_items
        .map((item: any, index: number) => ({
            id: String(item?.id || `inventory-${index + 1}`).trim() || `inventory-${index + 1}`,
            name: String(item?.name || '').trim(),
            detail: String(item?.detail || '').trim()
        }))
        .filter((item: { name: string; detail: string }) => item.name || item.detail);
}

function combineRawInventoryContext(profileData: any) {
    const baseContext = typeof profileData?.raw_inventory_context === 'string'
        ? profileData.raw_inventory_context.trim()
        : '';
    const itemContext = normalizeRawInventoryItems(profileData)
        .map((item: { name: string; detail: string }) => item.detail ? `${item.name}: ${item.detail}` : item.name)
        .filter(Boolean)
        .join('\n');

    return [baseContext, itemContext].filter(Boolean).join('\n').trim();
}

function countMatches(text: string, queries: string[]) {
    const haystack = text.toLowerCase();
    return queries.reduce((score, query) => (haystack.includes(query) ? score + 1 : score), 0);
}

function hasProduceIntent(queries: string[]) {
    return queries.some((query) => /(ingredient|ingredients|produce|vegetable|vegetables|fruit|fruits|grocery|grocer|market|farm|farm stand|recipe|cook|cooking|meal prep|smoothie|juice|herb|spice)/.test(query));
}

function computePlaceSearchPriority(place: any, queries: string[]) {
    const normalizedQueries = queries
        .map((query) => String(query || '').trim().toLowerCase())
        .filter(Boolean);

    if (normalizedQueries.length === 0) {
        return 0;
    }

    const inventoryContext = String(place?.raw_inventory_context || '').trim();
    const menuContext = String(place?.menu_context || '').trim();
    const name = String(place?.name || '').trim();
    const address = String(place?.address || '').trim();

    let score = 0;
    score += countMatches(name, normalizedQueries) * 6;
    score += countMatches(address, normalizedQueries) * 2;
    score += countMatches(menuContext, normalizedQueries) * 4;
    score += countMatches(inventoryContext, normalizedQueries) * 8;

    if (inventoryContext && hasProduceIntent(normalizedQueries)) {
        score += 18;
    }

    if (inventoryContext && /(farm|farm_stand|grocery|natural_food_store|distributor)/.test(String(place?.place_kind || ''))) {
        score += 6;
    }

    return score;
}

function toSearchablePlaceResult(row: any) {
    const profileData = row?.profile_data || {};
    const googleMetadata = profileData?.google_metadata || {};
    const rawInventoryItems = normalizeRawInventoryItems(profileData);

    return {
        id: row.external_source === 'plyt_manual' ? String(row.id) : String(row.external_place_id || row.id),
        place_profile_id: String(row.id),
        name: row.name,
        address: String(profileData?.address || googleMetadata?.address || ''),
        phone: String(profileData?.phone || googleMetadata?.phone || ''),
        rating: Number.isFinite(Number(googleMetadata?.rating))
            ? Number(googleMetadata.rating)
            : (Number.isFinite(Number(row.average_rating)) ? Number(row.average_rating) : null),
        reviewsCount: Number.isFinite(Number(googleMetadata?.reviewsCount))
            ? Number(googleMetadata.reviewsCount)
            : (Number.isFinite(Number(row.feedback_count)) ? Number(row.feedback_count) : 0),
        website: String(profileData?.website || googleMetadata?.website || ''),
        mapsUrl: String(profileData?.mapsUrl || googleMetadata?.mapsUrl || ''),
        image: profileData?.image || googleMetadata?.image || null,
        distance_km: null,
        place_kind: row.place_kind,
        network_status: row.network_status,
        menu_context: combineMenuContext(profileData),
        raw_inventory_context: combineRawInventoryContext(profileData),
        raw_inventory_items: rawInventoryItems,
        search_priority: 0
    };
}

export function normalizePlaceProfileInput(place: any) {
    const externalPlaceId = String(place?.id || place?.placeId || place?.google_place_id || '').trim();
    const name = String(place?.name || place?.title || '').trim();

    if (!externalPlaceId || !name) {
        throw new Error('INVALID_PLACE_INPUT');
    }

    const placeKind = inferPlaceKind(place);
    const note = 'This place is not yet on the Plyant network. Its profile was created from Google place data and community saves, and it can be reviewed by admin until the owner claims it.';

    return {
        external_source: 'google_places',
        external_place_id: externalPlaceId,
        name,
        place_kind: placeKind,
        network_status: 'not_on_network',
        profile_data: {
            name,
            place_kind: placeKind,
            is_on_network: false,
            pending_claim: true,
            source: 'google_places',
            not_on_network_note: note,
            google_metadata: {
                address: place?.address || '',
                phone: place?.phone || '',
                website: place?.website || '',
                mapsUrl: place?.mapsUrl || '',
                image: place?.image || null,
                rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating) : null,
                reviewsCount: Number.isFinite(Number(place?.reviewsCount)) ? Number(place.reviewsCount) : 0,
                distance_km: Number.isFinite(Number(place?.distance_km)) ? Number(place.distance_km) : null
            }
        },
        saved_place_data: {
            id: externalPlaceId,
            name,
            title: place?.title ? String(place.title) : undefined,
            address: place?.address ? String(place.address) : undefined,
            city: place?.city ? String(place.city) : undefined,
            location: place?.location ? String(place.location) : undefined,
            mapsUrl: place?.mapsUrl ? String(place.mapsUrl) : undefined,
            image: place?.image ? String(place.image) : undefined,
            notes: place?.notes ? String(place.notes) : undefined,
            website: place?.website ? String(place.website) : undefined,
            phone: place?.phone ? String(place.phone) : undefined,
            rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating) : undefined,
            reviewsCount: Number.isFinite(Number(place?.reviewsCount)) ? Number(place.reviewsCount) : undefined,
            distance_km: Number.isFinite(Number(place?.distance_km)) ? Number(place.distance_km) : undefined,
            place_kind: placeKind,
            saved_at: new Date().toISOString()
        }
    };
}

function toUserFavoritePlace(row: any) {
    const profileData = row?.profile_data || {};
    const googleMetadata = profileData?.google_metadata || {};
    const savedPlaceData = row?.saved_place_data || {};

    return {
        id: String(savedPlaceData?.id || row?.external_place_id || row?.place_profile_id || '').trim(),
        place_profile_id: String(row?.place_profile_id || row?.id || '').trim(),
        external_source: String(row?.external_source || 'google_places'),
        external_place_id: String(row?.external_place_id || '').trim(),
        name: String(savedPlaceData?.name || row?.name || '').trim(),
        title: savedPlaceData?.title ? String(savedPlaceData.title).trim() : undefined,
        address: String(savedPlaceData?.address || profileData?.address || googleMetadata?.address || '').trim(),
        city: savedPlaceData?.city ? String(savedPlaceData.city).trim() : undefined,
        location: savedPlaceData?.location ? String(savedPlaceData.location).trim() : undefined,
        mapsUrl: String(savedPlaceData?.mapsUrl || profileData?.mapsUrl || googleMetadata?.mapsUrl || '').trim(),
        image: savedPlaceData?.image || profileData?.image || googleMetadata?.image || null,
        notes: savedPlaceData?.notes ? String(savedPlaceData.notes).trim() : undefined,
        website: String(savedPlaceData?.website || profileData?.website || googleMetadata?.website || '').trim(),
        phone: String(savedPlaceData?.phone || profileData?.phone || googleMetadata?.phone || '').trim(),
        rating: Number.isFinite(Number(savedPlaceData?.rating))
            ? Number(savedPlaceData.rating)
            : (Number.isFinite(Number(googleMetadata?.rating)) ? Number(googleMetadata.rating) : null),
        reviewsCount: Number.isFinite(Number(savedPlaceData?.reviewsCount))
            ? Number(savedPlaceData.reviewsCount)
            : (Number.isFinite(Number(googleMetadata?.reviewsCount)) ? Number(googleMetadata.reviewsCount) : 0),
        distance_km: Number.isFinite(Number(savedPlaceData?.distance_km))
            ? Number(savedPlaceData.distance_km)
            : (Number.isFinite(Number(googleMetadata?.distance_km)) ? Number(googleMetadata.distance_km) : null),
        place_kind: String(row?.place_kind || savedPlaceData?.place_kind || inferPlaceKind(savedPlaceData || row)),
        network_status: String(row?.network_status || 'not_on_network'),
        save_count: Number.isFinite(Number(row?.save_count)) ? Number(row.save_count) : 0,
        visit_count: Number.isFinite(Number(row?.visit_count)) ? Number(row.visit_count) : 0,
        feedback_count: Number.isFinite(Number(row?.feedback_count)) ? Number(row.feedback_count) : 0,
        average_rating: Number.isFinite(Number(row?.average_rating)) ? Number(row.average_rating) : 0,
        saved_at: String(savedPlaceData?.saved_at || row?.favorite_created_at || row?.favorite_updated_at || ''),
        created_at: row?.favorite_created_at || null,
        updated_at: row?.favorite_updated_at || null
    };
}

function toPlaceVisit(row: any) {
    return {
        id: String(row?.id || '').trim(),
        place_profile_id: String(row?.place_profile_id || '').trim(),
        user_id: row?.user_id ?? null,
        visited_at: row?.visited_at || null,
        meal_name: row?.meal_name ? String(row.meal_name).trim() : '',
        meal_notes: row?.meal_notes ? String(row.meal_notes).trim() : '',
        rating: Number.isFinite(Number(row?.rating)) ? Number(row.rating) : null,
        body_response: row?.body_response ? String(row.body_response).trim() : '',
        liked_it: typeof row?.liked_it === 'boolean' ? row.liked_it : null,
        would_repeat: typeof row?.would_repeat === 'boolean' ? row.would_repeat : null,
        keep_as_favorite: typeof row?.keep_as_favorite === 'boolean' ? row.keep_as_favorite : null,
        profile_data: row?.profile_data && typeof row.profile_data === 'object' ? row.profile_data : {},
        created_at: row?.created_at || null,
        updated_at: row?.updated_at || null
    };
}

async function refreshPlaceProfileAggregates(client: PoolClient, placeProfileId: string) {
    const countsResult = await client.query(
        `SELECT
            (SELECT COUNT(*)::int FROM user_place_favorites WHERE place_profile_id = $1) AS save_count,
            (SELECT COUNT(*)::int FROM place_visits WHERE place_profile_id = $1) AS visit_count,
            (SELECT COUNT(*)::int FROM place_profile_feedback WHERE place_profile_id = $1) AS feedback_count,
            CASE
                WHEN (SELECT COUNT(*)::int FROM place_visits WHERE place_profile_id = $1 AND rating IS NOT NULL) > 0
                    THEN (SELECT COALESCE(AVG(rating), 0)::numeric(4,2) FROM place_visits WHERE place_profile_id = $1 AND rating IS NOT NULL)
                ELSE (SELECT COALESCE(AVG(rating), 0)::numeric(4,2) FROM place_profile_feedback WHERE place_profile_id = $1 AND rating IS NOT NULL)
            END AS average_rating`,
        [placeProfileId]
    );

    const counts = countsResult.rows[0] || {};

    await client.query(
        `UPDATE place_profiles
         SET save_count = $1,
             visit_count = $2,
             feedback_count = $3,
             average_rating = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
            counts.save_count || 0,
            counts.visit_count || 0,
            counts.feedback_count || 0,
            Number(counts.average_rating || 0),
            placeProfileId
        ]
    );
}

export async function upsertPlaceProfileFromFavorite(client: PoolClient, userId: string | number, place: any) {
    await ensurePlaceProfileSchema(client);

    const normalized = normalizePlaceProfileInput(place);

    const upsertResult = await client.query(
        `INSERT INTO place_profiles (
            external_source,
            external_place_id,
            name,
            place_kind,
            network_status,
            created_by_user_id,
            profile_data
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (external_source, external_place_id)
         DO UPDATE SET
            name = EXCLUDED.name,
            place_kind = EXCLUDED.place_kind,
            profile_data = COALESCE(place_profiles.profile_data, '{}'::jsonb) || EXCLUDED.profile_data,
            updated_at = NOW()
         RETURNING *`,
        [
            normalized.external_source,
            normalized.external_place_id,
            normalized.name,
            normalized.place_kind,
            normalized.network_status,
            userId,
            JSON.stringify(normalized.profile_data)
        ]
    );

    const placeProfile = upsertResult.rows[0];

    await client.query(
        `INSERT INTO user_place_favorites (user_id, place_profile_id, saved_place_data)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, place_profile_id)
         DO UPDATE SET saved_place_data = EXCLUDED.saved_place_data, updated_at = NOW()`,
        [userId, placeProfile.id, JSON.stringify(normalized.saved_place_data)]
    );

    await refreshPlaceProfileAggregates(client, String(placeProfile.id));

    const refreshed = await client.query(
        `SELECT * FROM place_profiles WHERE id = $1 LIMIT 1`,
        [placeProfile.id]
    );

    return refreshed.rows[0];
}

export async function removePlaceFavorite(client: PoolClient, userId: string | number, placeIdentity: string) {
    await ensurePlaceProfileSchema(client);

    const profileResult = await client.query(
        `SELECT pp.id
         FROM place_profiles pp
         WHERE pp.external_place_id = $1
            OR pp.id::text = $1
            OR pp.profile_data->'google_metadata'->>'mapsUrl' = $1
            OR pp.name = $1
         LIMIT 1`,
        [placeIdentity]
    );

    if (profileResult.rows.length === 0) {
        return null;
    }

    const placeProfileId = String(profileResult.rows[0].id);

    await client.query(
        `DELETE FROM user_place_favorites
         WHERE user_id = $1 AND place_profile_id = $2`,
        [userId, placeProfileId]
    );

    await refreshPlaceProfileAggregates(client, placeProfileId);

    const refreshed = await client.query(
        `SELECT * FROM place_profiles WHERE id = $1 LIMIT 1`,
        [placeProfileId]
    );

    return refreshed.rows[0] || null;
}

export async function listUserFavoritePlaces(userId: string | number, client?: PoolClient) {
    await ensurePlaceProfileSchema(client);

    const localClient: any = client || pool;
    const result = await localClient.query(
        `SELECT
            pp.id AS place_profile_id,
            pp.external_source,
            pp.external_place_id,
            pp.name,
            pp.place_kind,
            pp.network_status,
            pp.save_count,
            pp.visit_count,
            pp.feedback_count,
            pp.average_rating,
            pp.profile_data,
            uf.saved_place_data,
            uf.created_at AS favorite_created_at,
            uf.updated_at AS favorite_updated_at
         FROM user_place_favorites uf
         INNER JOIN place_profiles pp ON pp.id = uf.place_profile_id
         WHERE uf.user_id = $1
         ORDER BY uf.updated_at DESC, uf.created_at DESC`,
        [userId]
    );

    return result.rows.map((row: any) => toUserFavoritePlace(row));
}

export async function listUserPlaceVisits(placeProfileId: string, userId: string | number, client?: PoolClient) {
    await ensurePlaceProfileSchema(client);

    const localClient: any = client || pool;
    const result = await localClient.query(
        `SELECT id, place_profile_id, user_id, visited_at, meal_name, meal_notes, rating, body_response, liked_it, would_repeat, keep_as_favorite, profile_data, created_at, updated_at
         FROM place_visits
         WHERE place_profile_id = $1 AND user_id = $2
         ORDER BY COALESCE(visited_at, updated_at, created_at) DESC, updated_at DESC, created_at DESC`,
        [placeProfileId, userId]
    );

    return result.rows.map((row: any) => toPlaceVisit(row));
}

export async function createUserPlaceVisit(client: PoolClient, placeProfileId: string, userId: string | number, visit: any) {
    await ensurePlaceProfileSchema(client);

    const profileExists = await client.query(
        `SELECT id FROM place_profiles WHERE id = $1 LIMIT 1`,
        [placeProfileId]
    );

    if (profileExists.rows.length === 0) {
        throw new Error('PLACE_PROFILE_NOT_FOUND');
    }

    const visitedAt = typeof visit?.visited_at === 'string' && visit.visited_at.trim()
        ? visit.visited_at.trim()
        : null;

    const result = await client.query(
        `INSERT INTO place_visits (
            place_profile_id,
            user_id,
            visited_at,
            meal_name,
            meal_notes,
            rating,
            body_response,
            liked_it,
            would_repeat,
            keep_as_favorite,
            profile_data,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
         RETURNING id, place_profile_id, user_id, visited_at, meal_name, meal_notes, rating, body_response, liked_it, would_repeat, keep_as_favorite, profile_data, created_at, updated_at`,
        [
            placeProfileId,
            userId,
            visitedAt,
            typeof visit?.meal_name === 'string' ? visit.meal_name.trim() : null,
            typeof visit?.meal_notes === 'string' ? visit.meal_notes.trim() : null,
            Number.isFinite(Number(visit?.rating)) ? Number(visit.rating) : null,
            typeof visit?.body_response === 'string' ? visit.body_response.trim() : null,
            typeof visit?.liked_it === 'boolean' ? visit.liked_it : null,
            typeof visit?.would_repeat === 'boolean' ? visit.would_repeat : null,
            typeof visit?.keep_as_favorite === 'boolean' ? visit.keep_as_favorite : null,
            JSON.stringify(visit?.profile_data && typeof visit.profile_data === 'object' ? visit.profile_data : {})
        ]
    );

    await refreshPlaceProfileAggregates(client, placeProfileId);

    return toPlaceVisit(result.rows[0]);
}

export async function updateUserPlaceVisit(client: PoolClient, visitId: string, userId: string | number, visit: any) {
    await ensurePlaceProfileSchema(client);

    const currentResult = await client.query(
        `SELECT id, place_profile_id
         FROM place_visits
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [visitId, userId]
    );

    if (currentResult.rows.length === 0) {
        throw new Error('PLACE_VISIT_NOT_FOUND');
    }

    const current = currentResult.rows[0];
    const visitedAt = typeof visit?.visited_at === 'string' && visit.visited_at.trim()
        ? visit.visited_at.trim()
        : null;

    const result = await client.query(
        `UPDATE place_visits
         SET visited_at = $1,
             meal_name = $2,
             meal_notes = $3,
             rating = $4,
             body_response = $5,
             liked_it = $6,
             would_repeat = $7,
             keep_as_favorite = $8,
             profile_data = $9::jsonb,
             updated_at = NOW()
         WHERE id = $10 AND user_id = $11
         RETURNING id, place_profile_id, user_id, visited_at, meal_name, meal_notes, rating, body_response, liked_it, would_repeat, keep_as_favorite, profile_data, created_at, updated_at`,
        [
            visitedAt,
            typeof visit?.meal_name === 'string' ? visit.meal_name.trim() : null,
            typeof visit?.meal_notes === 'string' ? visit.meal_notes.trim() : null,
            Number.isFinite(Number(visit?.rating)) ? Number(visit.rating) : null,
            typeof visit?.body_response === 'string' ? visit.body_response.trim() : null,
            typeof visit?.liked_it === 'boolean' ? visit.liked_it : null,
            typeof visit?.would_repeat === 'boolean' ? visit.would_repeat : null,
            typeof visit?.keep_as_favorite === 'boolean' ? visit.keep_as_favorite : null,
            JSON.stringify(visit?.profile_data && typeof visit.profile_data === 'object' ? visit.profile_data : {}),
            visitId,
            userId
        ]
    );

    await refreshPlaceProfileAggregates(client, String(current.place_profile_id));

    return toPlaceVisit(result.rows[0]);
}

export async function deleteUserPlaceVisit(client: PoolClient, visitId: string, userId: string | number) {
    await ensurePlaceProfileSchema(client);

    const result = await client.query(
        `DELETE FROM place_visits
         WHERE id = $1 AND user_id = $2
         RETURNING id, place_profile_id, user_id, visited_at, meal_name, meal_notes, rating, body_response, liked_it, would_repeat, keep_as_favorite, profile_data, created_at, updated_at`,
        [visitId, userId]
    );

    if (result.rows.length === 0) {
        throw new Error('PLACE_VISIT_NOT_FOUND');
    }

    const deletedVisit = toPlaceVisit(result.rows[0]);
    await refreshPlaceProfileAggregates(client, String(deletedVisit.place_profile_id));
    return deletedVisit;
}

export async function getPlaceProfileByExternalId(externalPlaceId: string) {
    await ensurePlaceProfileSchema();
    const result = await pool.query(
        `SELECT * FROM place_profiles
         WHERE external_place_id = $1
         LIMIT 1`,
        [externalPlaceId]
    );
    return result.rows[0] || null;
}

export async function getPlaceProfileById(placeProfileId: string) {
    await ensurePlaceProfileSchema();
    const result = await pool.query(
        `SELECT * FROM place_profiles
         WHERE id = $1
         LIMIT 1`,
        [placeProfileId]
    );
    return result.rows[0] || null;
}

export async function listPlaceFeedback(placeProfileId: string) {
    await ensurePlaceProfileSchema();
    const result = await pool.query(
        `SELECT user_id, rating, feedback, body_response, tasted_well, would_repeat, keep_as_favorite, profile_data, created_at, updated_at
         FROM place_profile_feedback
         WHERE place_profile_id = $1
         ORDER BY updated_at DESC, created_at DESC`,
        [placeProfileId]
    );
    return result.rows;
}

export async function listManagedPlaceProfiles(userId: string | number) {
    await ensurePlaceProfileSchema();
    const result = await pool.query(
        `SELECT *
         FROM place_profiles
         WHERE owner_user_id = $1 OR created_by_user_id = $1
         ORDER BY updated_at DESC, created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function searchManagedPlaceProfiles(queries: string[], limit = 8) {
    await ensurePlaceProfileSchema();
    const normalizedQueries = Array.from(
        new Set(
            queries
                .map((query) => String(query || '').trim().toLowerCase())
                .filter((query) => query.length >= 2)
        )
    );

    if (normalizedQueries.length === 0) {
        return [];
    }

    const patterns = normalizedQueries.map((query) => `%${query}%`);
    const result = await pool.query(
        `SELECT *
         FROM place_profiles
         WHERE external_source = 'plyt_manual'
           AND owner_user_id IS NOT NULL
           AND (
                 lower(name) LIKE ANY($1::text[])
                 OR lower(COALESCE(profile_data->>'address', '')) LIKE ANY($1::text[])
                 OR lower(COALESCE(profile_data->>'menu_context', '')) LIKE ANY($1::text[])
                 OR lower(COALESCE(profile_data->>'raw_inventory_context', '')) LIKE ANY($1::text[])
            )
          ORDER BY updated_at DESC, created_at DESC
          LIMIT $2`,
        [patterns, Math.max(limit * 3, 12)]
    );

    return result.rows
        .map((row) => {
            const mapped = toSearchablePlaceResult(row);
            return {
                ...mapped,
                search_priority: computePlaceSearchPriority(mapped, normalizedQueries)
            };
        })
        .sort((a, b) => {
            if (b.search_priority !== a.search_priority) {
                return b.search_priority - a.search_priority;
            }
            return String(a.name || '').localeCompare(String(b.name || ''));
        })
        .slice(0, limit);
}

export async function hydratePlacesWithProfileData(places: any[]) {
    await ensurePlaceProfileSchema();

    if (!Array.isArray(places) || places.length === 0) {
        return [];
    }

    const externalPlaceIds = Array.from(
        new Set(
            places
                .map((place) => String(place?.id || '').trim())
                .filter(Boolean)
        )
    );
    const mapsUrls = Array.from(
        new Set(
            places
                .map((place) => String(place?.mapsUrl || '').trim())
                .filter(Boolean)
        )
    );

    const result = await pool.query(
        `SELECT *
         FROM place_profiles
         WHERE (array_length($1::text[], 1) IS NOT NULL AND external_place_id = ANY($1::text[]))
            OR (array_length($2::text[], 1) IS NOT NULL AND profile_data->'google_metadata'->>'mapsUrl' = ANY($2::text[]))`,
        [externalPlaceIds, mapsUrls]
    );

    const byExternalId = new Map<string, any>();
    const byMapsUrl = new Map<string, any>();

    result.rows.forEach((row) => {
        if (row?.external_place_id) {
            byExternalId.set(String(row.external_place_id), row);
        }

        const mapsUrl = String(row?.profile_data?.google_metadata?.mapsUrl || '').trim();
        if (mapsUrl) {
            byMapsUrl.set(mapsUrl, row);
        }
    });

    return places.map((place) => {
        const profile =
            byExternalId.get(String(place?.id || '').trim()) ||
            byMapsUrl.get(String(place?.mapsUrl || '').trim());

        if (!profile) {
            return place;
        }

        const profileData = profile?.profile_data || {};
        const googleMetadata = profileData?.google_metadata || {};

        return {
            ...place,
            place_profile_id: String(profile.id),
            place_kind: profile.place_kind || place.place_kind || inferPlaceKind(place),
            network_status: profile.network_status || place.network_status || 'not_on_network',
            website: place.website || profileData.website || googleMetadata.website || '',
            mapsUrl: place.mapsUrl || profileData.mapsUrl || googleMetadata.mapsUrl || '',
            phone: place.phone || profileData.phone || googleMetadata.phone || '',
            menu_context: combineMenuContext(profileData),
            raw_inventory_context: combineRawInventoryContext(profileData),
            raw_inventory_items: normalizeRawInventoryItems(profileData)
        };
    });
}
