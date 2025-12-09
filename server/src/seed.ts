import pool from './db';
import bcrypt from 'bcrypt';

async function seed() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting seed...');

        await client.query('BEGIN');

        // 1. Clear existing data
        await client.query('TRUNCATE TABLE order_items, orders, transactions, lessons, grow_systems, inventory, users RESTART IDENTITY CASCADE');

        // 2. Create Users
        const passwordHash = await bcrypt.hash('password123', 10);

        // User 1: Consumer (Eat Mode)
        const user1 = await client.query(
            `INSERT INTO users (email, password_hash, role, plyt_balance) 
       VALUES ($1, $2, 'consumer', 150.00) RETURNING id`,
            ['alice@example.com', passwordHash]
        );

        // User 2: Farmer (Grow Mode)
        const user2 = await client.query(
            `INSERT INTO users (email, password_hash, role, plyt_balance) 
       VALUES ($1, $2, 'farmer', 5000.00) RETURNING id`,
            ['farmer_bob@example.com', passwordHash]
        );

        console.log('✅ Users created');

        // 3. Populate Inventory (Eat Mode)
        const inventoryItems = [
            {
                name: 'Organic Bali Spinach',
                description: 'Freshly harvested spinach from Bedugul highlands. Perfect for salads.',
                price: 15.00,
                image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80',
                category: 'Vegetables',
                stock: 50,
                unit: 'bunch'
            },
            {
                name: 'Hydroponic Red Carrots',
                description: 'Sweet and crunchy carrots grown in nutrient-rich water systems.',
                price: 22.00,
                image_url: 'https://images.unsplash.com/photo-1445282768818-728615cc8ca2?auto=format&fit=crop&w=400&q=80',
                category: 'Vegetables',
                stock: 30,
                unit: 'kg'
            },
            {
                name: 'Cherry Tomatoes',
                description: 'Bursting with flavor, vine-ripened organic tomatoes.',
                price: 25.00,
                image_url: 'https://images.unsplash.com/photo-1546470427-227c73699412?auto=format&fit=crop&w=400&q=80',
                category: 'Vegetables',
                stock: 40,
                unit: 'pack'
            },
            {
                name: 'Fresh Bok Choy',
                description: 'Crisp and tender, ideal for stir-fries.',
                price: 12.00,
                image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
                category: 'Vegetables',
                stock: 60,
                unit: 'bunch'
            }
        ];

        for (const item of inventoryItems) {
            await client.query(
                `INSERT INTO inventory (farmer_id, name, description, price_plyt, image_url, category, quantity, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [user2.rows[0].id, item.name, item.description, item.price, item.image_url, item.category, item.stock, item.unit]
            );
        }
        console.log('✅ Inventory populated');

        // 4. Populate Grow Systems (Grow Mode)
        const growSystems = [
            {
                name: 'Vertical Hydro Tower',
                description: 'Space-saving vertical tower. Grow up to 20 plants in 2 sq ft. Includes pump and timer.',
                price: 450.00,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Hydroponic_farming.jpg/640px-Hydroponic_farming.jpg',
                type: 'Hydroponic',
                capacity: 20
            },
            {
                name: 'Backyard NFT System',
                description: 'Nutrient Film Technique system for leafy greens. Kit includes channels, reservoir, and stands.',
                price: 2500.00,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Hydroponic_NFT_Lettuce.jpg/640px-Hydroponic_NFT_Lettuce.jpg',
                type: 'NFT',
                capacity: 100
            },
            {
                name: 'Desktop Herb Garden',
                description: 'Smart indoor garden with LED grow lights. Perfect for kitchen herbs.',
                price: 120.00,
                image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Aerogarden_Sprout_LED_Model.jpg/640px-Aerogarden_Sprout_LED_Model.jpg',
                type: 'Indoor Smart',
                capacity: 6
            }
        ];

        for (const system of growSystems) {
            await client.query(
                `INSERT INTO grow_systems (name, description, price_plyt, image_url, type, features)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [system.name, system.description, system.price, system.image_url, system.type, [`Capacity: ${system.capacity} plants`]]
            );
        }
        console.log('✅ Grow Systems populated');

        // 5. Populate Lessons
        const lessons = [
            {
                user_id: user1.rows[0].id,
                title: 'Introduction to Hydroponics',
                content: 'Hydroponics is a method of growing plants without soil, using mineral nutrient solutions in a water solvent...'
            },
            {
                user_id: user1.rows[0].id,
                title: 'Maintaining pH Levels',
                content: 'The optimal pH range for most hydroponic crops is between 5.5 and 6.5...'
            }
        ];

        for (const lesson of lessons) {
            await client.query(
                `INSERT INTO lessons (user_id, title, content) VALUES ($1, $2, $3)`,
                [lesson.user_id, lesson.title, lesson.content]
            );
        }
        console.log('✅ Lessons populated');

        await client.query('COMMIT');
        console.log('🎉 Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

seed();
