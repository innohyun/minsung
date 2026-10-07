# v0.11.0 조수 동작·부활·전투 실험실·계정 · 실제 배포 결과 (2026-10-07)

공개 게임: https://minsung.pages.dev/piggy-quest/

활·화살·화살통과 연속 불 분사 원화를 따로 제작했습니다. 원본 PNG 바이트를 보존하며 뒤쪽 팔/화살통, 고정 길이의 위팔·아래팔, 어깨·몸통·다리 자세를 함께 계산합니다. 궁수는 화살 꺼내기→장전→시위 당기기→발사 동작을 사용하고 기본 사거리는 520으로 늘렸습니다. 원거리 조수는 사거리에 맞춰 접근·후퇴합니다. 잿불은 버티는 자세에서 시간에 따라 길어지는 직선 불줄기를 연속 분사하며 낮은 적과 비행 중 지상 적도 조준합니다. 대검은 손잡이를 쥐고 몸의 무게를 옮기며 뒤로 준비한 뒤 내려베기/옆베기를 구분합니다. 기존 조수·몬스터 행동 효과음을 유지합니다.

플레이어가 죽으면 어두운 화면에 10초 부활 시간을 표시하고 같은 원정의 저금통에서 부활합니다. 지도·처치·코인·방 진행을 초기화하지 않으며 자발적인 홈 귀환은 원정 코인의 절반을 정산합니다. 지도 현재 위치는 빨간색, 처치 완료 구역은 체크 표시입니다. 보스를 제거하고 필수 구역의 일반 적 처치로 다음 맵을 엽니다. 첫 맵은 새 계정이 실제 이동·점프·공격·저금통 상호작용·지도·전투를 수행하는 튜토리얼입니다. 설명 단계의 전투는 멈추고 마지막 전투 단계에서 시작합니다.

홈의 **전투 실험실**은 플레이어 없이 시작합니다. 아래 목록에서 조수 5종·몬스터 7종·일반 졸라맨을 드래그해 배치하고 화면을 드래그해 카메라를 이동합니다. 실제 게임 AI·공격·피격·효과음을 사용하며 맵/강화 수준 선택, 일시정지·부활·초기화를 제공합니다. 일반 졸라맨의 돌진 피격→공중 밀림→넘어짐→복귀도 확인했습니다. 실험은 실제 계정 진행에 저장하지 않습니다.

**계정 기능의 공개 범위:** 공개 Pages에서는 기기별 계정 추가·선택·이어서 하기를 사용할 수 있습니다. 기존 진행은 `기존 원정`으로 보존합니다. 비밀번호 로그인·서버 저장용 API와 HTTPS 서버 연결 UI도 구현했으며 별도 임시 SQLite를 사용하는 VM 서버에서 다른 브라우저 로그인/이어 하기까지 검증했습니다. 그러나 운영 계정 서버는 배포하지 않았으므로 현재 공개 사이트의 기기 계정을 온라인 인증이나 기기 간 동기화로 안내하지 않습니다. 온라인 사용에는 운영 HTTPS 백엔드 연결이 필요합니다. 기존 Node/SQLite 서버를 Pages에 그대로 올리지 않았고 Workers/D1/DNS 리소스도 만들지 않았습니다. 선택적 계정 API는 `PIGGY_ACCOUNTS_DB`의 별도 DB를 요구하며 기존 대시보드 DB와 같은 경로를 거부합니다. 비밀번호는 scrypt, 세션은 HttpOnly 쿠키, 저장은 계정별 분리와 revision 충돌 검사를 사용합니다.

