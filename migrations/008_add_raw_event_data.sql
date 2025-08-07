-- Add raw_event_data column to fusion_events table
-- This stores the complete unmodified SSE JSON payload for debugging and analysis

ALTER TABLE fusion_events 
ADD COLUMN IF NOT EXISTS raw_event_data JSONB;

-- Create index for raw event data queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_fusion_events_raw_data 
  ON fusion_events USING GIN (raw_event_data)
  WHERE raw_event_data IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN fusion_events.raw_event_data IS 
  'Complete unmodified SSE event JSON payload from Fusion API for debugging and analysis';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fusion_events' 
  AND column_name = 'raw_event_data';
