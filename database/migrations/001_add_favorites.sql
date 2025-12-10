-- Migration: Add favorites column to users table
-- Date: 2025-01-xx
-- Description: Adds a JSONB column to store user's favorite question IDs

-- Add favorites column to users table (PostgreSQL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_favorites ON users USING GIN (favorites);

-- Add comment to column
COMMENT ON COLUMN users.favorites IS 'Array of favorite question IDs stored as JSONB';

-- Verification query (uncomment to check)
-- SELECT id, username, favorites FROM users LIMIT 5;
