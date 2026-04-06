import type { Pool, PoolClient } from 'pg';

type Queryable = Pool | PoolClient;

type StarterCategoryTemplate = {
    label: string;
    emoji: string;
    color: string;
    sortOrder: number;
    item: {
        title: string;
        mediaUrl: string;
        mediaType: 'image' | 'video' | 'pdf' | 'markdown';
        description: string;
        tags: string[];
        source: string;
        sourceRef: string;
        isPrivate: boolean;
    };
};

const STARTER_LIBRARY_TEMPLATE: StarterCategoryTemplate[] = [
    {
        label: 'Recipes',
        emoji: '🍽️',
        color: '#4ade80',
        sortOrder: 0,
        item: {
            title: 'Garden Greens Citrus Bowl',
            mediaUrl: '/assets/images/gallery/organic_kale.png',
            mediaType: 'image',
            description: 'A bright starter recipe built around leafy greens, herbs, citrus, and seeds.',
            tags: ['recipe', 'greens', 'fresh'],
            source: 'starter',
            sourceRef: 'starter-recipes-001',
            isPrivate: true
        }
    },
    {
        label: 'Foods',
        emoji: '🥦',
        color: '#facc15',
        sortOrder: 1,
        item: {
            title: 'Local Spinach Harvest Notes',
            mediaUrl: '/assets/images/gallery/spinach.png',
            mediaType: 'image',
            description: 'Reference item for spinach quality, source details, and seasonal use.',
            tags: ['food', 'spinach', 'produce'],
            source: 'starter',
            sourceRef: 'starter-foods-001',
            isPrivate: true
        }
    },
    {
        label: 'Health Tips',
        emoji: '💡',
        color: '#60a5fa',
        sortOrder: 2,
        item: {
            title: 'Daily Anti-Inflammatory Reminders',
            mediaUrl: '/assets/images/gallery/indoor_garden.png',
            mediaType: 'image',
            description: 'Quick reminder list for building more anti-inflammatory meals and shopping habits.',
            tags: ['health', 'wellness', 'tips'],
            source: 'starter',
            sourceRef: 'starter-health-tips-001',
            isPrivate: true
        }
    },
    {
        label: 'Research',
        emoji: '📄',
        color: '#c084fc',
        sortOrder: 3,
        item: {
            title: 'Urban Nutrition Research Snapshot',
            mediaUrl: '/assets/images/gallery/community_garden.png',
            mediaType: 'image',
            description: 'Starter research card for saving findings related to food systems, health, and local sourcing.',
            tags: ['research', 'nutrition', 'community'],
            source: 'starter',
            sourceRef: 'starter-research-001',
            isPrivate: true
        }
    }
];

function normalizeLabel(label: string) {
    return String(label || '').trim().toLowerCase();
}

async function ensureStarterCategory(
    queryable: Queryable,
    userId: string | number,
    template: StarterCategoryTemplate
) {
    const existing = await queryable.query(
        `SELECT id
         FROM profile_categories
         WHERE user_id = $1
           AND LOWER(TRIM(label)) = LOWER(TRIM($2))
         ORDER BY sort_order ASC, created_at ASC
         LIMIT 1`,
        [userId, template.label]
    );

    if (existing.rows[0]?.id) {
        return String(existing.rows[0].id);
    }

    const created = await queryable.query(
        `INSERT INTO profile_categories (user_id, label, emoji, color, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, template.label, template.emoji, template.color, template.sortOrder]
    );

    return String(created.rows[0].id);
}

export async function ensureStarterLibraryForUser(queryable: Queryable, userId: string | number) {
    for (const template of STARTER_LIBRARY_TEMPLATE) {
        const categoryId = await ensureStarterCategory(queryable, userId, template);
        const existingItems = await queryable.query(
            `SELECT id
             FROM profile_items
             WHERE user_id = $1
               AND category_id = $2
             ORDER BY created_at ASC
             LIMIT 1`,
            [userId, categoryId]
        );

        if (existingItems.rows.length > 0) {
            continue;
        }

        await queryable.query(
            `INSERT INTO profile_items (
                user_id,
                category_id,
                title,
                media_url,
                media_type,
                description,
                tags,
                source,
                source_ref,
                metadata,
                is_private
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10::jsonb, $11)`,
            [
                userId,
                categoryId,
                template.item.title,
                template.item.mediaUrl,
                template.item.mediaType,
                template.item.description,
                template.item.tags,
                template.item.source,
                template.item.sourceRef,
                JSON.stringify({
                    seeded: true,
                    template_area: normalizeLabel(template.label)
                }),
                template.item.isPrivate
            ]
        );
    }
}
