import path from 'path';
import '../env';
import pool from '../db';

async function getUsersIdType(): Promise<'uuid' | 'integer'> {
    const check = await pool.query(
        `SELECT data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'id'
         LIMIT 1`
    );

    if (check.rows.length === 0) {
        return 'uuid';
    }

    const row = check.rows[0];
    if (row.data_type === 'uuid' || row.udt_name === 'uuid') {
        return 'uuid';
    }
    return 'integer';
}

async function migrate() {
    try {
        console.log('Running Phase 1 profile/chat migrations...');

        await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) DEFAULT 'consumer',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'consumer';`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`UPDATE users SET name = COALESCE(name, SPLIT_PART(email, '@', 1));`);

        const usersIdType = await getUsersIdType();
        const userIdSqlType = usersIdType === 'uuid' ? 'UUID' : 'INTEGER';
        console.log(`Detected users.id type: ${userIdSqlType}`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS consumer_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS farmer_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS expert_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_type VARCHAR(20) NOT NULL DEFAULT 'farmer',
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                primary_location TEXT DEFAULT '',
                service_region TEXT DEFAULT '',
                profile_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_location TEXT DEFAULT '';`);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_region TEXT DEFAULT '';`);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_memberships (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                user_id ${userIdSqlType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL DEFAULT 'member',
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (business_id, user_id)
            );
        `);
        await pool.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';`);
        await pool.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';`);
        await pool.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_memberships_user_id ON business_memberships(user_id, status, updated_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_business_memberships_business_id ON business_memberships(business_id, status, updated_at DESC);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                farmer_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
                business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                price_plyt NUMERIC(12, 2) DEFAULT 0,
                price_fiat NUMERIC(12, 2) DEFAULT 0,
                image_url TEXT,
                category TEXT,
                quantity NUMERIC(12, 2) DEFAULT 0,
                unit TEXT DEFAULT 'item',
                source_type VARCHAR(20) NOT NULL DEFAULT 'manual',
                external_source TEXT,
                external_item_id TEXT,
                enrichment_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS farmer_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_fiat NUMERIC(12, 2) DEFAULT 0;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'manual';`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS external_source TEXT;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS external_item_id TEXT;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id, updated_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_farmer_id ON inventory(farmer_id, updated_at DESC);`);
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_business_external_item ON inventory (business_id, external_source, external_item_id) WHERE external_item_id IS NOT NULL;`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS digital_assets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                asset_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Minted',
                image_url TEXT,
                chain_hash TEXT,
                uploaded_at TIMESTAMP,
                minted_from TEXT,
                creator_name TEXT,
                file_format TEXT,
                usage_license TEXT,
                summary TEXT,
                tags JSONB DEFAULT '[]'::jsonb,
                metadata JSONB DEFAULT '{}'::jsonb,
                view_count INTEGER NOT NULL DEFAULT 0,
                like_count INTEGER NOT NULL DEFAULT 0,
                save_count INTEGER NOT NULL DEFAULT 0,
                ai_referral_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS image_url TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS chain_hash TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS minted_from TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS creator_name TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS file_format TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS usage_license TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS summary TEXT;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS ai_referral_count INTEGER NOT NULL DEFAULT 0;`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS digital_asset_views (
                id BIGSERIAL PRIMARY KEY,
                asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
                viewer_user_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
                session_id VARCHAR(128),
                source VARCHAR(50) NOT NULL DEFAULT 'direct',
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS digital_asset_likes (
                id BIGSERIAL PRIMARY KEY,
                asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
                user_id ${userIdSqlType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                source VARCHAR(50) NOT NULL DEFAULT 'plyt_app',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (asset_id, user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS digital_asset_saves (
                id BIGSERIAL PRIMARY KEY,
                asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
                user_id ${userIdSqlType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                source VARCHAR(50) NOT NULL DEFAULT 'plyt_app',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (asset_id, user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS digital_asset_ai_referrals (
                id BIGSERIAL PRIMARY KEY,
                asset_id TEXT NOT NULL REFERENCES digital_assets(id) ON DELETE CASCADE,
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
                session_id VARCHAR(128),
                source VARCHAR(50) NOT NULL DEFAULT 'assistant',
                context JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_digital_asset_views_asset_id ON digital_asset_views(asset_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_digital_asset_views_created_at ON digital_asset_views(created_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_digital_asset_ai_referrals_asset_id ON digital_asset_ai_referrals(asset_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_digital_asset_ai_referrals_created_at ON digital_asset_ai_referrals(created_at);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS profile_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                label TEXT NOT NULL,
                emoji TEXT,
                color TEXT,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS profile_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                category_id UUID REFERENCES profile_categories(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                media_url TEXT,
                media_type TEXT DEFAULT 'image',
                document_type TEXT,
                description TEXT,
                content_markdown TEXT,
                content_json JSONB,
                tags TEXT[],
                source TEXT,
                source_ref TEXT,
                source_conversation_id TEXT,
                source_message_index INT,
                selection_text TEXT,
                metadata JSONB DEFAULT '{}'::jsonb,
                is_private BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        `);

        await pool.query(`ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS emoji TEXT;`);
        await pool.query(`ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS color TEXT;`);
        await pool.query(`ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS media_url TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS document_type TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS description TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS content_markdown TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS content_json JSONB;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS tags TEXT[];`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS source TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS source_ref TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS source_conversation_id TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS source_message_index INT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS selection_text TEXT;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`ALTER TABLE profile_items ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT true;`);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_profile_categories_user_id ON profile_categories(user_id, sort_order, created_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_profile_items_category_id ON profile_items(category_id, created_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_profile_items_user_id ON profile_items(user_id, created_at DESC);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages_to_admin (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
                subject TEXT NOT NULL DEFAULT 'store_request',
                message TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                status TEXT NOT NULL DEFAULT 'new',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await pool.query(`ALTER TABLE messages_to_admin ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
        await pool.query(`ALTER TABLE messages_to_admin ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';`);
        await pool.query(`ALTER TABLE messages_to_admin ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_to_admin_created_at ON messages_to_admin(created_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_to_admin_status ON messages_to_admin(status, created_at DESC);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_memory_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                source_table TEXT,
                source_id TEXT,
                payload JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_preference_signals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_memory_summaries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
                summary_type TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (user_id, summary_type)
            );
        `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_memory_events_user_id_created_at ON user_memory_events(user_id, created_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_preference_signals_user_id_type ON user_preference_signals(user_id, signal_type, last_seen_at DESC);`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS allowed_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Phase 1 migrations complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();

