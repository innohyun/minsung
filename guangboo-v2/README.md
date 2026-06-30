# Guangboo v2 · PixiJS prototype

이 폴더는 기존 `/guangboo`를 보존하면서 PixiJS 기반 렌더링을 시험하기 위한 v2 프로토타입입니다.

## 접속

```text
http://127.0.0.1:4173/guangboo-v2/index.html
```

맥미니 서버에 다른 기기에서 접속 중이라면 기존 서버 주소 뒤에 `/guangboo-v2/index.html`을 붙이면 됩니다.

## 구조

- 기존 `guangboo-runtime.mjs` 서버/WebSocket/SQLite 로직 재사용
- 기존 `/guangboo/ws` WebSocket 경로 재사용
- 클라이언트 렌더링만 Canvas 2D 직접 렌더링에서 PixiJS WebGL 렌더링으로 분리
- 기존 `/guangboo`는 그대로 유지

## 주의

현재 PixiJS는 CDN으로 불러옵니다. 학교망에서 CDN 접속이 막히면 `pixi.min.js`를 로컬 `vendor` 폴더에 내려받아 참조하도록 바꾸면 됩니다.