- 게시 코드/GitHub 커밋: `1880e2f914eec35f0f091fef5f7ae285fe3d9635`. 이 상위 결과 문서만 별도 커밋으로 기록하므로 게시된 게임 소스와 산출물은 바뀌지 않습니다.
- Pages production 배포: `6f436281-b9b1-4395-a0bb-db8f90a2d5aa`, https://6f436281.minsung.pages.dev/piggy-quest/ . 계정 API에서 main/production/deploy success, 게시 코드 커밋, canonical production 배포 ID 일치를 확인했습니다.
- 전용 산출물: `/workspace/builds/minsung-pages-piggy-v0110-20261007-complete`, 공개 allowlist 191파일/소스 부분 96파일. 절대 경로 Wrangler 4.147.0으로 기존 minsung 프로젝트에 배포했습니다. 저장소 루트·로컬 DB·Node 서버·루트 tests·node_modules는 공개 자산에 포함하지 않습니다. 게임 전용 소스 내보내기에는 게임의 테스트/기획 문서가 포함됩니다.
- 게시 게임 HTML SHA-256 `8fc341c59ebeda346d8495dfd71ea7581e436f10ed5d83ff512895e68850035d`, 단일 HTML SHA-256 `959bc1bc6566446b61f91636790032f241dea793a26a384bd8f0b040b91d5c3a`. 정상 TLS/상속 프록시의 공개 HTTPS 102요청에서 첫 화면·게임·대시보드·소스 진입·저금통·96개 소스 부분·배포별 게임의 HTTP 200과 산출물 바이트 일치를 확인했습니다. 공개 HTTPS Chromium에서도 v0.11.0, 이미지 31개 디코딩, 새 기기 계정의 튜토리얼 시작, 실제 드래그 배치와 궁수 피해, 브라우저 오류 없음이 통과했습니다.
- 관련 검증: 게임 단위 97개, 계정 API 테스트 1개(등록·로그인·계정별 저장·충돌·로그아웃 등 여러 검증), 기존 서버 선택 테스트 6개 통과. 격리 계정 서버의 실제 HTTP 브라우저 검증 31개는 마지막 불줄기 조준 수정 전 통과했으며, 최종 산출물에서는 정적 HTTP 브라우저 28개와 단일 HTML 48개가 통과했습니다. 정적 산출물 검사에서 온라인 서버가 필요한 3개 항목은 제외했습니다. 최종 조준의 지상/비행·낮은 적 판정은 단위 검사에 포함합니다. 반복 검사를 독립 검사 수에 더하지 않습니다. 저장소 전체 baseline 77 통과/6 실패는 기록만 보존하고 전체 루트 테스트는 반복하지 않았습니다.
- 결과/화면: `/workspace/artifacts/piggy-quest-v0110/`의 `validation-summary.json`, `public-verification.json`, `public-browser.json`, `public-accounts.png`, `public-archer-lab.png`, `full-browser-final/results.json`, `complete-browser/results.json`, `complete-offline/browser-results.json`, `unit-results.log`, `accounts-results.log`. 멀티터치·실제 Web Audio 연결/신호도 검증했습니다. 물리 스피커 청취, 네이티브 iPad/Safari, 전 맵 수동 완주/최종 난이도는 미검증입니다. file://는 VM Chromium의 `ERR_BLOCKED_BY_ADMINISTRATOR` 정책으로 열리지 않아 단일 HTML은 set_content/메모리 Storage, 실제 원점·저장은 HTTP/HTTPS로 구분해 검사했습니다. 정책·TLS·인증을 우회하지 않았습니다.
- 기존 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1`, 기존 `.local/minsung.sqlite` SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지. 루트 package.json/lockfile도 변경하지 않았습니다. server.mjs에는 선택적 별도 계정 API 연결만 추가했습니다. 기존 Node 서버의 `/`와 `/piggy-quest/index.html` HTTP 200을 확인했습니다.
- 환경 spec 9/관측 9, 기존 변수·시크릿 ready, 계정 토큰 verify success=true/status=active, Wrangler의 기존 minsung Pages 조회를 확인했습니다. 기존 설치 스크립트·start_skill·다른 env/secret 설정을 변경하지 않았고 새 설정 초안도 만들지 않았습니다. `WRANGLER_SEND_METRICS=false`, 기존 XDG_CONFIG_HOME과 대상 계정 `8326f1e0ab93e6bea3b3b6753b9d8fcf`를 사용합니다. 사용자 제공 만료일은 2027-10-04, 권한은 Pages Write/Account Settings Read이며 비밀 값/Authorization 헤더를 출력하거나 권한을 추가하지 않았습니다. 환경 저장·게시 버튼은 실행하지 않았습니다.

---

# v0.10.0 조수 개편·행동 효과음 · 실제 배포 결과 (2026-10-06)

공개 게임: https://minsung.pages.dev/piggy-quest/

새 조수 5종과 방사형/직선/갈래별 기술 트리, 은행 코인 구매·강화 상한, 화면 안의 적을 즉시 인식하는 자동 전투를 적용했습니다. 권투가의 낮은 달리기·펀치·발차기·밀치기·뒤로 회피·대쉬, 궁수의 실제 강화 포물선/재장전, 온기의 살아 있는 아군 치유·유한 방벽, 잿불의 한 손 불기둥/유도 폭발·주기적 불 피해/제한 비행, 대검의 두 번 베기·밀림·추격을 구현했습니다. 조수와 몬스터의 실제 행동 시점에 효과음을 연결하고 같은 소리/발소리/동시 음원의 겹침을 제한했습니다. 첫 입력에서 Web Audio를 활성화합니다.

플레이어의 삭제 기술/장착 칸과 조수 명령 버튼을 제거하고 기본 공격·점프·삽·방패는 유지합니다. 저금통과의 최대 거리 제한은 470→705입니다. 이전 유료 조수/삭제 기술의 비용은 스키마 3으로 한 번만 환급하며 기존 처치·상자·굴착·은행/모험 코인·플레이어/저금통 체력·발견 기록을 보존합니다. 이미 소유하지만 동행하지 않는 조수도 숨은 방에서 합류하며 기존 체력과 강화를 유지합니다. 박쥐/독씨, 검, 화염볼, 폭발/잔류 불과 배경을 원본 PNG 바이트로 적용했습니다. 접합에서 보인 수직 경계는 연결 내용을 한 장에 그린 긴 숲 원화와 같은 가장자리의 교대 반전으로 수정했고 구역별 변형·카메라 1배 이동을 확인했습니다. 배경 원화/반전은 반복되며 모든 구역이 별도 유일 원화인 것은 아닙니다.

- 게시 코드/GitHub 커밋: `8ca4a0057d8e1f81d5e832d725cd141a00c416de`. 이 상위 결과 문서만 별도 커밋으로 기록하므로 게임 소스 ZIP과 검증 산출물은 바뀌지 않습니다.
- Pages production 배포: `2c42e152-95fe-4f41-9450-edd8b4fcddfe`, https://2c42e152.minsung.pages.dev/piggy-quest/ . 계정 API에서 main/deploy success, 코드 커밋, canonical production 배포 ID 일치를 확인했습니다.
- 전용 산출물: `/workspace/builds/minsung-pages-piggy-v0100-20261006-release`, 공개 allowlist 180파일/소스 부분 85파일. 변경 자산 86개를 프로젝트 upload JWT로 순차 전송한 뒤 절대 경로 Wrangler 4.147.0으로 기존 minsung 프로젝트에 게시했습니다. 루트·DB·서버·tests·node_modules 경로를 공개 자산으로 올리지 않았습니다. 공개 게임 소스 내보내기에 게임 전용 테스트/기획 문서는 계속 포함됩니다.
- 게시 게임 HTML SHA-256 `599193d9b179cdda4f51ffdc673d8c4b54a7c0564d015b506ff6e7b12654857e`, 단일 HTML SHA-256 `b877b4a50310c284b5fb519d2de98b685ec3f11c31f373436e96f0dd0afc6e08`. 정상 TLS/상속 프록시의 공개 HTTPS 91요청에서 첫 화면·게임·대시보드·소스 진입·저금통·85개 소스 부분·배포별 게임의 HTTP 200/산출물 바이트 일치와 JS Content-Type을 확인했습니다. 공개 HTTPS Chromium에서도 v0.10.0/이미지 30개 디코딩/탐험 시작/오류 없음이 통과했습니다.
- 검증: 게임 단위 88개, 단일 HTML Chromium 메모리 Storage 47개, 실제 HTTP 조수/트리/전투/환급/오디오 30개, 실제 멀티터치·통합 공격·지도 체크 26개, 스프라이트/공격/평면 27개, 최종 산출물 HTTP/실제 localStorage/소스 ZIP CRC·원본/대시보드 10개 통과. 관련 재실행을 독립 검사 수에 더하지 않습니다. 새 효과음은 정상 RAF의 실제 조수·몬스터 활 행동과 오디오 엔진 연결을 확인했고 검·화염·치유·돌진/내려찍기/독씨 등 합성 파형을 측정했습니다. 물리 스피커 청취를 주장하지 않습니다. 실제 전투 경계는 fixed-step의 격리 재현 상태를 사용했으며 전 맵 수동 완주/최종 난이도/iPad Safari는 미검증입니다. file://는 VM Chromium의 `ERR_BLOCKED_BY_ADMINISTRATOR` 정책으로 열지 못했고 정책/인증/TLS를 우회하지 않았습니다. 단일 HTML은 set_content로, 실제 원점은 HTTP 및 공개 HTTPS로 구분해 검사했습니다.
- 결과/화면: `/workspace/artifacts/piggy-quest-v0100/`의 `companions-results.json`, `animation-results.json`, `offline-browser-results.json`, `unit-results.log`, `public-verification.json`, `public-browser.json`, `companion-trees.png`, `portrait-trees.png`, `forest-joined-seam.png`. 새 9개 PNG의 SHA-256과 모든 프레임 범위를 검증했습니다. 대쉬가 접촉 전 판정되던 문제와 당긴 시위/손 위치를 검토해 수정했습니다.
- 기존 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1`, SQLite SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지. 이번 VM에서 기존 Node 프로세스가 실행 중이지 않아 기존 DB로 다시 시작했고 로컬 HTTP 게임 요청 200을 확인했습니다. server.mjs와 루트 package.json/lockfile 바이트도 기준 커밋과 같습니다. 저장소 전체 baseline 77 통과/6 실패는 기록만 보존하고 전체 루트 테스트는 실행하지 않았습니다.
- 기존 환경 설정/설치 스크립트/시크릿 바인딩을 변경하지 않았고 새 설정 초안은 필요하지 않아 저장하지 않았습니다. 현재 환경 spec 9/관측 9와 기존 변수·시크릿 ready를 확인했습니다. 계정 토큰 verify는 success=true/status=active, Wrangler Pages 조회에서 기존 minsung 프로젝트가 확인됩니다. 대상 계정은 `8326f1e0ab93e6bea3b3b6753b9d8fcf`, 사용자가 제공한 만료일은 2027-10-04이며 Pages Write/Account Settings Read 범위를 유지합니다. 비밀 값/인증 헤더는 출력하지 않았고 Workers/D1/DNS와 새 프로젝트는 만들지 않았습니다. 이 배포는 전용 정적 게임이며 기존 Node/SQLite HTTP/WebSocket 백엔드를 Pages에 그대로 배포한 것이 아닙니다.

