# Architecture

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

## Runtime

No framework, CDN or server is required. Namespace `globalThis.PIGGY` connects plain scripts.
config → world/motion/state → art/audio/combat → game/export → ui/controls → main.
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
