CREATE TABLE room_rtc_meta (
 code TEXT PRIMARY KEY,
 host_id TEXT NOT NULL,
 owner_connection TEXT,
 owner_seen INTEGER NOT NULL DEFAULT 0,
 closed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE room_rtc_members (
 code TEXT NOT NULL,
 player_id TEXT NOT NULL,
 auth_hash TEXT NOT NULL,
 connection_id TEXT NOT NULL,
 proof_hash TEXT NOT NULL,
 last_seen INTEGER NOT NULL,
 PRIMARY KEY(code,player_id)
);
CREATE INDEX room_rtc_member_auth ON room_rtc_members(code,auth_hash);
CREATE TABLE room_rtc_signals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code TEXT NOT NULL,
 sender TEXT NOT NULL,
 sender_connection TEXT NOT NULL,
 target TEXT NOT NULL,
 target_connection TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX room_rtc_signal_target ON room_rtc_signals(code,target,target_connection,id);
