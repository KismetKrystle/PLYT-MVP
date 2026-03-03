import pool from '../db';

type Role = 'consumer' | 'farmer' | 'expert' | 'distributor' | string;

export async function fetchRoleProfileData(userId: string | number, role: Role) {
    const userResult = await pool.query('SELECT profile_data FROM users WHERE id = $1 LIMIT 1', [userId]);
    const userProfile = userResult.rows[0]?.profile_data || {};

    const consumerResult = await pool.query('SELECT profile_data FROM consumer_profiles WHERE user_id = $1 LIMIT 1', [userId]);
    const consumerProfile = consumerResult.rows[0]?.profile_data || {};
    const consumerHealthProfile = { ...userProfile, ...consumerProfile };

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
