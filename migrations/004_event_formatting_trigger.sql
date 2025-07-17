-- Migration: Add Event Formatting Trigger
-- This trigger automatically formats event descriptions based on device type and state
-- Date: 2025-07-17

-- Create a function to detect device type
CREATE OR REPLACE FUNCTION detect_device_type(device_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF device_name IS NULL THEN
    RETURN 'unknown';
  END IF;
  
  device_name := LOWER(device_name);
  
  -- Light devices (most specific first)
  IF device_name LIKE '%light%' OR device_name LIKE '%bulb%' OR device_name LIKE '%lamp%' THEN
    RETURN 'light';
  END IF;
  
  -- Switch devices
  IF device_name LIKE '%switch%' THEN
    RETURN 'switch';
  END IF;
  
  -- Outlet/plug devices
  IF device_name LIKE '%outlet%' OR device_name LIKE '%plug%' OR device_name LIKE '%socket%' THEN
    RETURN 'outlet';
  END IF;
  
  -- Fan devices
  IF device_name LIKE '%fan%' THEN
    RETURN 'fan';
  END IF;
  
  -- Dimmer devices
  IF device_name LIKE '%dimmer%' THEN
    RETURN 'dimmer';
  END IF;
  
  -- Door devices
  IF device_name LIKE '%door%' OR device_name LIKE '%garage%' THEN
    RETURN 'door';
  END IF;
  
  -- Lock devices
  IF device_name LIKE '%lock%' THEN
    RETURN 'lock';
  END IF;
  
  -- Camera devices
  IF device_name LIKE '%camera%' OR device_name LIKE '%cam%' THEN
    RETURN 'camera';
  END IF;
  
  -- Motion sensors
  IF device_name LIKE '%motion%' OR device_name LIKE '%sensor%' THEN
    RETURN 'sensor';
  END IF;
  
  RETURN 'unknown';
END;
$$ LANGUAGE plpgsql;

-- Create a function to normalize device state
CREATE OR REPLACE FUNCTION normalize_device_state(state TEXT)
RETURNS TEXT AS $$
BEGIN
  IF state IS NULL OR state = '' THEN
    RETURN '';
  END IF;
  
  state := LOWER(TRIM(state));
  
  -- On states
  IF state ~ '^(on|open|opened|active|enabled|armed|true|1|yes|up|high)$' THEN
    RETURN 'on';
  END IF;
  
  -- Off states
  IF state ~ '^(off|closed|inactive|disabled|disarmed|false|0|no|down|low)$' THEN
    RETURN 'off';
  END IF;
  
  RETURN state;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate event descriptions
CREATE OR REPLACE FUNCTION generate_event_description(device_name TEXT, state TEXT, event_type TEXT)
RETURNS JSONB AS $$
DECLARE
  device_type TEXT;
  normalized_state TEXT;
  title TEXT;
  description TEXT;
BEGIN
  device_type := detect_device_type(device_name);
  normalized_state := normalize_device_state(state);
  
  -- For controllable devices, use "Device Name turned On/Off" format
  IF device_type IN ('light', 'switch', 'outlet', 'fan') THEN
    IF normalized_state = 'on' THEN
      title := device_name || ' turned On';
      description := device_name || ' turned on';
    ELSIF normalized_state = 'off' THEN
      title := device_name || ' turned Off';
      description := device_name || ' turned off';
    ELSIF state IS NOT NULL AND state != '' THEN
      title := device_name || ' State Changed';
      description := device_name || ' changed to ' || INITCAP(state);
    ELSE
      title := device_name || ' Updated';
      description := device_name || ' status update';
    END IF;
  
  -- For doors, use action-based descriptions
  ELSIF device_type = 'door' THEN
    IF normalized_state = 'on' THEN
      title := device_name || ' Opened';
      description := device_name || ' was opened';
    ELSIF normalized_state = 'off' THEN
      title := device_name || ' Closed';
      description := device_name || ' was closed';
    ELSE
      title := device_name || ' State Changed';
      description := device_name || ' changed to ' || COALESCE(state, 'unknown');
    END IF;
  
  -- For locks, use action-based descriptions
  ELSIF device_type = 'lock' THEN
    IF state IS NOT NULL AND state ~* 'unlock' THEN
      title := device_name || ' Unlocked';
      description := device_name || ' was unlocked';
    ELSIF state IS NOT NULL AND state ~* 'lock' THEN
      title := device_name || ' Locked';
      description := device_name || ' was locked';
    ELSE
      title := device_name || ' State Changed';
      description := device_name || ' changed to ' || COALESCE(state, 'unknown');
    END IF;
  
  -- For cameras and sensors
  ELSIF device_type = 'camera' THEN
    title := device_name;
    description := 'activity detected';
  
  ELSIF device_type = 'sensor' THEN
    title := device_name;
    description := 'sensor triggered';
  
  -- For dimmers
  ELSIF device_type = 'dimmer' THEN
    title := device_name || ' Adjusted';
    description := device_name || ' changed to ' || COALESCE(state, 'unknown');
  
  -- Fallback - clean generic format
  ELSE
    IF state IS NOT NULL AND state != '' THEN
      title := device_name || ' Updated';
      description := device_name || ' changed to ' || INITCAP(state);
    ELSE
      title := device_name || ' Updated';
      description := device_name || ' status update';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'title', title,
    'description', description,
    'device_type', device_type,
    'normalized_state', normalized_state
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically format events
CREATE OR REPLACE FUNCTION format_event_trigger()
RETURNS TRIGGER AS $$
DECLARE
  formatted_info JSONB;
BEGIN
  -- Only format state change events
  IF NEW.event_type ~* '(state|changed|device)' AND NEW.device_name IS NOT NULL THEN
    formatted_info := generate_event_description(NEW.device_name, NEW.display_state, NEW.event_type);
    
    -- Store the formatted information in event_data
    IF NEW.event_data IS NULL THEN
      NEW.event_data := jsonb_build_object();
    END IF;
    
    NEW.event_data := NEW.event_data || jsonb_build_object(
      'formatted_title', formatted_info->>'title',
      'formatted_description', formatted_info->>'description',
      'device_type', formatted_info->>'device_type',
      'normalized_state', formatted_info->>'normalized_state'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS format_event_trigger ON fusion_events;
CREATE TRIGGER format_event_trigger
  BEFORE INSERT OR UPDATE ON fusion_events
  FOR EACH ROW
  EXECUTE FUNCTION format_event_trigger();

-- Update existing events to add formatted descriptions
UPDATE fusion_events 
SET event_data = COALESCE(event_data, '{}'::jsonb) || generate_event_description(device_name, display_state, event_type)
WHERE device_name IS NOT NULL 
  AND event_type ~* '(state|changed|device)'
  AND (event_data IS NULL OR event_data->>'formatted_title' IS NULL);

-- Add comment
COMMENT ON FUNCTION detect_device_type(TEXT) IS 'Detects device type from device name for consistent event formatting';
COMMENT ON FUNCTION normalize_device_state(TEXT) IS 'Normalizes device state to on/off for consistent formatting';
COMMENT ON FUNCTION generate_event_description(TEXT, TEXT, TEXT) IS 'Generates user-friendly event descriptions based on device type and state';
COMMENT ON FUNCTION format_event_trigger() IS 'Trigger function to automatically format event descriptions on insert/update'; 