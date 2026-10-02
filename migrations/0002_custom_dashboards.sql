-- Remove the three-ID constraint while preserving every saved board configuration.
CREATE TABLE dashboards_v2 (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_id TEXT NOT NULL,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, dashboard_id)
);

INSERT INTO dashboards_v2 (user_id, dashboard_id, config_json, updated_at)
SELECT user_id, dashboard_id, config_json, updated_at FROM dashboards;

DROP TABLE dashboards;
ALTER TABLE dashboards_v2 RENAME TO dashboards;

CREATE TABLE dashboard_definitions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_id TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, dashboard_id),
  UNIQUE (user_id, position)
);
