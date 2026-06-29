# Pixel Hill Runner Spec

## Scope

- `mario/index.html` serves the Pixel Hill Runner canvas game from the dashboard.
- The game is a two-stage side-scrolling platform runner with keyboard and touch controls.
- The player wins only after reaching the stage 2 goal flag.

## Gameplay

- Stage 1 starts every new run.
- Clearing the stage 1 goal shows a stage-clear overlay and lets the player start stage 2.
- Stage 2 uses its own wider level layout, platform sequence, coin placements, enemy patrols, and a warm tint so it reads differently from stage 1.
- Coins collected, elapsed time, and respawn count carry from stage 1 into stage 2.
- Falling below the canvas respawns the player at the current stage start.
- Colliding with an enemy removes one health point, then respawns the player at the current stage start; health refills after all three points are lost.
- Stomping an enemy from above disables that enemy and bounces the player upward.
- Pressing attack fires a projectile toward the current facing direction; the projectile disappears when it reaches the visible aim marker rather than continuing forever.

## HUD and Scoring

- The HUD shows total collected coins, current stage progress (`1/2` or `2/2`), elapsed time, and the best final score saved in local storage.
- The player health bar is drawn directly above the player sprite during gameplay so health is visible without looking at the top HUD.
- The final score is calculated only after clearing stage 2.
- Final score uses two-stage time bonus, total collected coins, and total respawn penalty.

## Controls

- Keyboard: left/right arrows or `A`/`D` move, up arrow, `W`, or space jumps, and `J` or Enter attacks.
- Touch controls expose left, jump, right, attack, fullscreen, and restart buttons.
- The aim marker is visible only while the attack control is held, so it does not block the view during normal movement.
- Fullscreen mode exits through the top-right `×` button rather than a downward swipe gesture.
- Restart starts a new run from stage 1.

## Tutorial Impact

- No tutorial, onboarding, or guide files exist in this repository for Pixel Hill Runner.
- Adding stage 2 does not require tutorial copy or selector updates.
