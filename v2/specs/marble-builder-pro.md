# Marble Builder Pro Spec

## Scope

- `ball/ball.html` serves the Marble Builder Pro physics builder game.
- Slime blocks bounce ball-like bodies, including marbles, steel marbles, and placed marbles.

## Slime Bounce

- Slime bounce strength is configured per slime block and defaults to `20`.
- The configured slime strength acts as a multiplier relative to the default strength.
- A ball-like body bounces away from slime according to its contact speed into the slime surface.
- Faster contact with the slime surface produces a stronger rebound; slower contact produces a weaker rebound.
- The bounce direction follows the slime contact normal, with most tangent speed damped on rebound.

## Tutorial Impact

- No tutorial, onboarding, or guide files exist in this repository for Marble Builder Pro.
- Changing slime bounce physics does not require tutorial copy or selector updates.
