import express, { Response } from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
    ensureBusinessSchema,
    ensureLegacyBusinessForUser,
    getBusinessMembership,
    listUserBusinesses,
    normalizeBusinessType,
    normalizeMembershipRole,
    type BusinessMembershipRole,
    type BusinessType
} from '../services/businesses';

const router = express.Router();

type InventorySourceType = 'manual' | 'csv' | 'integration';

function isAdmin(req: AuthRequest) {
    return req.user?.role === 'admin';
}

function canManageBusinessRole(role: string | undefined, allowedRoles: BusinessMembershipRole[]) {
    return !!role && allowedRoles.includes(role as BusinessMembershipRole);
}

function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i += 1;
                continue;
            }
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function parseCsvText(csvText: string) {
    const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return { headers: [] as string[], rows: [] as Record<string, string>[] };
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce<Record<string, string>>((acc, header, index) => {
            acc[header] = String(values[index] || '').trim();
            return acc;
        }, {});
    });

    return { headers, rows };
}

function normalizeInventoryPayload(input: Record<string, any>, sourceType: InventorySourceType = 'manual') {
    const priceCandidate = input.price ?? input.price_fiat ?? input.price_plyt ?? 0;
    const quantityCandidate = input.quantity ?? 0;
    const consumerTags = Array.isArray(input.consumer_tags)
        ? input.consumer_tags.map((tag) => String(tag || '').trim()).filter(Boolean)
        : String(input.consumer_tags || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

    return {
        name: String(input.name || '').trim(),
        description: String(input.description || '').trim(),
        category: String(input.category || '').trim(),
        price_fiat: Number.isFinite(Number(priceCandidate)) ? Number(priceCandidate) : 0,
        quantity: Number.isFinite(Number(quantityCandidate)) ? Number(quantityCandidate) : 0,
        unit: String(input.unit || 'item').trim() || 'item',
        image_url: String(input.image_url || '').trim(),
        source_type: sourceType,
        external_source: String(input.external_source || (sourceType === 'csv' ? 'csv_upload' : '')).trim() || null,
        external_item_id: String(input.external_item_id || '').trim() || null,
        enrichment_data: {
            fulfillment_notes: String(input.fulfillment_notes || '').trim(),
            service_region: String(input.service_region || '').trim(),
            consumer_tags: consumerTags
        }
    };
}

function toStringList(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

async function requireBusinessAccess(
    req: AuthRequest,
    res: Response,
    businessId: string,
    allowedRoles: BusinessMembershipRole[] = ['owner', 'admin', 'member']
) {
    if (isAdmin(req)) {
        return { role: 'owner' as BusinessMembershipRole };
    }

    const membership = await getBusinessMembership(businessId, req.user?.id as string | number);
    if (!membership || !canManageBusinessRole(membership.role, allowedRoles)) {
        res.status(403).json({ error: 'Business access denied' });
        return null;
    }

    return membership;
}

router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id as string | number;
        const shouldAutoCreate = String(req.query.autocreate || '').trim().toLowerCase() === 'true';
        await ensureBusinessSchema();

        let businesses = await listUserBusinesses(userId);
        if (businesses.length === 0 && shouldAutoCreate) {
            await ensureLegacyBusinessForUser(
                userId,
                normalizeBusinessType(req.user?.role, 'farmer')
            );
            businesses = await listUserBusinesses(userId);
        }

        res.json({ businesses });
    } catch (error) {
        console.error('List my businesses error:', error);
        res.status(500).json({ error: 'Failed to fetch your businesses' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const userId = req.user?.id as string | number;
        const {
            business_type,
            name,
            description,
            primary_location,
            service_region,
            profile_data
        } = req.body || {};

        const trimmedName = String(name || '').trim();
        if (!trimmedName) {
            res.status(400).json({ error: 'Business name is required' });
            return;
        }

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const created = await client.query(
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
                normalizeBusinessType(business_type, normalizeBusinessType(req.user?.role, 'farmer')),
                trimmedName,
                String(description || '').trim(),
                String(primary_location || '').trim(),
                String(service_region || '').trim(),
                JSON.stringify(profile_data && typeof profile_data === 'object' ? profile_data : {})
            ]
        );

        await client.query(
            `INSERT INTO business_memberships (business_id, user_id, role, status)
             VALUES ($1, $2, 'owner', 'active')
             ON CONFLICT (business_id, user_id)
             DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, updated_at = NOW()`,
            [created.rows[0].id, userId]
        );

        await client.query('COMMIT');
        res.status(201).json({
            ...created.rows[0],
            membership_role: 'owner',
            membership_status: 'active'
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Create business error:', error);
        res.status(500).json({ error: 'Failed to create business' });
    } finally {
        client.release();
    }
});

router.put('/:businessId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId, ['owner', 'admin']);
        if (!access) return;

        const {
            business_type,
            name,
            description,
            primary_location,
            service_region,
            profile_data
        } = req.body || {};

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const updated = await client.query(
            `UPDATE businesses
             SET business_type = COALESCE($1, business_type),
                 name = COALESCE(NULLIF($2, ''), name),
                 description = COALESCE($3, description),
                 primary_location = COALESCE($4, primary_location),
                 service_region = COALESCE($5, service_region),
                 profile_data = COALESCE(profile_data, '{}'::jsonb) || $6::jsonb,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                business_type ? normalizeBusinessType(business_type) : null,
                typeof name === 'string' ? name.trim() : null,
                typeof description === 'string' ? description.trim() : null,
                typeof primary_location === 'string' ? primary_location.trim() : null,
                typeof service_region === 'string' ? service_region.trim() : null,
                JSON.stringify(profile_data && typeof profile_data === 'object' ? profile_data : {}),
                businessId
            ]
        );

        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        await client.query('COMMIT');
        res.json({
            ...updated.rows[0],
            membership_role: access.role,
            membership_status: access.status || 'active'
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Update business error:', error);
        res.status(500).json({ error: 'Failed to update business' });
    } finally {
        client.release();
    }
});

router.get('/:businessId/public', async (req: AuthRequest, res: Response) => {
    try {
        const businessId = String(req.params.businessId || '').trim();
        if (!businessId) {
            res.status(400).json({ error: 'Business id is required' });
            return;
        }

        await ensureBusinessSchema();

        const businessResult = await pool.query(
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
                (
                    SELECT COUNT(*)::int
                    FROM business_memberships bm
                    WHERE bm.business_id = b.id
                      AND bm.status = 'active'
                ) AS operator_count,
                (
                    SELECT COUNT(*)::int
                    FROM inventory i
                    WHERE i.business_id = b.id
                ) AS inventory_count
             FROM businesses b
             WHERE b.id = $1
             LIMIT 1`,
            [businessId]
        );

        if (businessResult.rows.length === 0) {
            res.status(404).json({ error: 'Business not found' });
            return;
        }

        const businessRow = businessResult.rows[0];
        const profileData = businessRow.profile_data && typeof businessRow.profile_data === 'object'
            ? businessRow.profile_data
            : {};

        const inventoryResult = await pool.query(
            `SELECT
                id,
                business_id,
                name,
                description,
                category,
                price_fiat,
                quantity,
                unit,
                image_url,
                source_type,
                external_source,
                external_item_id,
                enrichment_data,
                created_at,
                updated_at
             FROM inventory
             WHERE business_id = $1
             ORDER BY updated_at DESC, created_at DESC`,
            [businessId]
        );

        res.json({
            business: {
                id: businessRow.id,
                business_type: businessRow.business_type,
                name: businessRow.name,
                description: businessRow.description,
                primary_location: businessRow.primary_location,
                service_region: businessRow.service_region,
                created_at: businessRow.created_at,
                updated_at: businessRow.updated_at,
                operator_count: Number(businessRow.operator_count || 0),
                inventory_count: Number(businessRow.inventory_count || 0),
                business_image_url: String(profileData.business_image_url || '').trim(),
                product_types: toStringList(profileData.product_types),
                trust_signals: toStringList(profileData.trust_signals),
                fulfillment_notes: String(profileData.fulfillment_notes || '').trim(),
                sourcing_story: String(profileData.sourcing_story || '').trim()
            },
            items: inventoryResult.rows
        });
    } catch (error) {
        console.error('Get public business profile error:', error);
        res.status(500).json({ error: 'Failed to fetch public business profile' });
    }
});

