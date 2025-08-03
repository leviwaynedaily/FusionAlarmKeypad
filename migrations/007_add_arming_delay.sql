-- Add arming delay setting to user preferences
-- Default: 20 seconds delay before alarm zones are actually armed

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS arming_delay_seconds INTEGER DEFAULT 20;

-- Add constraint to ensure reasonable delay values (5-300 seconds)
ALTER TABLE user_preferences 
ADD CONSTRAINT arming_delay_seconds_range 
CHECK (arming_delay_seconds >= 5 AND arming_delay_seconds <= 300);

-- Add index for performance (though not strictly necessary for this field)
CREATE INDEX IF NOT EXISTS idx_user_preferences_arming_delay 
  ON user_preferences(organization_id, arming_delay_seconds);

-- Update any existing records to have the default value
UPDATE user_preferences 
SET arming_delay_seconds = 20 
WHERE arming_delay_seconds IS NULL;