# Architecture

## Runtime

No framework, CDN or server is required. Namespace `globalThis.PIGGY` connects plain scripts.
config → motion/state → art/audio → game → export → ui → main.
Canvas logical resolution is 1280×720. Device-pixel ratio is capped at 2.
Game simulation uses 1/60 second steps, capped frame accumulation after inactive periods.
All damage, attacks, projectiles, knockback, invulnerability and revival use simulation delta.
The only wall-clock timeouts are notifications and revoking generated download URLs.

## Visuals

Background: forest/ruins/brook layers, fixed world feature IDs, independent parallax factors,
foreground rocks and per-room landmarks. Camera changes do not reseed shapes.
Actors: fixed-length joint rigs from motion.js, distance-driven planted feet, counter-swinging
shoulders, alternating punches and 45ms snap kicks; separate carry/air/hit poses.
All ground actors stand at y=600, the midpoint of the visible 550–650 dirt road.
Monsters/items: original SVG files as Image objects, with transform-based bounce/wing/attack feedback.
Changing final art does not require changing enemy balance data.

## Save boundary

State rules contain all serializable progression. The game snapshots player/pig position and HP.
Map IDs and enemy/chest IDs are stable. Live room enemies are filtered using saved dead IDs.
Schema 2 saves add default progress for new maps and unlock the successor of already cleared maps.
Uncollected coins persist in drops. Chest opening and enemy death are persisted immediately.
Periodic snapshots run about every 0.8 simulation seconds; pagehide/visibility suspend also snapshot.
Same-origin localStorage does not provide account security or multi-device synchronization.

## Money boundary

`coins`: safe, spendable at home. `runCoins`: risky current expedition money.
`settle(reason)` clears runCoins immediately and then banks the permitted amount.
A successful clear sweeps outstanding drops only once. A defeat does not sweep floor coins.

## Build/source boundary

scripts/build.py allowlists root project files and src/assets/scripts/tests/docs text files.
It writes source-bundle.js and inlines CSS, sources and manifest into dist/index.html.
Public source view uses textContent, not untrusted innerHTML. JSON escapes `<` on embedding.
The client ZIP writer implements stored ZIP entries, CRC32 and UTF-8 filenames without dependencies.
The ZIP exporter regenerates source-bundle.js to make an exported directory runnable.
No personal localStorage values are ever read by the source exporter.
Personal save export is a separate explicit user action.

## Extending

Add maps/enemies/helpers/skills in src/config.js using new stable IDs.
Add save schema migrations before changing an existing ID or incompatible state shape.
Keep obligatory enemies reachable using free movement; optional upper rewards may need learned skills.
Any backend leaderboard/trading/online account work is new scope, not already supported.
