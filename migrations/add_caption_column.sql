-- Add caption column to fusion_events table
-- This stores object detection captions like "Intrusion - Vehicle -"

ALTER TABLE fusion_events 
ADD COLUMN IF NOT EXISTS caption TEXT;

-- Create index for caption searches (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_fusion_events_caption 
  ON fusion_events(caption) 
  WHERE caption IS NOT NULL;

-- Update any existing intrusion events to have empty caption for now
-- (New events will have proper captions from the SSE stream)
UPDATE fusion_events 
SET caption = '' 
WHERE caption IS NULL 
  AND event_type = 'intrusion detected';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fusion_events' 
  AND column_name = 'caption'; 