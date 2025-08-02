-- Add temperature_unit column to user_preferences table
-- This allows users to choose between Celsius and Fahrenheit for weather display

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS temperature_unit TEXT DEFAULT 'fahrenheit' CHECK (temperature_unit IN ('celsius', 'fahrenheit'));

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.temperature_unit IS 'Temperature unit preference: celsius or fahrenheit (default: fahrenheit)';

-- Index for potentially improved query performance (though probably not needed for this column)
CREATE INDEX IF NOT EXISTS idx_user_preferences_temperature_unit 
  ON user_preferences(temperature_unit);