# Agent instructions for Piggy Quest

Read HANDOFF.md and docs/GAME_DESIGN.md before changing mechanics.
Do not replace the game with a static mockup, plan, or screenshot.
Preserve the Korean UI and pale sage / ivory / pig-pink visual direction.

## Invariants

- Safe bank coins and risky run coins are distinct. Player death keeps run coins. Pig death loses run coins ONLY.
- Settlement happens once. No replayed death event, resume or rendering callback may duplicate currency.
- Killed monsters and opened chests remain cleared on return, player death, reload, and re-entry.
- A completed map resets only on an explicit replay action. Never delete another map or owned helpers.
- Every required monster outside hidden rooms must be defeated before spawning the deepest boss. Hidden-room monsters are optional (user request, v0.6).
- No required enemy may be locked behind an unpurchased movement ability.
- While carrying the pig overhead, punches are blocked; kick stays usable.
- Companion revival = 10 SIMULATION seconds, at 50% of maximum HP, at the pig.
- Pause, source viewer, inventory dialogs, map dialogs and hidden tabs must freeze combat and revival.
- Home does not automatically heal. Player AND pig need >=1 HP to start.
- Source export is public project files only. Never include local saves, .env, tokens or private attachments.
- Do not claim a live deployment without actually invoking an authorized deployment tool and verifying the returned URL.

## Structure

src/config.js: base balance data and stable IDs.
src/world.js: expanded room graph, projected route geometry and discovery-aware map.
src/exploration.js: shovel excavations, optional underground routes, expedition guests and discovery persistence.
src/pixel.js: user-selected A raster atlases, native-resolution scroll and background/prop/shield rendering.
src/combat.js: monster attacks and hostile projectile/shield collision.
src/companions.js: automatic companion actions, friendly projectiles, healing/barriers, weapon anchors and raster effects.
src/controls.js: joystick input and reversible layout editor.
src/state.js: schema, persistent rules, normalization, purchases and settlement.
src/art.js: scenery, replaceable SVG assets and stick-figure joint poses.
src/game.js: fixed-step simulation and world rendering.
src/ui.js: modals, treatment, shops, source workspace, save import/export.
src/export.js: client-only ZIP and text exports.
src/main.js: entrypoint, input and lifecycle.
scripts/build.py: offline single-file builder and source manifest generator.

## Validate

Run npm test, python scripts/build.py and browser smoke tests.
Serve with npm start; optional browser suite needs Python Playwright and Chromium.
Test both HTTP directory mode and file:// dist/index.html.
Update HANDOFF.md and TEST_REPORT.md honestly, distinguishing automated tests from untested assumptions.