---

# v0.9.0 직선 탐험·몬스터 애니메이션 · 실제 배포 결과 (2026-10-05)

공개 게임: https://minsung.pages.dev/piggy-quest/

기본 몬스터 세 종의 8프레임 걷기와 날개형의 6프레임 날갯짓을 새로 제작해 적용했습니다. 동굴 세 종도 걷기/화살 장전·발사·화살통에서 재장전, 앞발 들기·달려들기, 팔 올려 내려찍기·회수 동작을 사용합니다. 지상 기술은 발톱 연타/정지 가시/방어 반사/독가루로 구분합니다. 실제 simulation 시간/이동 거리와 타격 시점에 맞춰 프레임을 표시하며 일시정지에서 멈춥니다. 원본 PNG를 변경 없이 SVG에 넣고 alpha 범위/발 기준점으로 샘플링합니다. 이웃 칸의 팔이 끼어드는 문제를 스크린샷에서 발견해 프레임 범위를 수정했고 원본 바이트 SHA-256도 여섯 아틀라스 모두 일치합니다.

모든 구역의 높낮이와 반투명 지면을 없애고 지도 구역도 수평 직선으로 변경했습니다. A 원화 배경은 카메라와 같은 1배 속도로 붙여 이동하며 겹침/페더를 제거했습니다. 표지판·기능 상자·굴착 흙·비밀 발견·처치 체크는 유지합니다. 방패는 풀 없이 좌우 방향/충돌면을 맞췄습니다. 막지 못한 돌진은 공중 밀림→넘어짐→복귀를 만들며 운반 저금통은 바닥에 내려놓습니다. 기존 코인·처치·상자·조수·굴착·저장과 통합 공격/동시 터치/개별 버튼 편집은 유지합니다.

