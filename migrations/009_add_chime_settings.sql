-- Add chime_settings JSONB to user_preferences for per-event chime preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS chime_settings JSONB;

-- Optional GIN index if querying by chime_settings in the future
CREATE INDEX IF NOT EXISTS idx_user_preferences_chime_settings
  ON user_preferences USING GIN (chime_settings)
  WHERE chime_settings IS NOT NULL;
