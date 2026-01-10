-- Add level_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES levels(id);

-- Create Intermediate Level Product for Gulf Arabic
INSERT INTO products (name, description, price, scope, dialect_id, level_id)
VALUES (
  'Gulf Arabic - Intermediate',
  'Master intermediate Gulf Arabic with 64 lessons covering work, health, travel, and more',
  19.99,
  'level',
  'a1b2c3d4-1111-1111-1111-111111111111',
  'c3d4e5f6-3333-3333-3333-333333333333'
);

-- Create Advanced Level Product for Gulf Arabic
INSERT INTO products (name, description, price, scope, dialect_id, level_id)
VALUES (
  'Gulf Arabic - Advanced',
  'Master advanced Gulf Arabic with 64 lessons covering politics, business, literature, and more',
  24.99,
  'level',
  'a1b2c3d4-1111-1111-1111-111111111111',
  'd4e5f607-4444-4444-4444-444444444444'
);

-- Update existing Gulf Arabic Beginner product to have level_id
UPDATE products 
SET level_id = 'b2c3d4e5-2222-2222-2222-222222222222', scope = 'level'
WHERE dialect_id = 'a1b2c3d4-1111-1111-1111-111111111111' 
AND level_id IS NULL
AND scope = 'dialect';