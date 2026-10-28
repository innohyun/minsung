# Last Circle 웹게임 배포 — 2026-10-28

- 공개 게임: https://last-circle-arena.innohyun13.chatgpt.site
- Sites 프로젝트: `appgprj_6ae206ecb12c81918e261733c110605e`
- 게시 소스 커밋: `67642ec328b32a004ef02ad357aaca01f2c11793` (Sites 전용 소스 저장소)
- 게시 버전: `appgprj_6ae206ecb12c81918e261733c110605e~appgver_817d8a2d31d081919bf6910fd2bd5b7c`
- 배포: `appgdep_6ae20cf683488191be44b59f4fbee8a6`, native 배포 결과 `succeeded`.
- 사이트는 요청한 친구 참가를 위해 공개 링크 접속으로 설정. 참가 토큰·방 비밀번호·개발 자격은 소스/배포 기록에 포함하지 않음.

## 실제 확인 결과

- 규칙/실제 SQLite API 테스트 8개 통과.
- Chromium의 WebGL 3D 첫 화면과 혼자 연습 시작 확인.
- 로컬 서버의 실제 브라우저 두 탭: 방 생성, 친구 참가, 두 탭 모두 10명 경기 시작 확인. 최종 코드에서 브라우저 pageerror 없음.
- 공개 HTTPS 홈 HTTP 200, 실제 호스팅 D1에서 방 생성 201, 친구 참가 200, 사람 2명+AI 8명 시작 200, 경기 중 신규 참가 거부 409, 호스트 나가기 정리 200.
- 공개 Chromium에서 마우스 고정, 실제 Space 낙하·착지, WASD 이동 후 서버 위치 약 8.86m 변화, pageerror 없음 확인. Esc 메뉴는 마우스 고정을 명시적으로 해제하도록 수정했고, 수정본의 로컬 브라우저에서 이동 후 실제 메뉴 나가기까지 통과.
- 전체 규칙 시뮬레이션에서 194.05초 뒤 생존자 1명으로 승패 종료 확인(실제 사람 조작 경기 시간이나 난이도 측정은 아님).
- 증거 스크린샷: `/workspace/artifacts/last-circle-web/`의 home, flight, lobby, online-flight, public-home.

10명의 실제 기기, 서로 다른 인터넷의 장시간 경기, 네이티브 Safari와 저사양 PC의 성능은 미검증. 현재는 스타일화된 도형·절차적 관절 모션의 첫 프로토타입이며 PUBG 그래픽/애니메이션 품질을 주장하지 않음.

## 개발과 배포 유지

`last-circle-web/README.md` 참고. `npm ci`, `npm test`, `npm run build`, `npm run dev`.
Sites 호스팅 바인딩은 `.openai/hosting.json`의 `d1: "DB"`이며, `drizzle/` 마이그레이션이 배포 시 적용됨. 배포 아카이브는 프로젝트 상대 경로 `.openai/hosting.json`, `dist/server/index.js`, `drizzle/`를 포함해야 함. 원래 언리얼 프로젝트와 기존 사이트들은 변경하지 않음.
