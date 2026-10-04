# 저금통 원정대 · minsung 통합

## v0.3.0 동작·맵 개선 · 2026-10-04

사용자 요청으로 긴 성인 비율 다리와 좁은 기본 발 간격, 거리 기반 접지, 어깨부터
다리와 반대로 흔드는 팔, 좌우 교대 펀치와 45ms 발차기를 구현했습니다. 흙길 중앙으로
캐릭터 접지를 맞추고 배경 모양을 월드 ID에 고정했습니다. 게임의 텍스트 선택을 막고
확인·취소·기존 저장 JSON 백업이 있는 '처음부터 시작'을 추가했습니다.

기존 맵의 랜드마크와 황혼 보스를 보완하고 물안개 길/샘터/물레방앗간, 상자와
고유 물안개 보스를 추가했습니다. 두 새 보스는 경고 후 충격파를 사용합니다.
기존 맵 ID·처치/상자 기록·코인·조수와 정산/운반/부활 규칙은 유지합니다.
같은 schema=2의 기존 저장은 새 맵 기본값을 추가하고 노을 폐허 완료 시 물안개 길을 엽니다.

검증: Node 29개, 기존 브라우저 46개, 이번 변경 HTTP 브라우저 20개가 통과했습니다.
별도 HTTP 저장/소스 ZIP/대시보드 검사와 배포용 파일 검사는 아래 배포 기록에 남깁니다.
기존 전체 77 통과/6 실패 baseline은 반복하지 않았으며 로컬 DB의 기존 해시를 보존합니다.
새 검사: `python3 tests/piggy-quest-revision-browser.py`.

## 이전 배포 오류의 확인된 원인과 한계

초기 시도의 실제 중단 지점은 Wrangler의 묶음 자산 업로드 HTTP 401이었습니다.
계정 토큰 검증과 기존 Pages 조회는 성공했고 같은 플랫폼 HTTPS 프록시에서 임시 업로드
토큰을 메모리로 받아 순차 업로드·해시 등록 후 Wrangler로 배포하면 성공했습니다.
401이 묶음 크기·동시 요청·헤더 처리 중 어느 내부 조건 때문인지는 확인되지 않았습니다.
토큰 전체가 무효하거나 사이트 도메인이 배포를 막았다고 단정할 근거는 없습니다.

그 뒤 '공개 URL 브라우저 검증 실패'는 별도 문제입니다. 공개 HTTPS는 시스템 CA를
사용하는 요청으로 200과 산출물 해시 일치를 확인했지만 VM Chromium은
`ERR_CERT_AUTHORITY_INVALID`로 이동에 실패했습니다. 이는 VM 브라우저의 CA 신뢰
문제이며 배포 실패 증거가 아닙니다. 첫 배포 `eb59dc78`은 Production/main 성공 상태입니다.
ChatGPT Sites 전환으로 이 문제가 해결된다는 근거도, 이 VM에서 호출할 Sites 게시 도구도
없습니다. 현재 공개 Pages 경로를 유지해 개선본을 배포합니다.

## v0.2.0 최초 통합 기록

첨부된 `Piggy_Quest_Source_v0.2.0.zip`의 실행 소스를 `piggy-quest/`에 가져왔습니다.
게임 JS/CSS/SVG 및 규칙은 변경하지 않았습니다. 한국어 UI, 전투·운반·귀환·성장,
조수·맵 진행, 저장 내보내기, 실제 소스 보기와 ZIP 다운로드를 포함합니다.
진행은 브라우저 localStorage에 저장되며 로그인·서버 저장·기기 간 동기화는 없습니다.
다른 원점으로 옮길 때는 게임의 저장 관리에서 JSON을 내보내고 불러옵니다.

## 실행과 검증

상위 저장소에서 `npm start` 후 `/piggy-quest/index.html`로 들어갑니다.
대시보드의 상단 링크와 앱 카드는 로그인 없이 게임을 엽니다.

```sh
cd /workspace/minsung/piggy-quest
npm test
python3 scripts/build.py
PIGGY_TEST_OUTPUT=/tmp/piggy-browser-results python3 tests/browser_smoke.py
cd /workspace/minsung
PIGGY_DASHBOARD_URL=http://127.0.0.1:4173/ python3 tests/piggy-quest-browser-smoke.py
node --test tests/local-server.test.mjs
```