router.get('/:businessId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        await ensureBusinessSchema();
        const result = await pool.query(
            `SELECT
                bm.user_id,
                bm.role,
                bm.status,
                bm.created_at,
                u.name,
                u.email
             FROM business_memberships bm
             JOIN users u ON u.id = bm.user_id
             WHERE bm.business_id = $1
             ORDER BY
                CASE bm.role
                    WHEN 'owner' THEN 0
                    WHEN 'admin' THEN 1
                    ELSE 2
                END,
                u.name ASC`,
            [businessId]
        );

        res.json({ members: result.rows });
    } catch (error) {
        console.error('List business members error:', error);
        res.status(500).json({ error: 'Failed to fetch business members' });
    }
});

router.post('/:businessId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId, ['owner', 'admin']);
        if (!access) return;

        const { email, user_id, role } = req.body || {};
        if (!email && !user_id) {
            res.status(400).json({ error: 'Provide email or user_id to attach an operator' });
            return;
        }

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const targetUser = email
            ? await client.query(
                `SELECT id, name, email
                 FROM users
                 WHERE lower(email) = lower($1)
                 LIMIT 1`,
                [String(email || '').trim()]
            )
            : await client.query(
                `SELECT id, name, email
                 FROM users
                 WHERE id = $1
                 LIMIT 1`,
                [user_id]
            );

        if (targetUser.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'User not found for operator attachment' });
            return;
        }

        const nextRole = normalizeMembershipRole(role, 'member');
        const result = await client.query(
            `INSERT INTO business_memberships (business_id, user_id, role, status)
             VALUES ($1, $2, $3, 'active')
             ON CONFLICT (business_id, user_id)
             DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
             RETURNING business_id, user_id, role, status, created_at, updated_at`,
            [businessId, targetUser.rows[0].id, nextRole]
        );

        await client.query('COMMIT');
        res.status(201).json({
            ...result.rows[0],
            name: targetUser.rows[0].name,
            email: targetUser.rows[0].email
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Attach business operator error:', error);
        res.status(500).json({ error: 'Failed to attach business operator' });
    } finally {
        client.release();
    }
});

