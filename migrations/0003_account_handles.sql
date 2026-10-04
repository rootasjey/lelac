-- Give every existing account a stable, non-email handle. Users can choose a
-- readable handle later without exposing their email address in dashboard URLs.
ALTER TABLE users ADD COLUMN handle TEXT;

UPDATE users SET handle = id;

CREATE UNIQUE INDEX users_handle_unique ON users(handle);
