-- Add user preferences table for storing event timeline settings
-- Multi-tenant structure: Organization > User > Location > Preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  id              TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT    NOT NULL,
  user_id         TEXT    NOT NULL DEFAULT 'default',
  location_id     TEXT,
  
  -- Event filter settings (JSON structure matching EventFilterSettings interface)
  event_filter_settings    JSONB NOT NULL DEFAULT '{}',
  
  -- Custom event names mapping (eventType -> customName)
  custom_event_names       JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_preferences_org_check CHECK (organization_id != ''),
  CONSTRAINT user_preferences_user_check CHECK (user_id != ''),
  
  -- Unique constraint per organization, user, and location
  UNIQUE(organization_id, user_id, location_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_org_user 
  ON user_preferences(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_org_user_location 
  ON user_preferences(organization_id, user_id, location_id);

-- Enable Row Level Security for multi-tenancy
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for API access
CREATE POLICY "Enable all access for service role" ON user_preferences
  FOR ALL USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on changes
CREATE TRIGGER user_preferences_updated_at_trigger
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at(); 