- 게시 코드/GitHub main 커밋: `cfdebe2e73854486b96b33ed68a2da2b812e4aef`. 이 결과 문서는 게임 소스 내보내기 밖의 상위 문서이며 별도 결과 커밋으로 저장합니다.
- Pages production 배포: `0e9be875-ab7c-4651-b44c-f4c70afdf507`, https://0e9be875.minsung.pages.dev/piggy-quest/ . 계정 API에서 main/deploy success와 게시 코드 커밋 일치를 확인했습니다.
- 전용 산출물: `/workspace/builds/minsung-pages-piggy-v090-20261005-final`, 공개 allowlist 140파일/소스 부분 45파일. 변경 공개 자산 46개를 프로젝트 upload JWT/지원 프록시 경로로 순차 전송하고 절대 경로 Wrangler 4.147.0으로 기존 minsung 프로젝트를 배포했습니다. 환경 설정·CLI 설치·토큰 범위를 변경하지 않았습니다.
- Pages 게임 HTML SHA-256 `a922f2f633b55349f9830c188fe92378456862e16c1b757ec17e265067f96908`; 오프라인 단일 HTML SHA-256 `99c681702881e9fd39d4b4818b63aa557cf0a28c561b19d73ffaff2582c798fd`. 공개 소스 ZIP의 CRC와 실제 모듈 원본 일치를 확인했습니다.
- 정상 TLS/상속 프록시의 실제 HTTPS 51요청: 루트·게임·대시보드·소스 진입·저금통 이미지·45개 소스 부분 파일·배포별 게임 모두 HTTP 200/검증 산출물 바이트 일치, JS Content-Type 확인. 공개 HTTPS 브라우저 CA 제한을 우회하지 않았으며 실제 브라우저 실행은 최종 산출물 로컬 HTTP에서 확인했습니다.
- 검증: 게임 단위 73, 단일 HTML Chromium 46, 실제 HTTP 통합 공격/지도 체크/긴 터치 회귀 26, 새 스프라이트/공격/지면 27개 통과. 타격 경계 수정 뒤 관련 단위 26개를 재확인했습니다. 최종 분할 배포 산출물에서도 새 동작 27개와 HTTP/실제 저장/소스 ZIP/대시보드 10개 통과. 동일 검사 재실행을 독립 검사 수에 더하지 않습니다. 전투 경계는 실제 Game fixed-step의 격리된 재현 상태를 사용합니다. 전 맵 수동 완주·난이도·네이티브 iPad/Safari는 미검증입니다.
- 실제 화면/동작 결과: `/workspace/artifacts/piggy-quest-v090/`, 기본 걷기 원화 `surface-walk-sheet.png`, 게임 화면 `surface-walk-0.png`/`surface-attacks.png`/`shield-left.png`/`shield-right.png`/`flat-map.png`, 새 동작 결과 `animation-results.json`. 굴착 위치는 게임 밖 `dig-sites-guide.png`에만 안내합니다.
- 기존 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1` 및 SQLite SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지, 기존 Node 서버 HTTP 200. server.mjs·루트 package.json/lockfile·설치 스크립트·다른 env/secret 설정 변경 없음. 새 환경 설정 초안 없음. 저장소 전체 baseline 77 통과/6 실패는 기록만 보존하고 전체 테스트를 반복하지 않았습니다.
- 계정 소유 토큰 verify success=true/status=active 및 절대 경로 Wrangler의 기존 minsung Pages 조회 성공. 대상 계정 `8326f1e0ab93e6bea3b3b6753b9d8fcf`, 사용자 제공 만료일 2027-10-04, Pages Write/Account Settings Read 범위를 유지했습니다. 비밀 값/Authorization 헤더를 출력하지 않았습니다. 전용 정적 산출물만 배포하며 저장소 루트/.local DB/Node 서버/tests/node_modules 경로를 업로드하지 않습니다. Workers/D1/DNS 또는 새 프로젝트 생성 없음.

---

# v0.8.0 표지판·통합 공격·지도 체크 · 실제 배포 결과 (2026-10-05)

공개 게임: https://minsung.pages.dev/piggy-quest/

별도로 배치하던 텐트·수레·나무·풀·폐허 소품과 길/샛길 흙 띠를 제거했습니다. 선택한 A 배경 원화의 숲/폐허/물가와 고정 구간 스크롤, 기본 지면은 유지하며 표지판으로 이동합니다. 보스 입구도 표지판으로 바꿨습니다. 보물상자·저금통·굴착 흙/입구·방패 같은 기능 요소는 유지합니다.

화면 공격은 원형 버튼 하나로 합쳤습니다. 한 번 누르면 0.24초의 두 번째 입력 대기 후 빠른 발차기, 그 안에 두 번 누르면 발차기를 섞지 않는 좌우 교대 펀치입니다. 키보드 J/K 즉시 공격도 유지합니다. 저금통을 들면 단일 발차기는 계속 가능하고 ‘2회 펀치’ 글자만 흐리게 표시하며 펀치는 차단합니다. 기존 개별 공격 버튼 위치/크기는 통합 버튼으로 옮기고 저장 진행을 보존합니다. 지도에는 구역의 모든 적을 잡으면 ✓를 넣으며 큰길은 보스까지 처치해야 체크합니다. 발견 전 비밀 방은 표시하지 않습니다.

조이스틱과 행동 버튼의 native touch 기본 동작을 캡처 리스너로 취소하고 선택/콜아웃을 막았습니다. 이미지 드래그 금지는 게임 조작에만 한정해 기존 치료제 드래그를 유지합니다. 실제 VM Chromium 긴 터치·이동 중 공격·동시 E/점프와 확대율/선택 없음은 검증했지만 네이티브 iPad/Safari의 실제 돋보기 화면은 VM에서 재현하지 못했습니다.

- 게시 코드/GitHub main 커밋: `48ceb013d7474f01c74aa87e87b94db4f8bca689`. 이 결과 기록은 게임 소스 내보내기 밖의 상위 문서이며 게시 코드 이후 별도 커밋으로 저장합니다.
- Pages 배포: `df2c5321-eb94-4f1f-bb5c-9b0c507b4794`, https://df2c5321.minsung.pages.dev/piggy-quest/ . API에서 production/main/deploy success와 위 커밋을 확인했습니다.
- 전용 산출물: `/workspace/builds/minsung-pages-piggy-v080-20261005`, 공개 allowlist 113파일, 소스 부분 파일 18개, 최대 516,895바이트. 검증된 공개 파일 19개를 지원되는 프로젝트 업로드 JWT/플랫폼 프록시 경로로 순차 전송하고, 절대 경로 Wrangler 4.147.0이 113개 등록된 파일로 기존 minsung 프로젝트를 배포했습니다.
- Pages 게임 HTML SHA-256 `7dfd11cf755d371629f9e3b1fa6150a0906717d0c98180cd6886ab86b86bf07e`; 오프라인 단일 HTML SHA-256 `f86c0247073573a0eab6f2b9595612de94ad89479fa0d061ca442d6c3b029578`.
- 정상 TLS/상속 프록시의 실제 HTTPS에서 루트·게임·대시보드·소스 진입·저금통 이미지·18개 JS 부분 파일·배포별 게임 24개 요청의 HTTP 200 및 로컬 산출물 바이트 일치를 확인했습니다. JS Content-Type도 text/javascript를 확인했습니다. 브라우저 실행은 최종 산출물의 로컬 HTTP에서 확인했으며 기존 공개 HTTPS 브라우저 CA 제한은 우회하지 않았습니다.
- 검증: 게임 단위 65, 단일 HTML 46, 기존 HTTP 조작 29, 지도/방패/편집 34, 삽/동굴 31, 이번 공격/체크/사진 26개 통과. 보스 체크 조건 변경 후 관련 단위 13개를 재확인했습니다. 최종 분할 게시 산출물에서 공격/체크/사진 26개와 실제 원점 저장/소스 ZIP/대시보드 10개를 통과했습니다. 같은 검사 재실행은 독립 검사 수에 더하지 않았습니다. 이전 재시작/정산 20개와 저장소 전체 baseline 77 통과/6 실패는 기록만 유지했습니다.
- 실제 CDP 터치/키보드와 격리된 브라우저 저장을 사용합니다. 전투 경계/클리어 기록/사진 위치에는 명시적인 재현 장면을 사용하며 전 맵 수동 완주나 난이도 균형으로 주장하지 않습니다.
- 외부 굴착 위치 사진: `/workspace/artifacts/piggy-quest-v080/dig-sites-guide.png`. 사진 가운데, 졸라맨 오른쪽의 짙은 흙입니다. 바람숲 큰길 x=7180/17600(41%), 노을 폐허 오래된 돌길 x=3090/15500(20%), 물안개 길 큰길 x=6370/16600(38%). 삽 구입 후 저금통을 내려놓고 E 세 번, 입장 후 발견 지도 규칙을 유지합니다. 사진과 위치 캡션은 게임/UI/발견 전 지도에 추가하지 않았습니다.
- 기존 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1`과 로컬 SQLite SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지, 기존 Node 서버 HTTP 200. server.mjs·루트 package.json/lockfile·설치 스크립트·환경 변수/시크릿 바인딩은 변경하지 않았으며 새 환경 설정 초안은 만들지 않았습니다.
- 기존 계정 소유 토큰 verify success=true/status=active 및 절대 경로 Wrangler Pages 프로젝트 조회를 확인했습니다. 비밀 값/Authorization 헤더를 출력하지 않았습니다. Pages Write/Account Settings Read 범위와 기존 account ID를 사용하며 Workers/D1/DNS 또는 새 프로젝트를 생성하지 않았습니다. 전용 정적 산출물만 배포하며 저장소 루트·로컬 DB·Node 서버·tests/node_modules 경로는 배포하지 않았습니다.

