CREATE TABLE IF NOT EXISTS light_commands (
  id SERIAL PRIMARY KEY,
  command TEXT NOT NULL CHECK (command IN ('ON', 'OFF')),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  device_id TEXT DEFAULT 'default_led'
);

CREATE INDEX IF NOT EXISTS idx_light_timestamp
ON light_commands(timestamp DESC);

