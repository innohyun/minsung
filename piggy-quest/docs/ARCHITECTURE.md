# Architecture

## v0.8.0 · 표지판과 통합 공격 (2026-10-05)

아래 규칙은 이전 소품층·길 렌더링과 분리된 화면 펀치/발차기 설명을 대체합니다.

- 별도로 배치하던 텐트·수레·나무·풀·폐허 소품과 큰길/샛길 흙 띠를 제거합니다. 선택한 A 배경 원화와 안정적인 0.36배 카메라 스크롤, 월드 높이를 따라 이어지는 기본 지면은 유지합니다. 표지판으로 E 이동하며 보스 입구도 돌 아치 대신 표지판입니다. 기능이 있는 보물상자·저금통·파는 흙/지하 입구·방패는 유지합니다.
- 화면 공격 버튼은 하나입니다. 한 번 누르면 발차기, 빠르게 두 번 누르면 좌우 교대 펀치입니다. 첫 입력에서 0.24 simulation 초 동안 두 번째 입력을 기다려 두 번 입력에는 발차기를 섞지 않습니다. 실제 타격 45ms/90ms/290ms와 재사용 시간은 유지합니다. 키보드 J/K의 즉시 펀치/발차기도 유지합니다.
- 저금통을 들면 공격 버튼 자체는 계속 활성화되어 단일 발차기를 사용할 수 있습니다. 버튼의 ‘2회 펀치’ 글자만 흐리게/취소선으로 표시하고, 두 번 입력의 펀치는 막습니다. 기존 개별 kick-btn 배치/크기, 없으면 punch-btn 설정을 attack-btn으로 옮깁니다. 현재 attack-btn 설정이 우선이며 코인·처치·상자·조수·굴착 기록을 보존합니다.
- 통합 공격의 대기는 Game.attackPending과 fixed-step 시간만 사용합니다. 일시정지·지도·편집·포커스 상실·상호작용·특수기술에 대기를 취소하여 재개 후 원치 않는 공격을 막습니다. 이동 포인터와 공격/E/점프 포인터는 독립적으로 유지합니다.
- 지도는 방문한 구역의 기존 적 ID를 모두 처치했을 때 ✓를 표시합니다. 일부 처치에는 체크하지 않습니다. 숨은 구역은 처치 여부와 관계없이 실제 발견 전 지도에 표시하지 않습니다. 체크는 저장된 dead/visited로 계산되어 귀환/새로고침에 유지되며 숨은 적의 선택 조건은 바뀌지 않습니다. 보스가 있는 큰길은 보스까지 처치해야 ✓를 표시합니다.
- 조이스틱/행동 버튼의 touchstart/move/end 기본 동작을 passive:false 캡처 리스너로 막고 선택 범위를 해제합니다. CSS 선택·콜아웃·이미지 드래그 금지와 기존 gesture/contextmenu/selectstart 방지도 유지합니다. 편집 UI의 입력/목록은 계속 사용할 수 있습니다. VM Chromium으로 기본 동작 취소와 긴 터치·동시 공격을 검증하며 네이티브 Safari 돋보기 재현은 VM에 없습니다.
- 굴착 위치 안내 사진은 게임 밖에서 별도로 제공합니다. 게임 UI나 발견 전 지도에 위치 표식을 새로 추가하지 않습니다. 삽 90코인, 저금통을 내려놓고 E 세 번, 직접 입장 후 지도 공개 규칙을 유지합니다.

## v0.7.0 · A 배경과 지하 통로 (2026-10-05)

아래가 현재 규칙입니다. 이전 고정 파노라마·큰 픽셀·운반 상자/쌓기·높은 비밀 발판 설명을 대체합니다.

