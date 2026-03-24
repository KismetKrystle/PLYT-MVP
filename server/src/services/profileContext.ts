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
    const fullName = String(profile?.full_name || profile?.name || '').trim();

    return (
        Array.isArray(profile?.health_conditions) &&
        profile.health_conditions.length > 0 &&
        Array.isArray(profile?.dietary_preferences) &&
        profile.dietary_preferences.length > 0 &&
        fullName.length > 0 &&
        (normalizedLocation.city.length > 0 || normalizedLocation.address.length > 0)
    );
}
