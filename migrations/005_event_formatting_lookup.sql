-- Migration: Event Formatting Lookup Table
-- Simple, editable table for customizing event descriptions
-- Date: 2025-07-17

-- Create event formatting rules table
CREATE TABLE IF NOT EXISTS event_formatting_rules (
  id SERIAL PRIMARY KEY,
  
  -- Matching criteria (all optional - more specific matches take priority)
  device_name_pattern TEXT,           -- e.g., '%light%', 'BBQ Back Door Light', etc.
  device_type TEXT,                   -- e.g., 'light', 'switch', 'door', 'lock'
  event_type_pattern TEXT,            -- e.g., '%state%', 'device_state_change'
  state_from TEXT,                    -- e.g., 'off', 'closed'
  state_to TEXT,                      -- e.g., 'on', 'open'
  
  -- What to display
  primary_label TEXT NOT NULL,        -- e.g., '{device_name}', 'Light Control'
  secondary_label TEXT NOT NULL,      -- e.g., 'turned On', 'opened'
  
  -- Priority and metadata
  priority INTEGER DEFAULT 100,      -- Lower numbers = higher priority
  enabled BOOLEAN DEFAULT true,
  description TEXT,                   -- Human description of this rule
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add some default rules for common scenarios
INSERT INTO event_formatting_rules (device_name_pattern, device_type, state_to, primary_label, secondary_label, priority, description) VALUES
-- Light devices turning on/off
('%light%', 'light', 'on', '{device_name}', 'turned On', 10, 'Lights turning on'),
('%light%', 'light', 'off', '{device_name}', 'turned Off', 10, 'Lights turning off'),
('%bulb%', 'light', 'on', '{device_name}', 'turned On', 10, 'Bulbs turning on'),
('%bulb%', 'light', 'off', '{device_name}', 'turned Off', 10, 'Bulbs turning off'),
('%lamp%', 'light', 'on', '{device_name}', 'turned On', 10, 'Lamps turning on'),
('%lamp%', 'light', 'off', '{device_name}', 'turned Off', 10, 'Lamps turning off'),

-- Switch devices
('%switch%', 'switch', 'on', '{device_name}', 'turned On', 20, 'Switches turning on'),
('%switch%', 'switch', 'off', '{device_name}', 'turned Off', 20, 'Switches turning off'),

-- Outlet devices
('%outlet%', 'outlet', 'on', '{device_name}', 'turned On', 30, 'Outlets turning on'),
('%outlet%', 'outlet', 'off', '{device_name}', 'turned Off', 30, 'Outlets turning off'),
('%plug%', 'outlet', 'on', '{device_name}', 'turned On', 30, 'Plugs turning on'),
('%plug%', 'outlet', 'off', '{device_name}', 'turned Off', 30, 'Plugs turning off'),

-- Fan devices
('%fan%', 'fan', 'on', '{device_name}', 'turned On', 40, 'Fans turning on'),
('%fan%', 'fan', 'off', '{device_name}', 'turned Off', 40, 'Fans turning off'),

-- Door devices
('%door%', 'door', 'on', '{device_name}', 'opened', 50, 'Doors opening'),
('%door%', 'door', 'off', '{device_name}', 'closed', 50, 'Doors closing'),
('%garage%', 'door', 'on', '{device_name}', 'opened', 50, 'Garage doors opening'),
('%garage%', 'door', 'off', '{device_name}', 'closed', 50, 'Garage doors closing'),

-- Lock devices
('%lock%', 'lock', 'locked', '{device_name}', 'locked', 60, 'Locks locking'),
('%lock%', 'lock', 'unlocked', '{device_name}', 'unlocked', 60, 'Locks unlocking'),

-- Generic fallbacks (high priority numbers = low priority)
(NULL, 'light', 'on', '{device_name}', 'turned On', 900, 'Generic light on'),
(NULL, 'light', 'off', '{device_name}', 'turned Off', 900, 'Generic light off'),
(NULL, 'switch', 'on', '{device_name}', 'turned On', 900, 'Generic switch on'),
(NULL, 'switch', 'off', '{device_name}', 'turned Off', 900, 'Generic switch off'),
(NULL, NULL, NULL, '{device_name}', 'updated', 999, 'Ultimate fallback');

-- Create index for fast lookups
CREATE INDEX idx_event_formatting_rules_lookup ON event_formatting_rules(device_type, enabled, priority);
CREATE INDEX idx_event_formatting_rules_pattern ON event_formatting_rules(device_name_pattern, enabled, priority);

-- Updated function to use the lookup table
CREATE OR REPLACE FUNCTION generate_event_description_from_rules(device_name TEXT, state TEXT, event_type TEXT)
RETURNS JSONB AS $$
DECLARE
  rule RECORD;
  detected_device_type TEXT;
  normalized_state TEXT;
  primary_label TEXT;
  secondary_label TEXT;
  final_primary TEXT;
  final_secondary TEXT;
BEGIN
  -- Detect device type and normalize state
  detected_device_type := detect_device_type(device_name);
  normalized_state := normalize_device_state(state);
  
  -- Look for matching rule (ordered by priority)
  SELECT * INTO rule
  FROM event_formatting_rules r
  WHERE r.enabled = true
    AND (r.device_name_pattern IS NULL OR device_name ILIKE r.device_name_pattern)
    AND (r.device_type IS NULL OR r.device_type = detected_device_type)
    AND (r.event_type_pattern IS NULL OR event_type ILIKE r.event_type_pattern)
    AND (r.state_to IS NULL OR r.state_to = normalized_state OR r.state_to = state)
  ORDER BY 
    CASE WHEN r.device_name_pattern IS NOT NULL THEN 1 ELSE 2 END,  -- Exact device name patterns first
    CASE WHEN r.device_type IS NOT NULL THEN 1 ELSE 2 END,          -- Device type matches second
    CASE WHEN r.state_to IS NOT NULL THEN 1 ELSE 2 END,             -- State matches third
    r.priority ASC                                                   -- Then by priority
  LIMIT 1;
  
  -- If we found a rule, use it
  IF rule.id IS NOT NULL THEN
    primary_label := rule.primary_label;
    secondary_label := rule.secondary_label;
  ELSE
    -- Fallback to basic formatting
    primary_label := '{device_name}';
    secondary_label := 'updated';
  END IF;
  
  -- Replace placeholders
  final_primary := REPLACE(primary_label, '{device_name}', COALESCE(device_name, 'Unknown Device'));
  final_secondary := REPLACE(secondary_label, '{device_name}', COALESCE(device_name, 'Unknown Device'));
  final_secondary := REPLACE(final_secondary, '{state}', COALESCE(state, 'unknown'));
  final_secondary := REPLACE(final_secondary, '{normalized_state}', COALESCE(normalized_state, 'unknown'));
  
  RETURN jsonb_build_object(
    'title', final_primary,
    'description', final_secondary,
    'device_type', detected_device_type,
    'normalized_state', normalized_state,
    'rule_id', rule.id,
    'rule_description', rule.description
  );
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to use the new lookup function
CREATE OR REPLACE FUNCTION format_event_trigger()
RETURNS TRIGGER AS $$
DECLARE
  formatted_info JSONB;
BEGIN
  -- Only format state change events
  IF NEW.event_type ~* '(state|changed|device)' AND NEW.device_name IS NOT NULL THEN
    formatted_info := generate_event_description_from_rules(NEW.device_name, NEW.display_state, NEW.event_type);
    
    -- Store the formatted information in event_data
    IF NEW.event_data IS NULL THEN
      NEW.event_data := jsonb_build_object();
    END IF;
    
    NEW.event_data := NEW.event_data || jsonb_build_object(
      'formatted_title', formatted_info->>'title',
      'formatted_description', formatted_info->>'description',
      'device_type', formatted_info->>'device_type',
      'normalized_state', formatted_info->>'normalized_state',
      'formatting_rule_id', formatted_info->>'rule_id',
      'formatting_rule_description', formatted_info->>'rule_description'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger
DROP TRIGGER IF EXISTS format_event_trigger ON fusion_events;
CREATE TRIGGER format_event_trigger
  BEFORE INSERT OR UPDATE ON fusion_events
  FOR EACH ROW
  EXECUTE FUNCTION format_event_trigger();

-- Update existing events to use the new lookup table
UPDATE fusion_events 
SET event_data = COALESCE(event_data, '{}'::jsonb) || generate_event_description_from_rules(device_name, display_state, event_type)
WHERE device_name IS NOT NULL 
  AND event_type ~* '(state|changed|device)';

-- Add comments
COMMENT ON TABLE event_formatting_rules IS 'Lookup table for customizing event descriptions - easily editable through Supabase dashboard';
COMMENT ON FUNCTION generate_event_description_from_rules(TEXT, TEXT, TEXT) IS 'Generates event descriptions using the lookup table rules';

-- Create a simple view for easier rule management
CREATE OR REPLACE VIEW event_formatting_summary AS
SELECT 
  id,
  COALESCE(device_name_pattern, 'Any Device') as device_pattern,
  COALESCE(device_type, 'Any Type') as type,
  COALESCE(state_to, 'Any State') as state,
  primary_label || ' - ' || secondary_label as display_format,
  priority,
  enabled,
  description
FROM event_formatting_rules
ORDER BY priority, id; 