router.put('/:businessId/members/:memberUserId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const memberUserId = String(req.params.memberUserId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId, ['owner', 'admin']);
        if (!access) return;

        const { role, status } = req.body || {};
        const nextRole = normalizeMembershipRole(role, 'member');
        const nextStatus = String(status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const current = await client.query(
            `SELECT *
             FROM business_memberships
             WHERE business_id = $1
               AND user_id = $2
             LIMIT 1`,
            [businessId, memberUserId]
        );

        if (current.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Membership not found' });
            return;
        }

        if (current.rows[0].role === 'owner' && (nextRole !== 'owner' || nextStatus !== 'active')) {
            const ownerCount = await client.query(
                `SELECT COUNT(*)::int AS owner_count
                 FROM business_memberships
                 WHERE business_id = $1
                   AND role = 'owner'
                   AND status = 'active'`,
                [businessId]
            );

            if (Number(ownerCount.rows[0]?.owner_count || 0) <= 1) {
                await client.query('ROLLBACK');
                res.status(400).json({ error: 'At least one active owner must remain attached to the business' });
                return;
            }
        }

        const updated = await client.query(
            `UPDATE business_memberships
             SET role = $1,
                 status = $2,
                 updated_at = NOW()
             WHERE business_id = $3
               AND user_id = $4
             RETURNING *`,
            [nextRole, nextStatus, businessId, memberUserId]
        );

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Update business membership error:', error);
        res.status(500).json({ error: 'Failed to update operator role' });
    } finally {
        client.release();
    }
});

router.get('/:businessId/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        await ensureBusinessSchema();
        const result = await pool.query(
            `SELECT *
             FROM inventory
             WHERE business_id = $1
             ORDER BY updated_at DESC, created_at DESC`,
            [businessId]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('List business inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch business inventory' });
    }
});

router.post('/:businessId/inventory', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        const normalized = normalizeInventoryPayload(req.body || {}, 'manual');
        if (!normalized.name) {
            res.status(400).json({ error: 'Inventory item name is required' });
            return;
        }

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const created = await client.query(
            `INSERT INTO inventory (
                farmer_id,
                business_id,
                name,
                description,
                price_plyt,
                price_fiat,
                image_url,
                category,
                quantity,
                unit,
                source_type,
                external_source,
                external_item_id,
                enrichment_data,
                updated_at
             )
             VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW())
             RETURNING *`,
            [
                req.user?.id,
                businessId,
                normalized.name,
                normalized.description,
                normalized.price_fiat,
                normalized.image_url || null,
                normalized.category || null,
                normalized.quantity,
                normalized.unit,
                normalized.source_type,
                normalized.external_source,
                normalized.external_item_id,
                JSON.stringify(normalized.enrichment_data)
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(created.rows[0]);
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Create business inventory error:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    } finally {
        client.release();
    }
});

router.put('/:businessId/inventory/:itemId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const itemId = String(req.params.itemId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        const normalized = normalizeInventoryPayload(req.body || {}, 'manual');
        if (!normalized.name) {
            res.status(400).json({ error: 'Inventory item name is required' });
            return;
        }

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const updated = await client.query(
            `UPDATE inventory
             SET farmer_id = COALESCE($1, farmer_id),
                 name = $2,
                 description = $3,
                 price_fiat = $4,
                 image_url = $5,
                 category = $6,
                 quantity = $7,
                 unit = $8,
                 source_type = $9,
                 external_source = $10,
                 external_item_id = $11,
                 enrichment_data = $12::jsonb,
                 updated_at = NOW()
             WHERE id = $13
               AND business_id = $14
             RETURNING *`,
            [
                req.user?.id,
                normalized.name,
                normalized.description,
                normalized.price_fiat,
                normalized.image_url || null,
                normalized.category || null,
                normalized.quantity,
                normalized.unit,
                normalized.source_type,
                normalized.external_source,
                normalized.external_item_id,
                JSON.stringify(normalized.enrichment_data),
                itemId,
                businessId
            ]
        );

        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Update business inventory error:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    } finally {
        client.release();
    }
});

