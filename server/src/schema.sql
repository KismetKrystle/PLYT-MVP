-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'consumer', -- consumer, farmer, distributor, servicer
  wallet_address VARCHAR(255),
  plyt_balance DECIMAL(20, 8) DEFAULT 0,
  staked_balance DECIMAL(20, 8) DEFAULT 0,
  full_name VARCHAR(255),
  phone_number VARCHAR(50),
  location_city VARCHAR(100),
  location_address TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_data JSONB DEFAULT '{}', -- Flexible store for role-specific settings/prefs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  farmer_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- leaf greens, veggies, fruits, nuts, grains, herbs, powders, etc.
  description TEXT,
  price_plyt DECIMAL(20, 8) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg',
  image_url TEXT,
  metadata JSONB DEFAULT '{}', -- Extra product data (raw, bio, etc)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES inventory(id),
  user_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grow_systems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- hydroponic, soil, kit
  description TEXT,
  price_plyt DECIMAL(20, 8) NOT NULL,
  features TEXT[],
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- type: health_doc, location, research
  embedding vector(1536), -- For semantic search (OpenAI 1536 dim)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_resources (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'eat' or 'grow'
  status VARCHAR(50) DEFAULT 'pending',
  total_plyt DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  item_type VARCHAR(50) NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(20, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  reference_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