---

# v0.7.0 A 배경·삽·지하 탐험 · 실제 배포 결과 (2026-10-05)

공개 게임: https://minsung.pages.dev/piggy-quest/

사용자가 선택한 A의 둥근 연녹색 숲을 기준으로 숲/노을/물가/동굴 원화, 16종 소품, 동굴 몬스터 3종을 제작했습니다. 원본 PNG 바이트는 SVG 안에 그대로 포함하고 원래 해상도로 렌더링합니다. 먼 배경 0.36배·중간층 0.68배·지면/소품 1배로 카메라를 따라 움직이며 고정 구간 ID와 겹친 가장자리로 이어집니다. 샛길은 큰길과 같은 너비에서 부드럽게 굽고 주변 흙/풀에 연결됩니다. 샛길 위와 끝의 소품, 이전 비밀 입구의 큰 돌문을 없앴고 경사에서 캐릭터 몸통을 기울이지 않습니다.

운반/쌓기 물건을 제거하고 무료 점프는 유지했습니다. 캠프에서 삽을 90코인에 구입한 뒤 E로 덮인 흙을 세 번 파면 지하 입구가 열립니다. 파기 진행은 즉시 저장되고 실제로 입장한 뒤 지도에 표시됩니다. 이전 방문/코인/처치/상자/조수/클리어를 보존합니다. 지하에는 강한 궁수·돌진형·수호자가 있고 화살은 예고 후 잠근 위치로 포물선을 그립니다. 나무 방패는 화살을 지우며 나무 소리를 내고, 예고된 돌진은 점프로 피할 수 있습니다. 객원 조수는 바로 합류하며 숨은 적은 보스 조건에서 제외됩니다. 기존 터치 동시 조작·개별 버튼 편집·효과음·정산 규칙을 유지합니다.