- 사용자가 선택한 A의 둥근 연녹색 숲을 기준으로 숲·노을 폐허·물가·동굴 배경, 16종 소품, 동굴 몬스터 3종을 image_gen으로 제작했습니다. 원본 PNG 바이트는 SVG 안에 그대로 포함하고 `assets/a-world.json`의 좌표로 원래 해상도에서 샘플링합니다. 이미지 픽셀을 편집하거나 저해상도로 축소하지 않았습니다. 이전 `pixel-world.*`는 교체했습니다.
- 먼 배경은 카메라의 0.36배, 중간층은 0.68배, 지면과 소품은 1배로 함께 움직입니다. 1,280 너비의 배경 구간을 1,090 간격으로 겹쳐 가장자리를 섞고 고정 구간 ID로 반복/반전합니다. 카메라 이동 중 모양을 새로 추첨하지 않습니다. 네 가지 테마 원화를 재사용하는 구간 방식이며 맵 전체 길이의 한 장을 불러오지 않습니다.
- 길은 같은 월드 높이 투영을 사용합니다. 샛길은 큰길과 같은 100 너비에서 부드럽게 갈라지고 계속 굽어 이어집니다. 흙/풀 가장자리를 붙이고 샛길 위에 소품을 배치하지 않습니다. 길 끝을 나무로 막지 않습니다. 졸라맨 몸통은 경사에서도 회전하지 않습니다. E로 다른 구역에 들어가는 측면 2.5D 탐험이며 자유로운 깊이 이동은 아닙니다.
- 옮기는 상자·통·통나무와 쌓기/발판 충돌을 제거했습니다. 보물상자와 저금통 운반은 유지합니다. 스페이스/W/↑와 점프 버튼은 무료 점프, Shift/달리기는 별도로 구입한 달리기입니다.
- 캠프 장비 상점에서 삽을 90코인에 구입합니다. 기술 장착 칸을 사용하지 않습니다. 다시 덮인 흙에서 저금통을 내려놓고 E를 세 번 누르면 지하 입구가 열립니다. 한 번 파기는 0.48 simulation 초이며 연타로 건너뛰지 못합니다. 파는 동작과 효과음이 있고 부분 진행도 즉시 저장합니다. 삽 없이 조사하거나 공중에서 파면 진행하지 않습니다.
- 입구를 열어도 지도에 먼저 표시하지 않습니다. 실제로 들어가야 비밀 동굴/잠든 창고/잊힌 물레방앗간과 연결이 표시됩니다. 세 숨은 방은 지하 동굴 테마이며 원래 방/적/상자/조수 ID를 유지합니다. 이미 발견한 방은 삽 없이 그대로 들어갈 수 있습니다. 코인·처치·상자·조수·클리어 기록을 보존하고 오래된 운반 물건만 해제합니다.
- 동굴 궁수(기본 체력 105), 돌진형(155), 수호자(190)는 지상 초반 적보다 강합니다. 궁수는 0.7초 예고 후 잠근 위치로 중력 720의 포물선 화살을 쏩니다. 돌진형은 0.7초 예고 후 방향을 잠그고 0.72초/속도 470으로 돌진하며 대상당 한 번만 타격합니다. 점프로 몸 위를 넘거나 나무 방패로 정면 화살을 막을 수 있습니다. 방패 충돌 시 화살은 사라지고 나무 소리가 납니다. 전투/예고/투사체는 일시정지 시 멈춥니다. 각 맵의 기존 배율도 적용합니다.
- 숨은 적은 보스 조건에서 제외합니다. 필수 적은 바람숲 48, 노을 폐허 40, 물안개 길 46이며 전체 적 수 54/47/52와 기존 처치 ID는 유지합니다. 필수 길에 삽 구입을 요구하지 않습니다. 숨은 조수는 발견 즉시 동행 자리를 쓰지 않고 현재 원정에 합류합니다.
- 포인터별 동시 이동+E/공격/점프, 개별 원형 버튼/조이스틱 크기·위치 편집, 운반 중 펀치 흐림 표시, 캐릭터 체력바, 1.15 simulation 초 동료 이동 화면, 발견 지도와 저장·소스 ZIP을 유지합니다. 기본 효과음은 첫 사용자 입력에서 활성화되며 소리 토글은 없습니다. 일시정지의 소리 테스트는 유지합니다.

## Runtime

No framework, CDN or server is required. Namespace `globalThis.PIGGY` connects plain scripts.
config → world/exploration/motion/state → art/pixel/audio/combat → game/export → ui/controls → main.
Canvas logical resolution is 1280×720. Device-pixel ratio is capped at 2.
Game simulation uses 1/60 second steps, capped frame accumulation after inactive periods.
All damage, attacks, projectiles, knockback, invulnerability and revival use simulation delta.
Wall-clock timeouts only serve UI notifications, the gesture sound-test sequence and download cleanup; combat/revival use simulation time.

## Visuals

