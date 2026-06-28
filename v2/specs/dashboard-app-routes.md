# Dashboard App Routes Spec

## Scope

- `index.html` serves the local dashboard entry screen.
- A visitor who is not already authenticated first chooses between 관리자 and 손님 entry.
- 관리자 entry uses the existing local admin setup/login flow before opening the dashboard.
- 손님 entry opens the dashboard without an admin session in read-only mode.
- In 손님 mode, dashboard app launch links are inert and the visitor can only read the app list.
- Dashboard app links point to the canonical app HTML locations in the workspace.
- Protected app entry routes require an authenticated admin session before serving app HTML.

## Routes

- Marble Builder Pro is served from `ball/ball.html`.
- The dashboard quick action and app card both link to `ball/ball.html`.
- The local server protects `/ball/ball.html` as the Marble Builder Pro entry route.
- Guangboo is served from `guangboo/index.html`.
- The dashboard app card links to `guangboo/index.html`.
- Guangboo is a public player-facing game route and is not protected by the admin session gate.
- The public Guangboo route remains directly reachable, but the dashboard card is still inert while the dashboard is in 손님 read-only mode.

## Tutorial Impact

- No tutorial, onboarding, or guide files exist in this repository for dashboard app routing.
- Moving Marble Builder Pro from `ball.html` to `ball/ball.html` does not require tutorial copy or selector updates.
- Adding the Guangboo dashboard card does not require tutorial copy or selector updates.
- Adding 관리자/손님 dashboard entry does not require tutorial copy or selector updates.
