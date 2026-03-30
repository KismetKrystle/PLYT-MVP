import pool from '../db';

type Role = 'consumer' | 'farmer' | 'expert' | 'distributor' | string;

function normalizeProfileLocation(profile: any) {
    const rawLocation = profile?.location;

    if (rawLocation && typeof rawLocation === 'object' && !Array.isArray(rawLocation)) {
        return {
            city: String(rawLocation.city || profile?.location_city || '').trim(),
            address: String(rawLocation.address || profile?.location_address || '').trim()
        };
    }

    const stringLocation = typeof rawLocation === 'string' ? rawLocation.trim() : '';
    return {
        city: String(profile?.location_city || '').trim(),
        address: String(profile?.location_address || stringLocation).trim()
    };
}

function normalizeStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

export async function fetchRoleProfileData(userId: string | number, role: Role) {
    const userResult = await pool.query('SELECT name, profile_data FROM users WHERE id = $1 LIMIT 1', [userId]);
    const userProfile = userResult.rows[0]?.profile_data || {};
    const accountName = String(userResult.rows[0]?.name || '').trim();

    const consumerResult = await pool.query('SELECT profile_data FROM consumer_profiles WHERE user_id = $1 LIMIT 1', [userId]);
    const consumerProfile = consumerResult.rows[0]?.profile_data || {};
    const mergedProfile = { ...userProfile, ...consumerProfile };
    const normalizedLocation = normalizeProfileLocation(mergedProfile);
    const consumerHealthProfile = {
        ...mergedProfile,
        full_name: String(mergedProfile?.full_name || accountName || '').trim(),
        location: normalizedLocation,
        location_city: normalizedLocation.city,
        location_address: normalizedLocation.address
    };

    if (role === 'consumer') {
        return consumerHealthProfile;
    }

    if (role === 'farmer') {
        const result = await pool.query('SELECT profile_data FROM farmer_profiles WHERE user_id = $1 LIMIT 1', [userId]);
        return {
            consumer_health_profile: consumerHealthProfile,
            farmer_profile: result.rows[0]?.profile_data || {}
        };
    }

    if (role === 'distributor') {
        const result = await pool.query('SELECT profile_data FROM farmer_profiles WHERE user_id = $1 LIMIT 1', [userId]);
        return {
            consumer_health_profile: consumerHealthProfile,
            distributor_profile: result.rows[0]?.profile_data || {}
        };
    }

    if (role === 'expert') {
        const result = await pool.query('SELECT profile_data FROM expert_profiles WHERE user_id = $1 LIMIT 1', [userId]);
        return {
            consumer_health_profile: consumerHealthProfile,
            expert_profile: result.rows[0]?.profile_data || {}
        };
    }

    return {
        consumer_health_profile: consumerHealthProfile
    };
}

export function isProfileComplete(profile: any): boolean {
    const normalizedLocation = normalizeProfileLocation(profile);
    const healthConditions = normalizeStringList(profile?.health_conditions);
    const dietaryPreferences = normalizeStringList(profile?.dietary_preferences);
    const allergies = normalizeStringList(profile?.allergies);
    const wellnessGoals = normalizeStringList(profile?.wellness_goals);
    const healthAreas = normalizeStringList(profile?.health_areas);
    const notes = String(profile?.notes || '').trim();
    const hasHealthDocuments = Array.isArray(profile?.health_documents) && profile.health_documents.some(Boolean);
    const hasLocation = normalizedLocation.city.length > 0 || normalizedLocation.address.length > 0;
    const hasHealthContext =
        healthConditions.length > 0 ||
        dietaryPreferences.length > 0 ||
        allergies.length > 0 ||
        wellnessGoals.length > 0 ||
        healthAreas.length > 0 ||
        notes.length > 0 ||
        hasHealthDocuments;

    return hasHealthContext || hasLocation;
}