Background: forest/ruins/brook layers, fixed world feature IDs, independent parallax factors,
foreground rocks and per-room landmarks. Camera changes do not reseed shapes.
Actors: fixed-length joint rigs from motion.js, distance-driven planted feet, counter-swinging
shoulders, 90/290ms alternating punches and 45ms snap kicks; separate carry/air/hit poses.
Walking uses FK elbows with consistent hinge direction. Carry IK uses outward elbows and fixed
hand anchors. Running blends stride length without resetting gaitPhase. Roundhouse has its own
620ms chamber/pivot/extension/re-chamber/plant sequence, with damage at 260ms.
Logical ground is y=600. world.js projects each world position onto its room route height; cameraY follows the same route. Actor, object, projectile and shadow rendering share this projection. It is side-view 2.5D, not free depth movement or platform physics.
Monsters/items: original SVG files as Image objects, with transform-based bounce/wing/attack feedback.
pig.svg embeds original generated PNG bytes with a visible-bounds viewBox; it is an inert
right-facing ceramic prop and has no idle motion or direction flipping.
Changing final art does not require changing enemy balance data.

## Input and sound

Playing hides camp header/footer and fills the viewport. Action dock renders only learned and
currently applicable actions. Carrying keeps hand attacks visible but disabled/grey. Source/save/layout/sound test are in pause; sound toggle and purchased shield are usable on the right.
Touch-action, selection/callout rules and Safari gesture listeners suppress zoom/selection.
Web Audio starts only after an input gesture; envelopes/noise generate local foley with no downloads.

## Save boundary

State rules contain all serializable progression. The game snapshots player/pig position and HP.
Map IDs and enemy/chest IDs are stable. Live room enemies are filtered using saved dead IDs.
Schema 2 saves add default progress for new maps and unlock the successor of already cleared maps.
Legacy skills.jump is normalized into skills.run at the same level. Money and map IDs stay unchanged.
Uncollected coins persist in drops. Chest opening and enemy death are persisted immediately.
Periodic snapshots run about every 0.8 simulation seconds; pagehide/visibility suspend also snapshot.
Same-origin localStorage does not provide account security or multi-device synchronization.

## Money boundary

`coins`: safe, spendable at home. `runCoins`: risky current expedition money.
`settle(reason)` clears runCoins immediately and then banks the permitted amount.
A successful clear sweeps outstanding drops only once. A defeat does not sweep floor coins.

## Build/source boundary

scripts/build.py allowlists root project files and src/assets/scripts/tests/docs text files.
It writes source-bundle.js and inlines CSS, sources and manifest into dist/index.html.
Public source view uses textContent, not untrusted innerHTML. JSON escapes `<` on embedding.
The client ZIP writer implements stored ZIP entries, CRC32 and UTF-8 filenames without dependencies.
The ZIP exporter regenerates source-bundle.js to make an exported directory runnable.
No personal localStorage values are ever read by the source exporter.
Personal save export is a separate explicit user action.

## Extending

Add maps/enemies/helpers/skills in src/config.js using new stable IDs.
Add save schema migrations before changing an existing ID or incompatible state shape.
Keep obligatory enemies reachable using free movement; optional upper rewards may need learned skills.
Any backend leaderboard/trading/online account work is new scope, not already supported.

## World, combat and control extensions

world.js extends original stable-ID rooms instead of relocating old enemies. Each map adds three
regions and bidirectional loop connections, smooth route knots, theme/biome props and SVG mapTrack.
World.chart derives route connectors and player markers from real portal/spawn and position data.
Uncleared saves encounter new enemies; previously cleared maps remain cleared until explicit replay.

combat.js owns boss telegraphs, fixed attack direction/landing position, charge/leap motion,
enemy projectile sweeps and front-facing shield collision. Blocking lowers the body and expands
lower coverage; it is unavailable while carrying/attacking. Removed shots cannot hit again.
Boss phases and hazards stop with simulation, and each wave tracks targets in a Set.

controls.js provides a captured pointer joystick with a dead zone and releases keys on cancellation.
Editing pauses gameplay and captures drag before gameplay handlers. Draft layouts are detached
from state until Save. Size and viewport-relative positions are validated on import and clamped
for current dimensions, allowing recovery through Cancel or Reset. Native Safari/device audio
and long-session balance remain unverified.
