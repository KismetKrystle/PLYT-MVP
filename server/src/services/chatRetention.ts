import type { Pool, PoolClient } from 'pg';
import pool from '../db';

export const CHAT_HISTORY_RETENTION_DAYS = 7;
export const ACTIVE_CONVERSATION_WHERE_SQL = `(saved_by_user = TRUE OR health_relevant = TRUE OR expires_at IS NULL OR expires_at > NOW())`;

export type ChatRetentionPreference = '1_day' | '7_days' | '30_days' | 'keep_saved_only';

export function getChatRetentionPreference(profileData: any): ChatRetentionPreference {
    const preference = String(profileData?.user_settings?.chat_retention_preference || '').trim();
    if (preference === '1_day' || preference === '30_days' || preference === 'keep_saved_only') {
        return preference;
    }
    return '7_days';
}

export function getChatRetentionDays(profileData: any): number {
    const preference = getChatRetentionPreference(profileData);
    if (preference === '1_day') return 1;
    if (preference === '30_days') return 30;
    if (preference === 'keep_saved_only') return 1;
    return CHAT_HISTORY_RETENTION_DAYS;
}

type Queryable = Pool | PoolClient;

function hasFavoriteConversation(profileData: any, conversationId: string) {
    const favorites = Array.isArray(profileData?.favorite_chats) ? profileData.favorite_chats : [];
    return favorites.some((entry: any) => {
        if (typeof entry === 'string') return entry.trim() === conversationId;
        if (!entry || typeof entry !== 'object') return false;
        return String(entry.id || '').trim() === conversationId;
    });
}

export async function ensureConversationRetentionColumns(queryable: Queryable = pool) {
    await queryable.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;`);
    await queryable.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS saved_by_user BOOLEAN NOT NULL DEFAULT FALSE;`);
    await queryable.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS health_relevant BOOLEAN NOT NULL DEFAULT FALSE;`);
    await queryable.query(
        `UPDATE conversations
         SET expires_at = COALESCE(updated_at, created_at, NOW()) + INTERVAL '${CHAT_HISTORY_RETENTION_DAYS} days'
         WHERE expires_at IS NULL`
    );
}

export async function cleanupExpiredConversations(queryable: Queryable = pool) {
    await queryable.query(
        `DELETE FROM conversations
         WHERE saved_by_user = FALSE
           AND health_relevant = FALSE
           AND expires_at IS NOT NULL
           AND expires_at <= NOW()`
    );
}

export async function markConversationSavedByUser(
    queryable: Queryable,
    userId: string | number,
    conversationId: string,
    savedByUser: boolean
) {
    await queryable.query(
        `UPDATE conversations
         SET saved_by_user = $1
         WHERE id = $2 AND user_id = $3`,
        [savedByUser, conversationId, userId]
    );
}

export async function syncConversationSavedState(
    queryable: Queryable,
    userId: string | number,
    conversationId: string,
    profileData?: any
) {
    const effectiveProfileData = profileData ?? ((
        await queryable.query(
            `SELECT profile_data
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [userId]
        )
    ).rows[0]?.profile_data || {});

    const favoriteSaved = hasFavoriteConversation(effectiveProfileData, conversationId);
    const librarySavedResult = await queryable.query(
        `SELECT 1
         FROM profile_items
         WHERE user_id = $1
           AND source_conversation_id = $2
         LIMIT 1`,
        [userId, conversationId]
    );

    await markConversationSavedByUser(
        queryable,
        userId,
        conversationId,
        favoriteSaved || librarySavedResult.rows.length > 0
    );
}
