# Guangboo Monster Survival Spec

## Scope

- `guangboo/index.html` serves a public, mobile-first, real-time arena game from the Mac mini web server.
- The playable modes are `duel` and `survival`.
- `duel` is a 2-player 1:1 match, 1 life each, last surviving player wins.
- `survival` is a 4-player free-for-all, 1 life each, last surviving player wins.
- The theme is a bright monster arena with visually distinct monster characters.

## Player Flow

- Players open `guangboo/index.html` without admin authentication.
- The lobby accepts a nickname and lets players choose `1:1 결투` or `4인 생존전` before joining automatic matchmaking.
- The server starts a `duel` match when 2 queued players are available.
- The server starts a `survival` match when 4 queued players are available.
- The match view uses a canvas arena with a left movement stick and a right aim/fire stick.
- The result view shows placement and kills, then allows another automatic match.

## Server Authority

- WebSocket path: `/guangboo/ws`.
- Clients send `joinQueue`, `leaveQueue`, `input`, and `ping` messages.
- `joinQueue` includes a `mode` of `duel` or `survival`; missing or unknown modes fall back to the server default.
- The server sends `hello`, `playerReady`, `queue`, `matchStart`, `state`, `matchEnd`, `pong`, and `error` messages.
- Clients send input only; the server owns player movement, projectile spawning, projectile hits, health, deaths, placements, and match winners.
- Match state is kept in server memory while active.

## Local Database

- The same local SQLite database stores Guangboo player and match records.
- `guangboo_players` stores nickname, matches, wins, kills, deaths, and play time.
- `guangboo_matches` stores mode, winner, start/end timestamps, and duration.
- `guangboo_match_players` stores per-player placement, kills, deaths, and survived time.
- `/api/guangboo/leaderboard` returns local leaderboard rows for the lobby.

## Tutorial Impact

- No tutorial, onboarding, or guide files exist in this repository for Guangboo.
- Adding the public Guangboo game does not require tutorial copy or selector updates.
