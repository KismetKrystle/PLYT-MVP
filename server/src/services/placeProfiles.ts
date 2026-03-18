import type { PoolClient } from 'pg';
import pool from '../db';

let placeProfileSchemaReady: Promise<void> | null = null;

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
    if (explicitKind === 'restaurant' || explicitKind === 'farm' || explicitKind === 'distributor') {
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

    if (/(farm|farmer|orchard|grower|nursery|hydroponic|agro)/.test(haystack)) return 'farm';
    if (/(distributor|distribution|wholesale|supplier|market|grocer|grocery|co-op|coop)/.test(haystack)) return 'distributor';
    return 'restaurant';
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

async function refreshPlaceProfileAggregates(client: PoolClient, placeProfileId: string) {
    const countsResult = await client.query(
        `SELECT
            (SELECT COUNT(*)::int FROM user_place_favorites WHERE place_profile_id = $1) AS save_count,
            (SELECT COUNT(*)::int FROM place_profile_feedback WHERE place_profile_id = $1) AS feedback_count,
            (SELECT COALESCE(AVG(rating), 0)::numeric(4,2) FROM place_profile_feedback WHERE place_profile_id = $1 AND rating IS NOT NULL) AS average_rating`,
        [placeProfileId]
    );

    const counts = countsResult.rows[0] || {};

    await client.query(
        `UPDATE place_profiles
         SET save_count = $1,
             feedback_count = $2,
             average_rating = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
            counts.save_count || 0,
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
