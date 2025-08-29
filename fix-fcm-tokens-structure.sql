-- Fix FCM tokens column structure in users table
-- This script fixes the default value and ensures proper JSONB format

-- Step 1: Check current structure
SELECT 
  column_name, 
  data_type, 
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'fcm_tokens';

-- Step 2: Fix the default value from '{}' to '[]'::jsonb
ALTER TABLE users 
ALTER COLUMN fcm_tokens SET DEFAULT '[]'::jsonb;

-- Step 3: Update existing records that have '{}' to '[]'
UPDATE users 
SET fcm_tokens = '[]'::jsonb 
WHERE fcm_tokens = '{}' OR fcm_tokens IS NULL;

-- Step 4: Verify the fix
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
LIMIT 5;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_fcm_tokens ON users USING GIN (fcm_tokens);

-- Step 6: Test inserting a token
UPDATE users 
SET fcm_tokens = '["test-token-123"]'::jsonb 
WHERE id = (SELECT id FROM users LIMIT 1);

-- Step 7: Verify the test worked
SELECT id, fcm_tokens, jsonb_array_length(fcm_tokens) as token_count
FROM users 
WHERE fcm_tokens @> '["test-token-123"]'::jsonb;

-- Step 8: Clean up test data
UPDATE users 
SET fcm_tokens = '[]'::jsonb 
WHERE fcm_tokens @> '["test-token-123"]'::jsonb;

-- Final verification
SELECT 
  'FCM tokens structure fixed successfully' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN fcm_tokens IS NOT NULL THEN 1 END) as users_with_fcm_tokens,
  COUNT(CASE WHEN jsonb_array_length(fcm_tokens) > 0 THEN 1 END) as users_with_active_tokens
FROM users;
