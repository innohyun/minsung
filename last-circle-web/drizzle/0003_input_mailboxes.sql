CREATE TABLE room_inputs (
 code TEXT NOT NULL,
 player_id TEXT NOT NULL,
 seq INTEGER NOT NULL,
 payload TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(code,player_id)
);
CREATE INDEX room_inputs_updated ON room_inputs(updated_at);
CREATE TABLE room_coordinator (
 code TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0
);
