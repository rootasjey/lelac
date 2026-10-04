CREATE TABLE dashboard_shares (
  user_id TEXT NOT NULL,
  dashboard_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, dashboard_id),
  FOREIGN KEY (user_id, dashboard_id)
    REFERENCES dashboard_definitions(user_id, dashboard_id) ON DELETE CASCADE
);
