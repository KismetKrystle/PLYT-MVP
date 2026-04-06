import type { Pool, PoolClient } from 'pg';
import pool from '../db';
import { fetchRoleProfileData } from './profileContext';

type Queryable = Pool | PoolClient;

export type UserMemoryEventInput = {
    userId: string | number;
    eventType: string;
    sourceTable?: string | null;
    sourceId?: string | null;
    payload?: Record<string, any>;
};

export type UserMemoryContext = {
    coreProfile: {
        healthConditions: string[];
        dietaryPreferences: string[];
        allergies: string[];
        wellnessGoals: string[];
        location: {
            city?: string;
            address?: string;
            country?: string;
        };
        userSettings: Record<string, any>;
    };
    preferenceSignals: Array<{
        signalType: string;
        signalKey: string;
        signalValue: string;
        confidence: number;
        metadata: Record<string, any>;
    }>;
    summaries: Array<{
        summaryType: string;
        content: string;
        metadata: Record<string, any>;
    }>;
    recentBehavior: Array<{
        eventType: string;
        createdAt: string;
        payload: Record<string, any>;
    }>;
};

let userMemorySchemaReady: Promise<void> | null = null;

function normalizeStringList(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function inferThemeFromText(value: string) {
    const text = String(value || '').toLowerCase();
    if (!text) return null;
    if (/(herb|herbal|jamu|spice|botanical)/.test(text)) return 'herbs';
    if (/(supplement|vitamin|apothecary|pharmacy|remedy)/.test(text)) return 'supplements';
    if (/(produce|fruit|vegetable|market|farm|grocery|organic)/.test(text)) return 'produce';
    if (/(ferment|kombucha|probiotic|tempeh|kimchi)/.test(text)) return 'fermented';
    if (/(juice|smoothie|cold press)/.test(text)) return 'juice';
    if (/(restaurant|cafe|takeout|delivery|meal)/.test(text)) return 'ready_to_eat';
    return null;
}

function inferFulfillmentModeFromText(value: string) {
    const text = String(value || '').toLowerCase();
    if (!text) return null;
    if (/(recipe|cook|make|ingredients|ingredient|meal prep|prepared for later)/.test(text)) return 'recipe';
    if (/(market|grocery|farm|supplier|produce|herb|supplement|vitamin|shop|store|source)/.test(text)) return 'sourcing';
    if (/(restaurant|cafe|takeout|delivery|order|ready to eat|meal)/.test(text)) return 'ready_to_eat';
    return null;
}

function inferFulfillmentModeFromPlaceKind(placeKind: string) {
    const normalized = String(placeKind || '').trim().toLowerCase();
    if (!normalized) return null;
    if (['farm', 'farm_stand', 'grocery', 'natural_food_store', 'distributor'].includes(normalized)) return 'sourcing';
    if (['restaurant', 'cafe', 'prepared_food'].includes(normalized)) return 'ready_to_eat';
    return null;
}

function flattenBehaviorPayload(payload: Record<string, any>) {
    return Object.values(payload || {})
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
}

function scoreLineForQuery(value: string, query: string) {
    const text = String(value || '').toLowerCase();
    const normalizedQuery = String(query || '').toLowerCase();
    if (!text || !normalizedQuery) return 0;

    const inferredTheme = inferThemeFromText(normalizedQuery);
    let score = 0;
    if (inferredTheme && text.includes(inferredTheme)) score += 3;

    normalizedQuery
        .split(/[^a-z0-9]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 4)
        .forEach((part) => {
            if (text.includes(part)) score += 1;
        });

    return score;
}

function buildLocation(profile: any) {
    const location = profile?.location;
    if (location && typeof location === 'object' && !Array.isArray(location)) {
        return {
            city: String(location.city || profile?.location_city || '').trim() || undefined,
            address: String(location.address || profile?.location_address || '').trim() || undefined,
            country: String(location.country || profile?.location_country || profile?.country || '').trim() || undefined
        };
    }

    return {
        city: String(profile?.location_city || '').trim() || undefined,
        address: String(profile?.location_address || '').trim() || undefined,
        country: String(profile?.location_country || profile?.country || '').trim() || undefined
    };
}

export async function ensureUserMemorySchema(queryable: Queryable = pool) {
    if (!userMemorySchemaReady) {
        userMemorySchemaReady = (async () => {
            const usersIdTypeRes = await queryable.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'id'
                LIMIT 1
            `);
            const usersIdType = usersIdTypeRes.rows[0]?.data_type === 'uuid' ? 'UUID' : 'INTEGER';

            await queryable.query(`
                CREATE TABLE IF NOT EXISTS user_memory_events (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    source_table TEXT,
                    source_id TEXT,
                    payload JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);

            await queryable.query(`
                CREATE TABLE IF NOT EXISTS user_preference_signals (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                    signal_type TEXT NOT NULL,
                    signal_key TEXT NOT NULL,
                    signal_value TEXT,
                    confidence NUMERIC(4,2) NOT NULL DEFAULT 0.50,
                    source TEXT NOT NULL DEFAULT 'derived',
                    first_seen_at TIMESTAMP DEFAULT NOW(),
                    last_seen_at TIMESTAMP DEFAULT NOW(),
                    metadata JSONB DEFAULT '{}'::jsonb,
                    UNIQUE (user_id, signal_type, signal_key, signal_value)
                );
            `);

            await queryable.query(`
                CREATE TABLE IF NOT EXISTS user_memory_summaries (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id ${usersIdType} REFERENCES users(id) ON DELETE CASCADE,
                    summary_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata JSONB DEFAULT '{}'::jsonb,
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE (user_id, summary_type)
                );
            `);

            await queryable.query(`CREATE INDEX IF NOT EXISTS idx_user_memory_events_user_id_created_at ON user_memory_events(user_id, created_at DESC);`);
            await queryable.query(`CREATE INDEX IF NOT EXISTS idx_user_preference_signals_user_id_type ON user_preference_signals(user_id, signal_type, last_seen_at DESC);`);
        })().catch((error) => {
            userMemorySchemaReady = null;
            throw error;
        });
    }

    return userMemorySchemaReady;
}

async function upsertPreferenceSignal(
    queryable: Queryable,
    userId: string | number,
    signalType: string,
    signalKey: string,
    signalValue: string,
    confidence: number,
    metadata: Record<string, any> = {}
) {
    await queryable.query(
        `INSERT INTO user_preference_signals (
            user_id,
            signal_type,
            signal_key,
            signal_value,
            confidence,
            metadata,
            last_seen_at
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
         ON CONFLICT (user_id, signal_type, signal_key, signal_value)
         DO UPDATE SET
            confidence = EXCLUDED.confidence,
            metadata = EXCLUDED.metadata,
            last_seen_at = NOW()`,
        [userId, signalType, signalKey, signalValue, confidence, JSON.stringify(metadata)]
    );
}

async function upsertSummary(
    queryable: Queryable,
    userId: string | number,
    summaryType: string,
    content: string,
    metadata: Record<string, any> = {}
) {
    await queryable.query(
        `INSERT INTO user_memory_summaries (user_id, summary_type, content, metadata, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (user_id, summary_type)
         DO UPDATE SET
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()`,
        [userId, summaryType, content, JSON.stringify(metadata)]
    );
}

export async function recordUserMemoryEvent(queryable: Queryable, input: UserMemoryEventInput) {
    await ensureUserMemorySchema(queryable);
    await queryable.query(
        `INSERT INTO user_memory_events (user_id, event_type, source_table, source_id, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
            input.userId,
            input.eventType,
            input.sourceTable || null,
            input.sourceId || null,
            JSON.stringify(input.payload && typeof input.payload === 'object' ? input.payload : {})
        ]
    );
}

export async function refreshUserPreferenceSignals(queryable: Queryable, userId: string | number) {
    await ensureUserMemorySchema(queryable);

    await queryable.query(`DELETE FROM user_preference_signals WHERE user_id = $1 AND source = 'derived'`, [userId]);

    const favoritePlacesRes = await queryable.query(
        `SELECT
            pp.place_kind,
            pp.name,
            pp.profile_data
         FROM user_place_favorites uf
         JOIN place_profiles pp ON pp.id = uf.place_profile_id
         WHERE uf.user_id = $1`,
        [userId]
    );

    const visitsRes = await queryable.query(
        `SELECT
            pp.place_kind,
            pp.name,
            pp.profile_data,
            pv.meal_name,
            pv.body_response
         FROM place_visits pv
         JOIN place_profiles pp ON pp.id = pv.place_profile_id
         WHERE pv.user_id = $1`,
        [userId]
    );
    const recentEventsRes = await queryable.query(
        `SELECT event_type, payload
         FROM user_memory_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 160`,
        [userId]
    );

    const placeKindCounts = new Map<string, number>();
    const themeCounts = new Map<string, number>();
    const contentSourceCounts = new Map<string, number>();
    const fulfillmentCounts = new Map<string, number>();

    [...favoritePlacesRes.rows, ...visitsRes.rows].forEach((row) => {
        const placeKind = String(row?.place_kind || '').trim().toLowerCase();
        if (placeKind) {
            placeKindCounts.set(placeKind, (placeKindCounts.get(placeKind) || 0) + 1);
            const fulfillmentMode = inferFulfillmentModeFromPlaceKind(placeKind);
            if (fulfillmentMode) {
                fulfillmentCounts.set(fulfillmentMode, (fulfillmentCounts.get(fulfillmentMode) || 0) + 1);
            }
        }

        const searchText = [
            row?.name,
            row?.meal_name,
            row?.body_response,
            row?.profile_data?.raw_inventory_context,
            row?.profile_data?.menu_context,
            row?.profile_data?.address
        ]
            .filter(Boolean)
            .join(' ');
        const theme = inferThemeFromText(searchText);
        if (theme) {
            themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
        }
    });

    recentEventsRes.rows.forEach((row) => {
        const eventType = String(row?.event_type || '').trim().toLowerCase();
        const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
        const contentSource = String((payload as Record<string, any>)?.source || '').trim().toLowerCase();
        const isRemovalEvent = eventType === 'chat_unfavorited' || eventType === 'library_item_removed';

        if (isRemovalEvent || contentSource === 'starter') {
            return;
        }

        const text = `${eventType} ${flattenBehaviorPayload(payload)}`.trim();
        const theme = inferThemeFromText(text);
        if (theme) {
            themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
        }

        const fulfillmentMode = inferFulfillmentModeFromText(text);
        if (fulfillmentMode) {
            fulfillmentCounts.set(fulfillmentMode, (fulfillmentCounts.get(fulfillmentMode) || 0) + 1);
        }

        if (eventType === 'chat_favorited') {
            contentSourceCounts.set('chat', (contentSourceCounts.get('chat') || 0) + 1);
        }

        if (eventType === 'library_item_saved') {
            const source = contentSource || 'library';
            contentSourceCounts.set(source, (contentSourceCounts.get(source) || 0) + 1);
        }
    });

    const topPlaceKinds = Array.from(placeKindCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const topThemes = Array.from(themeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    const topContentSources = Array.from(contentSourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const topFulfillmentModes = Array.from(fulfillmentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    for (const [placeKind, count] of topPlaceKinds) {
        const confidence = Math.min(0.95, 0.45 + count * 0.1);
        await upsertPreferenceSignal(queryable, userId, 'preferred_place_kind', 'place_kind', placeKind, confidence, { count });
    }

    for (const [theme, count] of topThemes) {
        const confidence = Math.min(0.95, 0.4 + count * 0.1);
        await upsertPreferenceSignal(queryable, userId, 'favorite_food_theme', 'theme', theme, confidence, { count });
    }

    for (const [source, count] of topContentSources) {
        const confidence = Math.min(0.95, 0.35 + count * 0.1);
        await upsertPreferenceSignal(queryable, userId, 'preferred_saved_content_source', 'source', source, confidence, { count });
    }

    for (const [mode, count] of topFulfillmentModes) {
        const confidence = Math.min(0.95, 0.4 + count * 0.1);
        await upsertPreferenceSignal(queryable, userId, 'preferred_fulfillment_mode', 'mode', mode, confidence, { count });
    }
}

export async function refreshUserMemorySummaries(queryable: Queryable, userId: string | number, role: string = 'consumer') {
    await ensureUserMemorySchema(queryable);

    const profileData = await fetchRoleProfileData(userId, role);
    const healthProfile = profileData?.consumer_health_profile || profileData || {};
    const location = buildLocation(healthProfile);
    const healthConditions = normalizeStringList(healthProfile?.health_conditions);
    const dietaryPreferences = normalizeStringList(healthProfile?.dietary_preferences);

    const signalsRes = await queryable.query(
        `SELECT signal_type, signal_key, signal_value, confidence, metadata
         FROM user_preference_signals
         WHERE user_id = $1
         ORDER BY confidence DESC, last_seen_at DESC
         LIMIT 12`,
        [userId]
    );

    const favoriteKindSignals = signalsRes.rows.filter((row) => row.signal_type === 'preferred_place_kind');
    const themeSignals = signalsRes.rows.filter((row) => row.signal_type === 'favorite_food_theme');
    const savedSourceSignals = signalsRes.rows.filter((row) => row.signal_type === 'preferred_saved_content_source');
    const fulfillmentSignals = signalsRes.rows.filter((row) => row.signal_type === 'preferred_fulfillment_mode');

    const sourcingStyle = favoriteKindSignals.length > 0
        ? `User tends to save or revisit ${favoriteKindSignals.map((row) => row.signal_value).join(', ')} options most often.`
        : 'User sourcing-style preferences are still forming.';

    const behaviorOverviewParts = [
        healthConditions.length > 0 ? `Health themes in profile: ${healthConditions.join(', ')}.` : '',
        dietaryPreferences.length > 0 ? `Dietary preferences: ${dietaryPreferences.join(', ')}.` : '',
        themeSignals.length > 0 ? `Recurring food themes: ${themeSignals.map((row) => row.signal_value).join(', ')}.` : '',
        savedSourceSignals.length > 0 ? `Saved-content patterns: ${savedSourceSignals.map((row) => row.signal_value).join(', ')}.` : '',
        fulfillmentSignals.length > 0 ? `Likely preferred fulfillment modes: ${fulfillmentSignals.map((row) => row.signal_value).join(', ')}.` : '',
        location.city || location.address ? `Usual area: ${[location.city, location.address].filter(Boolean).join(', ')}.` : ''
    ].filter(Boolean);

    await upsertSummary(queryable, userId, 'sourcing_style', sourcingStyle, {
        preferred_place_kinds: favoriteKindSignals.map((row) => row.signal_value)
    });
    await upsertSummary(
        queryable,
        userId,
        'behavior_overview',
        behaviorOverviewParts.length > 0
            ? behaviorOverviewParts.join(' ')
            : 'This user has not built enough preference history yet for a behavior summary.',
        {
            recurring_themes: themeSignals.map((row) => row.signal_value),
            saved_content_sources: savedSourceSignals.map((row) => row.signal_value),
            fulfillment_modes: fulfillmentSignals.map((row) => row.signal_value),
            health_conditions: healthConditions,
            dietary_preferences: dietaryPreferences
        }
    );
}

export async function refreshUserMemory(queryable: Queryable, userId: string | number, role: string = 'consumer') {
    await refreshUserPreferenceSignals(queryable, userId);
    await refreshUserMemorySummaries(queryable, userId, role);
}

export async function buildUserMemoryContext(userId: string | number, role: string = 'consumer'): Promise<UserMemoryContext> {
    await ensureUserMemorySchema(pool);

    const profileData = await fetchRoleProfileData(userId, role);
    const healthProfile = profileData?.consumer_health_profile || profileData || {};
    const location = buildLocation(healthProfile);

    const [signalsRes, summariesRes, recentBehaviorRes] = await Promise.all([
        pool.query(
            `SELECT signal_type, signal_key, signal_value, confidence, metadata
             FROM user_preference_signals
             WHERE user_id = $1
             ORDER BY confidence DESC, last_seen_at DESC
             LIMIT 20`,
            [userId]
        ),
        pool.query(
            `SELECT summary_type, content, metadata
             FROM user_memory_summaries
             WHERE user_id = $1
             ORDER BY updated_at DESC
             LIMIT 10`,
            [userId]
        ),
        pool.query(
            `SELECT event_type, payload, created_at
             FROM user_memory_events
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 12`,
            [userId]
        )
    ]);

    return {
        coreProfile: {
            healthConditions: normalizeStringList(healthProfile?.health_conditions),
            dietaryPreferences: normalizeStringList(healthProfile?.dietary_preferences),
            allergies: normalizeStringList(healthProfile?.allergies),
            wellnessGoals: normalizeStringList(healthProfile?.wellness_goals),
            location,
            userSettings: healthProfile?.user_settings && typeof healthProfile.user_settings === 'object'
                ? healthProfile.user_settings
                : {}
        },
        preferenceSignals: signalsRes.rows.map((row) => ({
            signalType: String(row.signal_type || ''),
            signalKey: String(row.signal_key || ''),
            signalValue: String(row.signal_value || ''),
            confidence: Number(row.confidence || 0),
            metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
        })),
        summaries: summariesRes.rows.map((row) => ({
            summaryType: String(row.summary_type || ''),
            content: String(row.content || ''),
            metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
        })),
        recentBehavior: recentBehaviorRes.rows.map((row) => ({
            eventType: String(row.event_type || ''),
            createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
            payload: row.payload && typeof row.payload === 'object' ? row.payload : {}
        }))
    };
}

export async function buildRelevantMemoryPromptSection(
    userId: string | number,
    query: string,
    role: string = 'consumer'
) {
    const memory = await buildUserMemoryContext(userId, role);
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const isFindQuery = /(where|find|buy|get|near me|source|shop|market|store|supplier|available)/.test(normalizedQuery);
    const isRecipeQuery = /(recipe|cook|make|ingredient|ingredients|meal prep|prepared for later)/.test(normalizedQuery);
    const isReadyToEatQuery = /(restaurant|cafe|takeout|delivery|order|ready to eat)/.test(normalizedQuery);

    const relevantSummaries = memory.summaries
        .map((summary) => ({
            ...summary,
            relevance:
                (isFindQuery && summary.summaryType === 'sourcing_style' ? 3 : 0) +
                scoreLineForQuery(summary.content, normalizedQuery)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 2);

    const relevantSignals = memory.preferenceSignals
        .map((signal) => ({
            ...signal,
            relevance:
                (isFindQuery && signal.signalType === 'preferred_place_kind' ? 3 : 0) +
                (isFindQuery && signal.signalType === 'preferred_fulfillment_mode' && signal.signalValue === 'sourcing' ? 2 : 0) +
                (isRecipeQuery && signal.signalType === 'preferred_fulfillment_mode' && signal.signalValue === 'recipe' ? 3 : 0) +
                (isReadyToEatQuery && signal.signalType === 'preferred_fulfillment_mode' && signal.signalValue === 'ready_to_eat' ? 3 : 0) +
                scoreLineForQuery(`${signal.signalType} ${signal.signalKey} ${signal.signalValue}`, normalizedQuery)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);

    const relevantBehavior = memory.recentBehavior
        .map((event) => ({
            ...event,
            relevance: scoreLineForQuery(`${event.eventType} ${flattenBehaviorPayload(event.payload)}`, normalizedQuery)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 2);

    const lines = [
        ...relevantSummaries
            .filter((summary) => summary.content)
            .map((summary) => `- ${summary.content}`),
        ...relevantSignals
            .filter((signal) => signal.signalValue)
            .map((signal) => `- Learned ${signal.signalType.replace(/_/g, ' ')}: ${signal.signalValue}`),
        ...relevantBehavior
            .filter((event) => event.eventType)
            .map((event) => {
                const details = flattenBehaviorPayload(event.payload).trim();
                return details
                    ? `- Recent ${event.eventType.replace(/_/g, ' ')}: ${details.slice(0, 160)}`
                    : `- Recent ${event.eventType.replace(/_/g, ' ')}`;
            })
    ].filter(Boolean);

    if (lines.length === 0) {
        return '';
    }

    return `## RELEVANT USER MEMORY\n${Array.from(new Set(lines)).slice(0, 5).join('\n')}`;
}
