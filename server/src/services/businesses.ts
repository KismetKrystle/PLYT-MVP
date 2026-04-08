import type { Pool, PoolClient } from 'pg';
import pool from '../db';

export type BusinessType = 'farmer' | 'distributor';
export type BusinessMembershipRole = 'owner' | 'admin' | 'member';

type DbClient = Pool | PoolClient;

function asDbClient(client?: DbClient) {
    return client || pool;
}

async function getUsersIdSqlType(client?: DbClient): Promise<'UUID' | 'INTEGER'> {
    const db = asDbClient(client);
    const check = await db.query(
        `SELECT data_type, udt_name
         FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'id'
         LIMIT 1`
    );

    if (check.rows.length === 0) {
        return 'UUID';
    }

    const row = check.rows[0];
    if (row.data_type === 'uuid' || row.udt_name === 'uuid') {
        return 'UUID';
    }

    return 'INTEGER';
}

export function normalizeBusinessType(value: unknown, fallback: BusinessType = 'farmer'): BusinessType {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'distributor') return 'distributor';
    if (normalized === 'farmer') return 'farmer';
    return fallback;
}

export function normalizeMembershipRole(value: unknown, fallback: BusinessMembershipRole = 'member'): BusinessMembershipRole {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'owner') return 'owner';
    if (normalized === 'admin') return 'admin';
    if (normalized === 'member') return 'member';
    return fallback;
}

export async function ensureBusinessSchema(client?: DbClient) {
    const db = asDbClient(client);
    const userIdSqlType = await getUsersIdSqlType(db);

    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await db.query(`
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

    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_location TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_region TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`);
    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await db.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await db.query(`
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

    await db.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';`);
    await db.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';`);
    await db.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await db.query(`ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_business_memberships_user_id ON business_memberships(user_id, status, updated_at DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_business_memberships_business_id ON business_memberships(business_id, status, updated_at DESC);`);

    await db.query(`
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

    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS farmer_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_fiat NUMERIC(12, 2) DEFAULT 0;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'manual';`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS external_source TEXT;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS external_item_id TEXT;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();`);
    await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_inventory_business_id ON inventory(business_id, updated_at DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_inventory_farmer_id ON inventory(farmer_id, updated_at DESC);`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_business_external_item ON inventory (business_id, external_source, external_item_id) WHERE external_item_id IS NOT NULL;`);
}

export async function listUserBusinesses(userId: string | number, client?: DbClient) {
    const db = asDbClient(client);
    await ensureBusinessSchema(db);

    const result = await db.query(
        `SELECT
            b.id,
            b.business_type,
            b.name,
            b.description,
            b.primary_location,
            b.service_region,
            b.profile_data,
            b.created_at,
            b.updated_at,
            bm.role AS membership_role,
            bm.status AS membership_status
         FROM business_memberships bm
         JOIN businesses b ON b.id = bm.business_id
         WHERE bm.user_id = $1
           AND bm.status = 'active'
         ORDER BY
            CASE bm.role
                WHEN 'owner' THEN 0
                WHEN 'admin' THEN 1
                ELSE 2
            END,
            b.updated_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function getBusinessMembership(
    businessId: string,
    userId: string | number,
    client?: DbClient
) {
    const db = asDbClient(client);
    await ensureBusinessSchema(db);

    const result = await db.query(
        `SELECT bm.*, b.business_type, b.name
         FROM business_memberships bm
         JOIN businesses b ON b.id = bm.business_id
         WHERE bm.business_id = $1
           AND bm.user_id = $2
           AND bm.status = 'active'
         LIMIT 1`,
        [businessId, userId]
    );

    return result.rows[0] || null;
}

export async function ensureLegacyBusinessForUser(
    userId: string | number,
    fallbackType?: BusinessType,
    client?: DbClient
) {
    const db = asDbClient(client);
    await ensureBusinessSchema(db);

    const existingBusinesses = await listUserBusinesses(userId, db);
    if (existingBusinesses.length > 0) {
        return existingBusinesses[0];
    }

    const userRes = await db.query(
        `SELECT id, name, email, role, profile_data
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
    );

    if (userRes.rows.length === 0) {
        return null;
    }

    const farmerProfileRes = await db.query(
        `SELECT profile_data
         FROM farmer_profiles
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
    );

    const userRow = userRes.rows[0];
    const legacyProfile = farmerProfileRes.rows[0]?.profile_data || {};
    const fallbackName = String(userRow.name || userRow.email || 'Untitled Supplier').split('@')[0].trim() || 'Untitled Supplier';
    const businessType = normalizeBusinessType(
        fallbackType || userRow.role || legacyProfile.business_type || legacyProfile.supplier_type,
        'farmer'
    );
    const businessName = String(
        legacyProfile.business_name ||
        legacyProfile.display_name ||
        userRow.profile_data?.business_name ||
        fallbackName
    ).trim() || fallbackName;
    const description = String(legacyProfile.description || '').trim();
    const primaryLocation = String(legacyProfile.location || legacyProfile.location_address || '').trim();
    const productTypes = Array.isArray(legacyProfile.product_types) ? legacyProfile.product_types : [];

    const created = await db.query(
        `INSERT INTO businesses (
            business_type,
            name,
            description,
            primary_location,
            service_region,
            profile_data
         )
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
            businessType,
            businessName,
            description,
            primaryLocation,
            primaryLocation,
            JSON.stringify({
                legacy_profile_data: legacyProfile,
                product_types: productTypes,
                sourcing_story: description,
                imported_from: 'farmer_profiles'
            })
        ]
    );

    const business = created.rows[0];

    await db.query(
        `INSERT INTO business_memberships (business_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (business_id, user_id)
         DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, updated_at = NOW()`,
        [business.id, userId]
    );

    await db.query(
        `UPDATE inventory
         SET business_id = $1,
             updated_at = NOW()
         WHERE farmer_id = $2
           AND business_id IS NULL`,
        [business.id, userId]
    );

    return {
        ...business,
        membership_role: 'owner',
        membership_status: 'active'
    };
}

