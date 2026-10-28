CREATE TABLE rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE INDEX rooms_updated_at ON rooms(updated_at);