VM 검증: 게임 규칙 20개, 첨부 브라우저 상호작용 46개, 실제 HTTP/저장/소스 내보내기
10개, 기존 서버 9개가 통과했습니다. `file://` 실행은 VM 브라우저 정책으로 차단됐습니다.
전체 기존 테스트는 반복하지 않았으며 기존 77 통과/6 실패 baseline을 유지합니다.
원본 문서의 미게시 문구와 시험판 한계는 원본 작성 시점의 기록입니다.
현재도 최종 아트·고유한 두 번째 보스·다층 발판 등 원본의 후속 과제는 남아 있습니다.

## 기존 Pages 사이트에 추가 배포

대상: 기존 계정 `8326f1e0ab93e6bea3b3b6753b9d8fcf`, 기존 Pages 프로젝트 `minsung`,
프로덕션 브랜치 `main`. 현재 첫 화면의 HTML을 보존하고 게임을 `/piggy-quest/`에 추가합니다.
최신 저장소 대시보드는 `/dashboard.html`에 둡니다. 기존 첫 화면을 대시보드로 대체하지 않습니다.

현재 첫 화면은 일반 브라우저 User-Agent로 가져온 HTML과 동일한 해시로 보존합니다.
VM의 기본 Python User-Agent 요청은 Cloudflare 1010 응답이므로 브라우저/일반 브라우저
User-Agent로 HTTP 점검합니다. 사이트 보안 설정을 변경하지 않습니다.

이번 VM에서 Wrangler의 묶음 자산 업로드는 프록시 인증 401로 실패했습니다.
같은 HTTPS 프록시·임시 업로드 토큰을 통한 순차 업로드와 해시 등록은 성공했습니다.
필요하면 아래 보조 명령 후 Wrangler 배포를 실행합니다. CLI와 TLS 검증은 변경하지 않습니다.

```sh
python3 scripts/preupload-pages-assets.py --directory /workspace/builds/minsung-pages-NEW_BUILD
```

```sh
cd /workspace/minsung/piggy-quest
python3 scripts/build.py
cd /workspace/minsung
python3 scripts/build-pages.py \
  --homepage /workspace/.deploy/minsung/preserved-index.html \
  --output /workspace/builds/minsung-pages-NEW_BUILD
```

`--homepage`는 배포 전에 보존한 현재 공개 첫 화면 파일입니다. 새 빌드에는 새로운 출력
디렉터리를 사용합니다. 스크립트는 공개 HTML·클라이언트 파일·에셋과 게임의 단일 HTML만
명시적으로 복사하고 파일 해시 목록은 업로드 폴더 옆에 저장합니다.
`.local`, DB, Node 서버, tests, node_modules, .git, 환경 파일과 시크릿은 업로드하지 않습니다.
게임 단일 HTML 안의 소스 뷰어에는 게임 자체의 공개 원본과 공개 테스트·문서가 포함됩니다.

배포가 명시적으로 요청된 작업에서만 실행합니다:

```sh
WRANGLER_SEND_METRICS=false \
XDG_CONFIG_HOME=/workspace/.tools/minsung-cloudflare/config \
/workspace/.tools/minsung-cloudflare/node_modules/.bin/wrangler pages deploy \
  /workspace/builds/minsung-pages-NEW_BUILD --project-name minsung --branch main
```

기존 환경의 토큰을 플랫폼 HTTPS 프록시로 사용합니다. 시크릿 값과 Authorization 헤더를
출력하지 않습니다. 토큰은 이 계정의 Pages Write/Account Settings Read 범위이며
Workers/D1/DNS는 변경하지 않습니다. Node/SQLite/WebSocket 백엔드는 배포하지 않습니다.
서버 기능을 클라우드로 옮기려면 별도 구현·마이그레이션 검증이 필요합니다.

