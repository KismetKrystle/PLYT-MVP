import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import bcrypt from 'bcrypt';
import pool from '../db';

async function ensureUser(name: string, email: string, role: 'consumer' | 'farmer' | 'expert') {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    const passwordHash = await bcrypt.hash('Phase1Demo!123', 10);
    const created = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name, email, passwordHash, role]
    );
    return created.rows[0].id;
}

async function seed() {
    try {
        console.log('Seeding Phase 1 demo users + profiles...');

        const consumerId = await ensureUser('Demo Consumer', 'demo.consumer@plyt.local', 'consumer');
        const farmerId = await ensureUser('Demo Farmer', 'demo.farmer@plyt.local', 'farmer');
        const expertId = await ensureUser('Demo Expert', 'demo.expert@plyt.local', 'expert');

        await pool.query(
            `INSERT INTO consumer_profiles (user_id, profile_data)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (user_id)
             DO UPDATE SET profile_data = EXCLUDED.profile_data, updated_at = NOW()`,
            [
                consumerId,
                JSON.stringify({
                    dietary_preferences: ['vegan', 'gluten-free'],
                    health_conditions: ['diabetes'],
                    wellness_goals: ['weight loss', 'more energy'],
                    location: 'Austin, TX'
                })
            ]
        );

        await pool.query(
            `INSERT INTO farmer_profiles (user_id, profile_data)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (user_id)
             DO UPDATE SET profile_data = EXCLUDED.profile_data, updated_at = NOW()`,
            [
                farmerId,
                JSON.stringify({
                    business_name: 'Green Valley Farm',
                    description: 'Organic vegetable farm specializing in heirloom varieties',
                    location: 'Austin, TX',
                    product_types: ['vegetables', 'herbs', 'eggs'],
                    subscription_tier: 'free'
                })
            ]
        );

        await pool.query(
            `INSERT INTO expert_profiles (user_id, profile_data)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (user_id)
             DO UPDATE SET profile_data = EXCLUDED.profile_data, updated_at = NOW()`,
            [
                expertId,
                JSON.stringify({
                    display_name: 'Dr. Jane Smith',
                    credentials: 'PhD Nutrition',
                    expertise_areas: ['gut health', 'plant based diets'],
                    bio: '10 years experience in natural food and wellness'
                })
            ]
        );

        console.log('Seed complete.');
        console.log('Demo login password for all seeded users: Phase1Demo!123');
    } catch (error) {
        console.error('Seed failed:', error);
    } finally {
        await pool.end();
    }
}

seed();

