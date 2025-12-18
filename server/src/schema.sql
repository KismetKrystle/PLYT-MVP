CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'consumer', -- consumer, farmer, admin
  wallet_address VARCHAR(255),
  plyt_balance DECIMAL(20, 8) DEFAULT 0,
  staked_balance DECIMAL(20, 8) DEFAULT 0,
  staked_balance DECIMAL(20, 8) DEFAULT 0,
  full_name VARCHAR(255),
  phone_number VARCHAR(50),
  location_city VARCHAR(100),
  location_address TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- veg, fruit, meat, etc.
  description TEXT,
  price_plyt DECIMAL(20, 8) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grow_systems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- hydroponic, soil, kit
  description TEXT,
  price_plyt DECIMAL(20, 8) NOT NULL,
  features TEXT[], -- Array of feature strings
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL, -- The lesson content (AI generated)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'eat' or 'grow'
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, fulfilled, cancelled
  total_plyt DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  item_type VARCHAR(50) NOT NULL, -- 'inventory' or 'grow_system'
  item_id INTEGER NOT NULL, -- ID from inventory or grow_systems
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(20, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- deposit, withdrawal, purchase, stake, unstake
  amount DECIMAL(20, 8) NOT NULL,
  reference_id VARCHAR(255), -- e.g., order_id or xrpl_tx_hash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
