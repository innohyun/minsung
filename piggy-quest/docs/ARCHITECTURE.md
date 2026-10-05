# Architecture

## Runtime

No framework, CDN or server is required. Namespace `globalThis.PIGGY` connects plain scripts.
config → world/motion/state → art/audio/combat → game/export → ui/controls → main.
Canvas logical resolution is 1280×720. Device-pixel ratio is capped at 2.
Game simulation uses 1/60 second steps, capped frame accumulation after inactive periods.
All damage, attacks, projectiles, knockback, invulnerability and revival use simulation delta.
Wall-clock timeouts only serve UI notifications, the gesture sound-test sequence and download cleanup; combat/revival use simulation time.

## Visuals

Background: forest/ruins/brook layers, fixed world feature IDs, independent parallax factors,
foreground rocks and per-room landmarks. Camera changes do not reseed shapes.
Actors: fixed-length joint rigs from motion.js, distance-driven planted feet, counter-swinging
shoulders, 90/290ms alternating punches and 45ms snap kicks; separate carry/air/hit poses.
Walking uses FK elbows with consistent hinge direction. Carry IK uses outward elbows and fixed
hand anchors. Running blends stride length without resetting gaitPhase. Roundhouse has its own
620ms chamber/pivot/extension/re-chamber/plant sequence, with damage at 260ms.
Logical ground is y=600. world.js projects each world position onto its room route height; cameraY follows the same route. Actor, object, projectile and shadow rendering share this projection. It is side-view 2.5D, not free depth movement or platform physics.
Monsters/items: original SVG files as Image objects, with transform-based bounce/wing/attack feedback.
pig.svg embeds original generated PNG bytes with a visible-bounds viewBox; it is an inert
right-facing ceramic prop and has no idle motion or direction flipping.
Changing final art does not require changing enemy balance data.

## Input and sound

Playing hides camp header/footer and fills the viewport. Action dock renders only learned and
currently applicable actions. Carrying keeps hand attacks visible but disabled/grey. Source/save/layout/sound test are in pause; sound toggle and purchased shield are usable on the right.
Touch-action, selection/callout rules and Safari gesture listeners suppress zoom/selection.
Web Audio starts only after an input gesture; envelopes/noise generate local foley with no downloads.

## Save boundary

State rules contain all serializable progression. The game snapshots player/pig position and HP.
Map IDs and enemy/chest IDs are stable. Live room enemies are filtered using saved dead IDs.
Schema 2 saves add default progress for new maps and unlock the successor of already cleared maps.
Legacy skills.jump is normalized into skills.run at the same level. Money and map IDs stay unchanged.
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

## World, combat and control extensions

world.js extends original stable-ID rooms instead of relocating old enemies. Each map adds three
regions and bidirectional loop connections, smooth route knots, theme/biome props and SVG mapTrack.
World.chart derives route connectors and player markers from real portal/spawn and position data.
Uncleared saves encounter new enemies; previously cleared maps remain cleared until explicit replay.

combat.js owns boss telegraphs, fixed attack direction/landing position, charge/leap motion,
enemy projectile sweeps and front-facing shield collision. Blocking lowers the body and expands
lower coverage; it is unavailable while carrying/attacking. Removed shots cannot hit again.
Boss phases and hazards stop with simulation, and each wave tracks targets in a Set.

controls.js provides a captured pointer joystick with a dead zone and releases keys on cancellation.
Editing pauses gameplay and captures drag before gameplay handlers. Draft layouts are detached
from state until Save. Size and viewport-relative positions are validated on import and clamped
for current dimensions, allowing recovery through Cancel or Reset. Native Safari/device audio
and long-session balance remain unverified.
