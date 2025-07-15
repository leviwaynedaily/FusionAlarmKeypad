-- Migration: Areas to Spaces
-- Rename area_id and area_name columns to space_id and space_name
-- Date: 2025-07-14

-- Step 1: Drop the view that depends on the columns
DROP VIEW IF EXISTS recent_events;

-- Step 2: Rename columns in fusion_events table
ALTER TABLE fusion_events 
  RENAME COLUMN area_id TO space_id;

ALTER TABLE fusion_events 
  RENAME COLUMN area_name TO space_name;

-- Step 3: Update any existing data comments or descriptions
COMMENT ON COLUMN fusion_events.space_id IS 'Space UUID that this event belongs to';
COMMENT ON COLUMN fusion_events.space_name IS 'Space name for display purposes';

-- Step 4: Recreate the view with new column names
CREATE OR REPLACE VIEW recent_events AS
SELECT *
FROM fusion_events
WHERE received_at >= NOW() - INTERVAL '24 hours'
ORDER BY received_at DESC
LIMIT 1000; 