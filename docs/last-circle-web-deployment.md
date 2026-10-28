# Last Circle 0.2.0 업데이트 — 2026-10-28

공개 주소: https://last-circle-arena.innohyun13.chatgpt.site

- Sites 소스 커밋: `f01bec63fd6bc957fefe7f7708c8782e80fd1fa7`
- 게시 버전: `appgprj_6ae206ecb12c81918e261733c110605e~appgver_036f4c8998648191b81fc8464bfecf76` (3)
- 배포: `appgdep_6ae288aec0248191af9702c1e52acd61`, `succeeded`.
- 공개 범위와 Site ID/DB 바인딩 유지. 새 SQL 마이그레이션이나 개인 데이터 변경 없음.
- 지형/물리 규칙 버전이 바뀌므로 이전 진행 중 방은 업데이트 안내 후 새로고침/새 방 생성이 필요함. HTML 자산 URL 버전과 캐시 재검증 추가.

카메라 보정·낙하/이동 예측, 양팔 모션, 30/12발 탄창과 자동 장전/탄창·손 모션, 즉시 총성·반동·총구 화염, 발소리/장전음, 붉은 피격 표시, 머리 위 닉네임, 보이는 무기 모델, 실제 높이/총알 차폐가 있는 언덕·절벽·능선, 서로 다른 건물 9종, 인스턴싱/모바일 렌더링 최적화와 터치 조작을 반영함.

## 검증

- 규칙/SQLite API/자동 장전/지형/낙하/카메라 보정 테스트 14개 통과.
- PC Chromium: 터치 컨트롤 숨김, 무기 모델·닉네임·양팔 모션·장전 탄창/손 이동·발사 반동 확인.
- 카메라 테스트 장면의 시선 방향 변화 약 0.000052rad. 보장 FPS나 전체 기기 측정값으로 해석하지 않음.
- 터치 Chromium 에뮬레이션 844×390, 393×852: 실제 다중 터치 이동+시점+사격, 발소리 오디오 소스 생성, 30발 탄창에서 여러 발 사격, 빈 탄창 자동 장전, 붉은 피격 화면, 컨트롤 화면 내 배치와 메뉴 확인. 마지막 검사에서 이동 약 4.87m, 사격 후 23발, 장전 후 30/예비30발, pageerror 없음.
- 픽스처는 별도의 로컬 개발 테스트 방만 변경. 공개 방/사용자 저장에는 테스트 픽스처를 적용하지 않음.
- 실제 iOS/Safari/Android, 물리 스피커 음질, 10명의 실제 기기 장시간 동시 플레이와 목표 FPS는 미검증.
- 증거: `/workspace/artifacts/last-circle-web-v02/`의 browser-results.json 및 PC/모바일 스크린샷.

세부 검증은 `last-circle-web/TESTING.md` 참고.

---

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