router.delete('/:businessId/inventory/:itemId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const businessId = String(req.params.businessId || '').trim();
        const itemId = String(req.params.itemId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        await ensureBusinessSchema();
        const deleted = await pool.query(
            `DELETE FROM inventory
             WHERE id = $1
               AND business_id = $2
             RETURNING id`,
            [itemId, businessId]
        );

        if (deleted.rows.length === 0) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete business inventory error:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
});

router.post('/:businessId/inventory/import/csv', authenticateToken, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();

    try {
        const businessId = String(req.params.businessId || '').trim();
        const access = await requireBusinessAccess(req, res, businessId);
        if (!access) return;

        const { csvText, dryRun = true } = req.body || {};
        const trimmedCsv = String(csvText || '').trim();
        if (!trimmedCsv) {
            res.status(400).json({ error: 'csvText is required' });
            return;
        }

        const parsed = parseCsvText(trimmedCsv);
        if (parsed.headers.length === 0) {
            res.status(400).json({ error: 'CSV headers could not be parsed' });
            return;
        }

        const previewRows = parsed.rows.map((row, index) => {
            const normalized = normalizeInventoryPayload(row, 'csv');
            const rowErrors: string[] = [];

            if (!normalized.name) {
                rowErrors.push('Missing required field: name');
            }

            if (!Number.isFinite(Number(row.price || normalized.price_fiat))) {
                // no-op; normalizeInventoryPayload already falls back to 0
            }

            return {
                index: index + 2,
                normalized,
                errors: rowErrors
            };
        });

        const errors = previewRows.flatMap((row) => row.errors.map((message) => `Row ${row.index}: ${message}`));

        if (dryRun || errors.length > 0) {
            res.json({
                dryRun: true,
                summary: {
                    totalRows: previewRows.length,
                    validRows: previewRows.filter((row) => row.errors.length === 0).length,
                    errorCount: errors.length
                },
                errors,
                rows: previewRows
            });
            return;
        }

        await client.query('BEGIN');
        await ensureBusinessSchema(client);

        const importedRows = [];
        for (const row of previewRows) {
            const normalized = row.normalized;
            let result;

            if (normalized.external_item_id) {
                result = await client.query(
                    `UPDATE inventory
                     SET farmer_id = COALESCE($1, farmer_id),
                         name = $2,
                         description = $3,
                         price_fiat = $4,
                         image_url = $5,
                         category = $6,
                         quantity = $7,
                         unit = $8,
                         source_type = 'csv',
                         external_source = $9,
                         external_item_id = $10,
                         enrichment_data = $11::jsonb,
                         updated_at = NOW()
                     WHERE business_id = $12
                       AND external_item_id = $10
                     RETURNING *`,
                    [
                        req.user?.id,
                        normalized.name,
                        normalized.description,
                        normalized.price_fiat,
                        normalized.image_url || null,
                        normalized.category || null,
                        normalized.quantity,
                        normalized.unit,
                        normalized.external_source || 'csv_upload',
                        normalized.external_item_id,
                        JSON.stringify(normalized.enrichment_data),
                        businessId
                    ]
                );
            } else {
                result = { rows: [] };
            }

            if (result.rows.length === 0) {
                result = await client.query(
                    `INSERT INTO inventory (
                        farmer_id,
                        business_id,
                        name,
                        description,
                        price_plyt,
                        price_fiat,
                        image_url,
                        category,
                        quantity,
                        unit,
                        source_type,
                        external_source,
                        external_item_id,
                        enrichment_data,
                        updated_at
                     )
                     VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, 'csv', $10, $11, $12::jsonb, NOW())
                     RETURNING *`,
                    [
                        req.user?.id,
                        businessId,
                        normalized.name,
                        normalized.description,
                        normalized.price_fiat,
                        normalized.image_url || null,
                        normalized.category || null,
                        normalized.quantity,
                        normalized.unit,
                        normalized.external_source || 'csv_upload',
                        normalized.external_item_id,
                        JSON.stringify(normalized.enrichment_data)
                    ]
                );
            }

            importedRows.push(result.rows[0]);
        }

        await client.query('COMMIT');
        res.json({
            dryRun: false,
            summary: {
                totalRows: previewRows.length,
                importedRows: importedRows.length,
                errorCount: 0
            },
            rows: importedRows
        });
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback failure
        }
        console.error('Import business inventory CSV error:', error);
        res.status(500).json({ error: 'Failed to import CSV inventory' });
    } finally {
        client.release();
    }
});

export default router;