- 게임 구현 커밋: `c02a094259fef16807d0200b799b5593f481669e`; Pages 패키징을 포함한 실제 게시 코드: `4972711d751a48617fdc5704f07dcc76d61b8ff2`. GitHub main에 push 완료.
- Pages 배포: `9a99c8d5-f025-49a1-a391-c45521f22981`, https://9a99c8d5.minsung.pages.dev/piggy-quest/ . API에서 production/main/deploy success와 위 코드 커밋을 확인했습니다.
- 최종 전용 산출물: `/workspace/builds/minsung-pages-piggy-v070-20261005-split`, 공개 allowlist 113파일, 소스 부분 파일 18개. 부분 파일 최대 513,524바이트이며 합치면 원본 공개 소스 JSON과 정확히 같습니다.
- Pages 게임 HTML SHA-256: `9f593ed202051ccb0405cc90743e4f7417fabcfb8024115a91aadd0e797debff`; 오프라인 단일 HTML SHA-256: `f052adc6c3864a759b74c2ea5a7c9401472091e6be081656c73814a37818b2bf`. 오프라인 한 파일과 공개 소스 ZIP은 보존했습니다.
- 실제 HTTPS에서 루트·게임·대시보드·소스 진입·저금통 이미지·18개 소스 부분 파일·배포별 게임의 HTTP 200과 로컬 산출물 바이트 일치를 모두 확인했습니다.
- 검증: 게임 단위 63, 단일 HTML Chromium 46, HTTP 조작 29, 지형/방패/편집 34, 재시작/세 맵/정산 20, 새 A 배경/삽/동굴 31, 최종 HTTP/ZIP/대시보드 10개 통과. 마지막 분할 산출물에서도 새 탐험 31개와 HTTP/ZIP/대시보드 10개를 확인했습니다. 재실행은 독립 검사 수에 중복 합산하지 않았습니다.
- 실제 키보드/멀티터치·삽 구매·파기·배경 이동·저장 복원과 격리된 재현용 전투 상태를 사용했습니다. 네이티브 iPad/Safari 및 전 맵 수동 완주/난이도 균형은 미검증입니다. 공개 HTTPS 브라우저의 CA 제한을 우회하지 않았으며 VM 로컬 HTTP 기능 검사와 정상 TLS의 공개 파일/Pages API 검증을 구분합니다.
- 기존 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1`, `.local/minsung.sqlite` SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지. 기존 Node 서버 HTTP 200. server.mjs, 루트 package.json/lockfile, 설치 스크립트, 환경변수/시크릿 바인딩 변경 없음. 설정 초안을 읽어 기존 저장된 항목을 확인했으며 새 환경 설정 초안은 만들지 않았습니다.
- 계정 소유 토큰 verify 결과 success=true/status=active, Wrangler 4.147.0 절대 경로의 Pages 조회 성공. 비밀 값과 인증 헤더는 출력하지 않았습니다. 정적 산출물만 기존 minsung Pages에 게시했고 DB·저장소 루트·서버·tests·node_modules를 올리지 않았습니다. Workers/D1/DNS와 새 Pages 프로젝트는 생성하지 않았습니다. 기존 저장소 전체 baseline 77 통과/6 실패는 기록만 유지했습니다.

초기 업로드 실패도 조사했습니다. 단일 게임 HTML 9.16MB 전송은 `/pages/assets/upload`에서 HTTP 401을 받았으며 응답은 Cloudflare API 오류 JSON이 아닌 Envoy의 `Unauthorized: authentication failed for integration codex-secret-api.cloudflare.com` 텍스트였습니다. 같은 절차의 계정 verify/프로젝트 조회/업로드 JWT 발급/파일 존재 조회는 성공했고 JWT도 만료 전이었습니다. 동일 인증으로 작은 기존 공개 파일 재전송은 성공했습니다. 정확한 플랫폼 크기 상한은 확인하지 않았습니다. Pages용 소스 JSON만 작은 정적 파일로 나누고 순차 업로드하자 19개 새 파일과 전체 113개 해시 등록이 성공했고, Wrangler가 113개 캐시된 파일로 배포를 완료했습니다. 게임 코드·이미지 픽셀·권한·프록시/TLS 설정을 바꾸지 않고 해결했습니다.

공식 절차 출처: [Cloudflare Pages assets upload API](https://developers.cloudflare.com/api/resources/pages/subresources/assets/methods/upload/) — 프로젝트 upload-token 엔드포인트에서 받은 JWT로 Direct Upload 자산을 업로드합니다.

---

# v0.6.0 픽셀 탐험 변경

## v0.6.0 · 픽셀 탐험 (2026-10-05)

아래 규칙이 이전 버전의 평면 지형/숨은 길/스페이스 달리기/전역 버튼 크기/소리 토글 설명을 대체합니다.
- 새 image_gen 픽셀 배경 4종과 나무·피난 텐트·수레·통나무·돌 아치·우물·다리·배·방패·운반 상자·통·표지판을 사용합니다. `assets/pixel-world.svg`에 원본 PNG를 한 번만 포함하고 JSON 타일 좌표로 런타임 샘플링합니다. PNG 원본의 픽셀을 편집하지 않았습니다.
- 길은 같은 월드 높이 투영을 사용합니다. 표지판의 위/아래 방향은 지도상 실제 대상 구역에서 정하며, 샛길을 지면의 평평한 띠로 그려 갑자기 솟은 막대 모양을 제거합니다. 먼 배경은 고정된 파노라마, 가까운 소품은 월드 좌표와 시차를 사용합니다.
- 스페이스/W/↑ 및 오른쪽 점프 버튼은 무료 점프입니다. Shift/달리기 버튼은 구입한 달리기이며 점프와 별개입니다. 상자·나무 통·작은 통나무는 E로 들고 놓고 쌓을 수 있는 실제 발판이며, 측면 충돌과 착지를 처리합니다. 배치는 맵별로 저장합니다.
- 바람숲의 비밀 동굴, 노을 폐허의 잠든 창고, 물안개 길의 잊힌 물레방앗간은 선택 구역입니다. 최초 입구는 덩굴/돌 뒤의 높은 발판이며 표지판과 지도에 노출되지 않습니다. 주변 물건을 이용해 올라가 E로 실제 들어간 뒤에만 지도와 연결선에 표시합니다. 기존 방문 기록은 보존합니다.
- 보스 조건은 **숨은 구역을 제외한 필수 적**: 바람숲 48, 노을 폐허 40, 물안개 길 46마리입니다. 전체 적 수는 기존 54/47/52이며 숨은 적은 잡지 않아도 보스가 등장합니다. 기본 점프만으로 필수 길을 지날 수 있으며 기술 구매를 강요하지 않습니다.
- 숨은 조수 잎새/반딧/물방울은 발견 즉시 현재 원정에 합류합니다. 원정 객원 동료는 구입한 동행 자리를 쓰지 않고 기존 party를 교체하지 않습니다. 귀환 후에는 보유 조수에서 다음 동행을 선택합니다. 객원 동료와 10초 부활도 재개/일시정지 규칙을 따릅니다.
- E 구역 이동에는 동료들과 함께 걷는 1.15 simulation 초 전환 화면을 사용합니다. 전환 중 전투와 부활은 진행하지 않고 일시정지·숨은 탭에서 전환도 멈춥니다. 완료 시 방·좌표를 한 번에 저장합니다. 전환 중 새로고침은 기존 방에서 재개합니다.
- 지도 연결의 같은 번호 A/B는 실제 portal.x와 도착 spawn 좌표입니다. 미발견 비밀 구역은 목록에서도 숨깁니다.
- 효과음은 기본 켜짐이며 소리 켬/끔 버튼을 없앴습니다. 브라우저 정책에 따라 첫 사용자 입력에서 AudioContext를 시작합니다. 일시정지의 소리 테스트는 유지합니다.
- 포인터별 입력 소스를 분리하고 행동을 pointerdown에서 실행합니다. 조이스틱을 누른 채 E/펀치/점프를 사용할 수 있으며 한 손을 떼도 다른 손 입력을 지우지 않습니다. 확대·선택·콜아웃 방지는 유지합니다.
- 홈에는 장비·기술/치료·보급/동료 바로가기를 두고 실제 구매 가능한 항목 수를 표시합니다. 상점은 구매 가능/코인 부족/완료를 표시하고 비용이 부족한 항목을 비활성화합니다.
- 조작 편집은 목록 또는 직접 눌러 선택한 **개별 버튼/조이스틱**의 크기만 바꿉니다. positions와 sizes[id]를 저장하며 이전 전역 크기는 기본값으로 유지합니다. 저장/취소/선택 초기화/전체 초기화를 제공합니다.

새 모듈: `src/exploration.js`(비밀 구역·객원 조수·고체 발판·배치 저장), `src/pixel.js`(픽셀 아틀라스·배경·소품).
정산/처치/상자 보존, 저금통 죽음의 원정 코인 손실, 기존 관절/보스/방패 충돌 규칙은 유지합니다.

검증: 게임 단위 53, 번들 46, HTTP 조작 29, 지형/방패/편집 34, 재시작/맵 20, 새 탐험 24개와 최종 산출물 HTTP/소스 ZIP/대시보드 10개가 통과했습니다. 최종 산출물에서도 탐험 24개와 번들 46개를 확인했습니다. 기존 저장소 전체 테스트 baseline 77 통과/6 실패는 보존만 했습니다. 기존 서버 HTTP 200과 로컬 DB 체크섬 보존을 확인했습니다. 게시 완료: https://minsung.pages.dev/piggy-quest/ (v0.6.0).

- 게임 구현 커밋: `d8e981157510e1300a9067d86e4060086505ce50`; 조수 방패까지 적용한 최종 배포 코드: `99a42ef2a993a2ed1941112a8cdc01d3d8631c86`. GitHub main에 push 완료.
- 최종 Pages production 배포: `cce768cb-922f-45cd-b444-cc52fcffb61a`, https://cce768cb.minsung.pages.dev/piggy-quest/ . API에서 production/main/deploy success 및 위 코드 커밋을 확인했습니다.
- 산출물: `/workspace/builds/minsung-pages-piggy-v060-20261005-final`, 공개 allowlist 95파일. 게임 HTML SHA-256 `340b97fce49c17642471172145c016471fc37210f802cb5f91f78ee3d19f9460`.
- 공개 루트·게임·대시보드·소스 진입 페이지·저금통 이미지·배포 URL 게임의 HTTPS HTTP 200 및 로컬 산출물과 바이트 일치를 확인했습니다. 루트는 기존 Marble Builder 첫 화면을 보존했습니다.
- 원래 첫 화면 SHA-256 `37a05e005b7ecb26d1ea3250df67cd8b357713b2d607895898412b9b011b03a1` 및 `.local/minsung.sqlite` SHA-256 `2aafd39bdb7720eace4078fa8b05421e29b45f73df6b13e4b1e077ed87d735f6` 유지. 기존 Node 서버 HTTP 200. server.mjs와 루트 package.json/lockfile 변경 없음.
- 계정 소유 토큰의 계정 verify 결과 success=true/status=active, 기존 minsung 프로젝트 조회 성공. 비밀 값/Authorization 헤더는 출력하거나 공개 산출물에 포함하지 않았습니다. 기존 환경 설정·설치 스크립트·시크릿 바인딩 변경 없음. 새 Cloudflare 프로젝트/Workers/D1/DNS 리소스 생성 없음.
- 브라우저 게임 검증은 VM Chromium의 실제 입력과 격리된 저장/경계 상태를 사용했습니다. 최종 픽셀 조수 방패 수정 후 산출물 HTTP·소스 ZIP·저장 복원 10개를 다시 확인했습니다. 네이티브 iPad/Safari 및 공개 HTTPS의 브라우저 렌더링 검증은 하지 못했습니다. HTTPS 게시 검증은 지원 프록시와 정상 TLS 검증으로 응답/파일 바이트와 Pages API 상태를 확인했습니다.


---

# 저금통 원정대 · minsung 통합

## v0.5.0 실제 배포 결과 · 2026-10-05

- 구현 커밋: `5b5c4838112cff80b653b6edfe7ab734aaaf2ecb`, GitHub main 반영 완료.
- 배포 ID: `fa5bd789-b0a3-4145-bc91-35bee13f5ba8`, Production/main/deploy success.
- 게임: https://minsung.pages.dev/piggy-quest/
- 배포별 게임: https://fa5bd789.minsung.pages.dev/piggy-quest/
- 산출물: `/workspace/builds/minsung-pages-piggy-v050-20261005-final`, 공개 파일 95개.
- 게임 SHA-256: `ed2c796600b687e45ec8ec530b64d92e78ab52a3f0ca1530730c5666ea298a98`.
- 공개 첫 화면·게임·대시보드·소스 진입·저금통 이미지·배포별 게임 모두 HTTP 200이며
  검증한 산출물과 바이트가 일치합니다. 계정 Pages API의 canonical_deployment는 위 구현
  커밋과 일치합니다. 첫 화면의 기존 `37a05e00…` 해시를 유지했습니다.
- 최종 단일 HTML의 실제 HTTP 저장 재로딩·소스 원본/ZIP CRC·대시보드 검사 10개 통과.
  게임 관련 Node 45개, 브라우저 46+29+20+34+10개 모두 통과했습니다.
- 실제 조이스틱·키보드·원형 버튼 편집/저장/취소/초기화·소리 테스트를 브라우저에서
  조작했습니다. 방패 충돌, 보스 패턴, 지도/포털 경계는 재현용 상태도 사용했습니다.
- 키보드/터치/모의 가로·세로 Chromium 검증과 공개 HTTPS 파일 검증을 구분합니다.
  전체 확장 맵 수동 완주·난이도 균형·실제 iPad/Safari는 미검증입니다. 공개 HTTPS
  Chromium CA 신뢰와 file:// 정책 제한도 변경하지 않았습니다.
- 기존 로컬 SQLite DB SHA-256과 기존 Node 서버 HTTP 응답을 확인했습니다. 저장소
  루트 package.json/lockfile, Cloudflare 토큰 권한·시크릿·환경 설정은 변경하지 않았습니다.
  기존 전체 테스트 77 통과/6 실패 baseline은 기록만 유지합니다.
- 기존 minsung Pages 프로젝트만 갱신했으며 Workers/D1/DNS와 새 프로젝트는 만들지
  않았습니다. Node/SQLite 서버를 Pages에 업로드하지 않았습니다.

## v0.5.0 넓은 곡선 맵·방패·보스·조이스틱 · 2026-10-05

양팔은 몸통의 같은 어깨점에 붙고 걷기의 상체 진동은 1px 미만입니다. 큰길은
17,600 / 15,500 / 16,600 길이로 늘렸습니다. 세 맵에 각각 세 새 구역과 샛길끼리의
순환 연결을 추가해 6/5/6 구역, 54/47/52 일반 적이 있습니다. 기존 ID·처치·상자·코인과
클리어 기록을 유지합니다. 이미 완료한 맵은 명시적 재도전 전까지 완료 상태입니다.

피난 숲의 야영지·수레·찢어진 깃발, 노을 폐허의 기둥·안뜰·예배당·채석장,
물가의 갈대·배·섬·수로를 서로 다른 시차/전경과 함께 배치했습니다. 길 높이와 카메라를
같이 움직이는 2.5D 투영이며 자유로운 3D/깊이 이동 또는 다층 발판 물리는 아닙니다.
표지판에서 E로 실제 샛길을 선택하고, 지도는 실제 연결·현위치·캠프·보스·미개봉 상자를
표시합니다. 상자 위치는 방문한 구역만 표시합니다.

나무 방패는 120코인, B로 들고 내리기, 멈추면 낮은 가드입니다. 정면 투사체는
충돌 시 사라지고 나무 충돌음을 냅니다. 뒤쪽/범위 밖/운반/공격 중은 막지 못합니다.
운반 중 펀치는 숨기지 않고 흐리고 비활성화된 채 남습니다. 머리 위 체력바는 30% 아래
빨강입니다. 보스는 예고 후 투사체·돌진·내려찍기와 스테이지별 도약, 저체력 강화 패턴을
사용합니다. 효과음 재생 강도를 올리고 화면 토글 및 일시정지의 소리 테스트를 추가했습니다.

실제 조이스틱과 원형 버튼을 사용하며, 일시정지의 편집에서 이동 방식·위치·크기를
바꿉니다. 저장/취소/기본값 복원과 origin 저장 재로딩을 확인했습니다.
검증: Node 45개, 기존 브라우저 46개, 방향 버튼/전투 29개, 맵/초기화 20개,
새 조이스틱/지도/방패/보스 34개 통과. 새 보스와 경계 조건은 재현용 상태도 사용하며
전 맵의 수동 완주·실제 iPad/Safari 검증으로 표현하지 않습니다.
기존 서버 전체 77 통과/6 실패 baseline은 반복하지 않았고 기존 DB를 보존했습니다.

## v0.4.0 실제 배포 결과 · 2026-10-04

- 구현 커밋: `f52f9e68dabfd2db8f40e6dadfee4ff5e6c6c779`, GitHub main 반영 완료.
- 배포: `51eee315-329c-4819-84a3-8b02063a88e2`, Production/main/deploy success.
- 게임: https://minsung.pages.dev/piggy-quest/
- 배포별 게임: https://51eee315.minsung.pages.dev/piggy-quest/
- 최종 게임 SHA-256: `c71a440dba076610a87ebdc3877e4a157364fee83ed0a94d2acf667aa05a55fa`.
- 공개 첫 화면·게임·대시보드·소스 진입·새 저금통 이미지·배포별 게임의 HTTP 200과
  산출물 바이트 일치를 확인했습니다. 프로젝트 API의 canonical_deployment도 구현 커밋과
  일치합니다. 첫 화면 해시 `37a05e00…`와 기존 SQLite DB를 유지합니다.
- 최종 단일 HTML의 실제 로컬 HTTP 저장 복원·ZIP·대시보드 검사 10개 통과.
  Node 34개, 기존 브라우저 46개, 새 키보드·터치 29개, 맵·초기화 20개도 통과했습니다.
- 기존 Pages 프로젝트만 갱신했습니다. 공개 HTTPS Chromium/실제 Safari 검증 한계는
  이전 기록과 같으며 TLS/신뢰 설정이나 계정 권한을 변경하지 않았습니다.

## v0.4.0 팔 동작·조작 화면·저금통 개선 · 2026-10-04

걷기의 팔꿈치가 뒤로 꺾이는 원인은 FK 관절을 버리고 반대쪽 IK 해로 다시 구하던
처리였습니다. 실제 어깨·팔꿈치 관절을 유지하고, 운반 시 양팔을 바깥으로 굽혀 손을
저금통 바닥에 맞췄습니다. 두 팔이 90/290ms에 번갈아 뻗는 펀치와 별도의 돌려차기
무릎 접기·지지 발 회전·차기·회수를 구현했습니다. 걷기↔달리기 전환과 저장/샛길
이동 직후의 운반 위치도 조작 중 발견해 수정했습니다.

뛰기는 Shift/Space 또는 오른쪽 달리기 버튼으로 달리는 행동입니다. 기존 jump 구매
단계는 run으로 옮깁니다. E는 운반·내려놓기·상자·샛길 등의 상황별 상호작용이며,
가능한 행동과 배운 기술만 오른쪽에 표시합니다. 플레이 중 캠프 상단과 하단 메뉴를
숨기고, 연속 터치 확대·텍스트 선택·콜아웃을 억제했습니다. 입력 이후 활성화되는
발걸음·공격·도자기 운반 등의 효과음과 흙길에 맞춘 보스 문을 추가했습니다.

image_gen으로 오른쪽을 향하는 정적인 도자기 저금통을 새로 만들었습니다. 동물의
표정·호흡 대신 유약과 동전 구멍으로 물체의 느낌을 내며 PNG 원본을 SVG 안에
포함해 기존 오프라인 단일 HTML/소스 ZIP에서 그대로 사용합니다.

검증: Node 34개, 기존 브라우저 46개, 실제 HTTP 키보드·터치 29개,
초기화·맵·보스 20개, HTTP 저장·소스 ZIP·대시보드 10개 통과. 실제 입력으로 이동·운반·
달리기·전투와 효과음 신호를 확인했습니다. 고급 기술 구매와 문/포즈 캡처에는 재현용
상태도 사용했으며 실제 iPad/Safari나 세 맵의 수동 완주 검사는 아닙니다.
전체 77 통과/6 실패 baseline은 반복하지 않았으며 기존 로컬 DB를 보존합니다.

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