배포 후 반환된 URL과 프로덕션 URL에서 HTTP 200, 기존 첫 화면 해시, 게임 실행·저장 복원·
소스 다운로드, 대시보드 링크를 확인합니다. 다른 Cloudflare 프로젝트는 변경하지 않습니다.

## v0.2.0 실제 배포 결과 · 2026-10-04

- 구현 커밋: `bae5585d24505ef6fb794051003a5d8171e2b2fa` (`main` push 완료).
- Wrangler 배포 성공: `eb59dc78-81f8-4db3-a2f0-2ed4d4e4decd`, Production / main.
- 게임: https://minsung.pages.dev/piggy-quest/
- 대시보드: https://minsung.pages.dev/dashboard.html
- 배포별 주소: https://eb59dc78.minsung.pages.dev/piggy-quest/
- 공개 프로덕션 첫 화면·게임·대시보드·소스 진입이 모두 HTTP 200이며 최종 빌드 파일과
  바이트 단위로 일치합니다. 배포별 게임 URL도 확인했습니다.
- 첫 화면 SHA-256: `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1`.
- 게임 SHA-256: `f61d2ba838d82b53790721da5d6dfa301a0e60b34a265b0f7e9c745843af7492`.
- 최종 산출물의 로컬 HTTP 브라우저 검사 10개가 통과했습니다. 공개 주소의 Chromium
  검사는 VM CA 신뢰 문제(`ERR_CERT_AUTHORITY_INVALID`)로 실행하지 못했습니다.
  기존 Chromium 신뢰 DB에 시스템 CA를 추가하는 작업은 자동 승인 검토에서 거부됐습니다.
  여러 CA를 영구 추가하는 보안 설정 변경이 현재 승인 범위를 넘는다는 이유입니다.
  인증서 검증을 끄거나 거부된 작업을 우회하지 않았습니다. 공개 주소에서의 브라우저
  기능 검사를 완료했다고 표현하지 않습니다.
- 기존 로컬 DB 해시는 변경되지 않았습니다. 토큰 권한·DNS·Workers·D1과 다른
  Pages 프로젝트는 변경하지 않았습니다.

## v0.3.0 실제 배포 결과 · 2026-10-04

- 구현 커밋: `3635a3d1d82a71ec9461d18dc66f4f43fc526732` (`main` push 완료).
- Wrangler 배포 성공: `0792a940-2671-4db2-9176-3c558118abf3`.
- Cloudflare 프로젝트 API의 canonical_deployment: Production / main / deploy success,
  위 구현 커밋과 일치합니다.
- 게임: https://minsung.pages.dev/piggy-quest/
- 배포별 게임: https://0792a940.minsung.pages.dev/piggy-quest/
- 최종 산출물: `/workspace/builds/minsung-pages-piggy-v030-20261004`.
- 게임 SHA-256: `b78dd7036909db86c9f5eaacfd4653de0a980d4dc3a83a7123ee46c7a8f95a97`.
- 공개 첫 화면·게임·대시보드·소스 진입·배포별 게임 모두 HTTP 200이며 산출물과
  바이트 단위로 일치합니다. 기존 첫 화면의 `37a05e00…` 해시도 유지합니다.
- 최종 단일 파일 산출물의 로컬 HTTP 브라우저 검사 10개 통과: 실제 저장 재로딩,
  소스 원본/ZIP CRC 일치, 대시보드 게스트 링크를 포함합니다.
- 변경 관련 Node 29개, 기존 게임 브라우저 46개, 새 HTTP 회귀 검사 20개 통과.
  전체 기존 테스트 77 통과/6 실패는 반복하지 않았습니다.
- 공개 HTTPS Chromium 검사는 기존 VM CA 제한이 남아 있습니다. 로컬 브라우저 검사와
  공개 HTTPS 파일 검증을 구분하며 실제 iPad/Safari에서 검증했다고 주장하지 않습니다.
- 순차 자산 업로드/해시 등록 후 Wrangler가 캐시된 95개 파일로 정상 배포했습니다.
  기존 Pages 프로젝트만 갱신했으며 계정 권한·DNS·Workers·D1은 변경하지 않았습니다.
- 기존 `.local/minsung.sqlite`의 수정 전 SHA-256은 그대로 유지합니다.
