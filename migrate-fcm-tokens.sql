-- Migration script to update fcm_tokens column structure
-- Run this script in your database to properly handle FCM tokens

-- Step 1: Backup current data (optional but recommended)
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Update existing fcm_tokens column to JSONB
-- This will convert existing TEXT[] or TEXT data to proper JSONB format

-- First, let's see what we have currently
SELECT 
  id, 
  fcm_tokens, 
  pg_typeof(fcm_tokens) as column_type,
  CASE 
    WHEN fcm_tokens IS NULL THEN 'NULL'
    WHEN fcm_tokens = '{}' THEN 'Empty array'
    WHEN fcm_tokens = '[]' THEN 'Empty JSON array'
    ELSE 'Has data'
  END as data_status
FROM users 
LIMIT 10;

-- Step 3: Convert existing data to JSONB format
-- Handle different scenarios:

-- Scenario 1: If column is already JSONB, do nothing
-- Scenario 2: If column is TEXT[] (PostgreSQL array), convert to JSONB
-- Scenario 3: If column is TEXT with JSON string, convert to JSONB
-- Scenario 4: If column is NULL or empty, set to empty JSON array

-- Update the column type to JSONB
ALTER TABLE users 
ALTER COLUMN fcm_tokens TYPE JSONB 
USING 
  CASE 
    WHEN fcm_tokens IS NULL THEN '[]'::jsonb
    WHEN fcm_tokens = '{}' THEN '[]'::jsonb
    WHEN fcm_tokens = '[]' THEN '[]'::jsonb
    WHEN pg_typeof(fcm_tokens) = 'text[]'::regtype THEN 
      -- Convert PostgreSQL array to JSONB
      CASE 
        WHEN array_length(fcm_tokens, 1) IS NULL THEN '[]'::jsonb
        ELSE to_jsonb(fcm_tokens)
      END
    WHEN pg_typeof(fcm_tokens) = 'text'::regtype THEN
      -- Try to parse as JSON, fallback to empty array
      CASE 
        WHEN fcm_tokens ~ '^\[.*\]$' THEN fcm_tokens::jsonb
        ELSE '[]'::jsonb
      END
    ELSE '[]'::jsonb
  END;

-- Step 4: Set default value
ALTER TABLE users 
ALTER COLUMN fcm_tokens SET DEFAULT '[]'::jsonb;

-- Step 5: Verify the migration
SELECT 
  id, 
  fcm_tokens, 
  pg_typeof(fcm_tokens) as column_type,
  CASE 
    WHEN fcm_tokens IS NULL THEN 'NULL'
    WHEN fcm_tokens = '[]'::jsonb THEN 'Empty JSON array'
    WHEN jsonb_array_length(fcm_tokens) = 0 THEN 'Empty JSON array'
    ELSE 'Has ' || jsonb_array_length(fcm_tokens) || ' tokens'
  END as data_status
FROM users 
LIMIT 10;

-- Step 6: Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_fcm_tokens ON users USING GIN (fcm_tokens);

-- Step 7: Test the migration
-- Try to insert a test FCM token
UPDATE users 
SET fcm_tokens = '["test-token-123"]'::jsonb 
WHERE id = (SELECT id FROM users LIMIT 1);

-- Verify the update worked
SELECT id, fcm_tokens, jsonb_array_length(fcm_tokens) as token_count
FROM users 
WHERE fcm_tokens @> '["test-token-123"]'::jsonb;

-- Clean up test data
UPDATE users 
SET fcm_tokens = '[]'::jsonb 
WHERE fcm_tokens @> '["test-token-123"]'::jsonb;

-- Final verification
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN fcm_tokens IS NOT NULL THEN 1 END) as users_with_fcm_tokens,
  COUNT(CASE WHEN jsonb_array_length(fcm_tokens) > 0 THEN 1 END) as users_with_active_tokens
FROM users;
