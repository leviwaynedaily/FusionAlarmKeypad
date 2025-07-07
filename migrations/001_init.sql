CREATE TABLE IF NOT EXISTS events (
  id          TEXT    PRIMARY KEY,
  received_at DATETIME DEFAULT current_timestamp,
  event_type  TEXT,
  category    TEXT,
  device_name TEXT,
  area_name   TEXT,
  payload     JSON
);

CREATE INDEX IF NOT EXISTS idx_events_received_at
  ON events(received_at DESC); 