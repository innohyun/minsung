# Dashboard App Routes Spec

## Scope

- `index.html` serves the authenticated local dashboard.
- Dashboard app links point to the canonical app HTML locations in the workspace.
- Protected app entry routes require an authenticated admin session before serving app HTML.

## Routes

- Marble Builder Pro is served from `ball/ball.html`.
- The dashboard quick action and app card both link to `ball/ball.html`.
- The local server protects `/ball/ball.html` as the Marble Builder Pro entry route.
- Guangboo is served from `guangboo/index.html`.
- The dashboard app card links to `guangboo/index.html`.
- Guangboo is a public player-facing game route and is not protected by the admin session gate.

## Tutorial Impact

- No tutorial, onboarding, or guide files exist in this repository for dashboard app routing.
- Moving Marble Builder Pro from `ball.html` to `ball/ball.html` does not require tutorial copy or selector updates.
- Adding the Guangboo dashboard card does not require tutorial copy or selector updates.
