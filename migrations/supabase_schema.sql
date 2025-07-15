-- Fusion Alarm Events Database Schema for Supabase
-- Multi-tenant structure: Organization > Location > Events

-- Enable RLS (Row Level Security) for multi-tenancy
CREATE TABLE IF NOT EXISTS fusion_events (
  id          TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL,
  location_id     TEXT,
  space_id        TEXT,
  device_id       TEXT,
  
  -- Event details
  event_type      TEXT NOT NULL,
  category        TEXT,
  device_name     TEXT,
  space_name      TEXT,
  
  -- Timestamps
  event_timestamp TIMESTAMPTZ,
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  
  -- Lightweight data only (no large payloads)
  display_state   TEXT,
  event_data      JSONB, -- Small metadata only
  caption         TEXT, -- Object detection caption (e.g., "Intrusion - Vehicle -")
  
  -- Performance indexes
  CONSTRAINT fusion_events_org_check CHECK (organization_id != ''),
  CONSTRAINT fusion_events_type_check CHECK (event_type != '')
);

-- Performance indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_fusion_events_org_location 
  ON fusion_events(organization_id, location_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_fusion_events_org_type 
  ON fusion_events(organization_id, event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_fusion_events_received_at 
  ON fusion_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_fusion_events_device 
  ON fusion_events(organization_id, device_name, received_at DESC);

-- Enable Row Level Security for multi-tenancy
ALTER TABLE fusion_events ENABLE ROW LEVEL SECURITY;

-- Create policy for API access (you can customize this based on your auth)
CREATE POLICY "Enable all access for service role" ON fusion_events
  FOR ALL USING (true);

-- Optional: Create a view for recent events (last 24 hours)
CREATE OR REPLACE VIEW recent_events AS
SELECT *
FROM fusion_events
WHERE received_at >= NOW() - INTERVAL '24 hours'
ORDER BY received_at DESC
LIMIT 1000; 