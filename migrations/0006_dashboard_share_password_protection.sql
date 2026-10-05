ALTER TABLE dashboard_shares ADD COLUMN password_salt TEXT;
ALTER TABLE dashboard_shares ADD COLUMN password_hash TEXT;

CREATE TABLE dashboard_share_access_sessions (
  user_id TEXT NOT NULL,
  dashboard_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, dashboard_id, token_hash),
  FOREIGN KEY (user_id, dashboard_id)
    REFERENCES dashboard_shares(user_id, dashboard_id) ON DELETE CASCADE
);

CREATE INDEX dashboard_share_access_expiry ON dashboard_share_access_sessions(expires_at);
