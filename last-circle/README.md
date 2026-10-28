# Last Circle — Windows 10인 배틀로얄 프로토타입

언리얼 엔진 5.6 C++ 프로젝트입니다. 사람 1~10명이 방에 모이고, **호스트가 시작하면 빈자리를 AI로 채워 총 10명**이 개인전을 합니다. 브라우저 게임이 아닙니다.

**현재 전달물은 소스 프로젝트와 빌드 도구입니다. 이 작업 환경에는 언리얼/Windows SDK가 없어 전체 게임을 컴파일하거나 실행하지 못했습니다. 실행 파일·설치 파일은 아직 생성되지 않았습니다.** 엔진 독립 경기 규칙 테스트만 실제로 통과했습니다. 아래 Windows 빌드와 두 PC 검증을 마쳐야 플레이 가능한 빌드라고 판단할 수 있습니다.

## 구현된 소스 범위

- Slate 방 생성·이름·선택적 비밀번호·검색·참가 UI. 호스트만 시작/전체 대기실 복귀 가능.
- Null 온라인 서브시스템의 LAN 세션, EOS 로그인·인터넷 세션 검색·P2P 연결 경로.
- 10인 정원, 시작 시 인원 확정과 AI 보충, 경기 중 신규 입장 차단.
- 수송기 이동 → 스페이스로 낙하(30초 후 자동 낙하) → 자동 낙하산 → 파밍 → 전투.
- 3인칭 카메라·조준·달리기·앉기·점프, 소총/권총, 재장전, 탄약, 회복 아이템, 인벤토리.
- 호스트가 사격 속도·탄약·시야 방향·피해·아이템 거리/가시선·승패를 판정. 총알은 히트스캔 방식.
- 단계별 자기장, 다음 안전 구역, 지도·미니맵·체력·탄약·남은 인원 HUD.
- 제한된 시야·반응 시간의 AI, 파밍·전투·회복·안전 구역 이동과 단순 장애물 회피.
- 사망 후 관전, 최후의 1인 승리, 호스트가 모든 참가자를 대기실로 복귀시켜 재경기.
- 게스트 이탈 시 탈락, 호스트 이탈 시 경기 종료와 연결 안내. 호스트 이전·중도 참가·재접속은 미지원.

## 품질에 대한 정확한 상태

현재 맵과 인물은 엔진 기본 도형으로 만든 **블록아웃**입니다. 이동에 맞춘 팔다리 움직임, 카메라 보간, 캐릭터 네트워크 스무딩을 코드에 넣었지만, 고품질 스켈레탈 애니메이션·손발 IK·사운드·총기 반동 애니메이션·완성된 아트는 포함하지 않습니다. 배그 같은 그래픽/자연스러운 모션을 완성한 결과물이 아닙니다.

1080p 중간 옵션/60fps는 설정된 **목표**이고 측정 결과가 아닙니다. 서버 틱은 30Hz입니다. 지연 보간은 있으나 서버 리와인드 방식의 지연 보상이나 안티치트는 없습니다. AI는 내비게이션 메시 경로 탐색 대신 단순 조향을 사용하므로 복잡한 모서리에서 막힐 수 있습니다. 현재 경기 흐름 검증용으로 보고, 실제 플레이 후 애니메이션과 AI 경로 탐색을 개선해야 합니다.

## Windows에서 최초 빌드

필요 환경:

1. Epic Games Launcher의 **Unreal Engine 5.6**와 Windows 대상 플랫폼 지원.
2. UE 5.6이 지원하는 Visual Studio 2022의 C++ 게임 개발 도구와 Windows SDK.
3. 충분한 SSD 공간. 개발용 RAM은 32GB 이상 권장(실행 최소 사양을 의미하지 않음).
4. 이 `last-circle` 폴더 전체. GitHub ZIP으로 받아도 됩니다.

PowerShell에서 폴더로 이동한 뒤 실행합니다. 엔진 경로는 설치 위치에 맞춥니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\Scripts\Build.ps1 `
  -EngineRoot "C:\Program Files\Epic Games\UE_5.6" -Mode Editor -Network LAN
```

이 명령은 다음을 순서대로 수행합니다.

1. 엔진 버전 확인, LAN 기본 설정 생성.
2. `LastCircleEditor` C++ 빌드.
3. 언리얼 Python 명령으로 `FrontEnd`·`Arena` 맵, 머티리얼, 시작 지점과 하늘 생성.
4. 생성 성공 로그와 맵 파일 확인.

그다음 `LastCircle.uproject`를 열어 **Standalone Game**으로 실행합니다. 준비 스크립트보다 먼저 프로젝트를 열면 기본 맵이 아직 없을 수 있습니다. 맵/머티리얼은 엔진이 생성하는 바이너리 파일이라 Git에는 포함하지 않았습니다. 기존 생성 파일을 자동으로 덮어쓰지 않습니다. 수동 수정한 Content를 삭제하기 전에는 백업하세요.

### 실행 파일 패키지와 설치 프로그램

```powershell
powershell -ExecutionPolicy Bypass -File .\Scripts\Build.ps1 `
  -EngineRoot "C:\Program Files\Epic Games\UE_5.6" -Mode Package -Network LAN
```

성공하면 `Builds\Windows\Windows\LastCircle.exe`와 필요한 파일들이 생성됩니다. **그 Windows 폴더 전체**를 친구에게 전달해야 합니다. exe 하나만 복사하면 실행되지 않습니다.

설치 프로그램은 Inno Setup 6 설치 후 다음처럼 빌드합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\Scripts\Build.ps1 `
  -EngineRoot "C:\Program Files\Epic Games\UE_5.6" -Mode Package -Network LAN `
  -InnoSetupCompiler "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
```

결과는 `Builds\Windows\LastCircle-Setup.exe`입니다. 설치 중 UE 필수 런타임 설치가 관리자 권한을 요청할 수 있습니다. 기본 게임 설치 위치는 사용자별 로컬 폴더입니다. 코드 서명과 스토어 배포는 포함하지 않습니다.

### 방을 열고 플레이하기

1. 호스트와 친구가 **같은 버전/같은 네트워크 모드**의 빌드를 실행합니다.
2. 호스트는 `CREATE ROOM`, 친구는 `FIND / REFRESH ROOMS`로 참가합니다.
3. 비밀번호가 있으면 친구가 입력란에 넣은 뒤 해당 방의 `JOIN`을 누릅니다.
4. 호스트가 원하는 인원에서 `START / FILL EMPTY SLOTS WITH AI`를 누릅니다.
5. 예: 사람 4명 → AI 6명. 혼자 시작해도 AI 9명이 들어갑니다.
6. 경기 후 호스트의 `RETURN EVERYONE TO LOBBY`로 다시 모입니다.

LAN 모드는 같은 사설 네트워크용입니다. 서로 다른 집에서 인터넷으로 접속하는 기능으로 오해하지 마세요. Windows 방화벽의 게임 통신을 허용해야 하며, LAN 기본 게임 포트는 UDP 7777, 검색 비콘은 UDP 14001입니다. 게스트 Wi-Fi나 AP 격리 환경에서는 검색이 차단될 수 있습니다. 첫 검증은 같은 공유기의 두 PC에서 진행하세요. 에디터 한 프로세스 안의 다중 PIE 세션은 이 기본 온라인 서브시스템 설정의 지원 대상이 아닙니다.

## 서로 다른 집에서 접속하기: EOS

EOS 연결 코드만으로는 작동하지 않습니다. 본인 Epic 개발자 조직의 실제 배포 설정이 필요합니다.

1. Epic Developer Portal에서 제품·샌드박스·배포와 게임 클라이언트를 만듭니다.
2. EOS Sessions, P2P, Connect에 필요한 클라이언트 정책과 Epic Account Services 로그인 권한을 구성합니다.
3. 테스트 계정들이 해당 샌드박스/배포와 EAS 앱에 접근할 수 있게 설정합니다. 개발 모드에서 승인되지 않은 친구 계정은 로그인하지 못할 수 있습니다.
4. `Config/EOS.example.ini`를 `Config/EOS.local.ini`로 복사합니다. 모든 `REPLACE_*` 값을 자신의 설정으로 바꿉니다. 암호화 키는 Epic 설정과 일치하는 64자리 16진수 키를 사용합니다.
5. `Build.ps1 -Network EOS`로 빌드하고 **같은 EOS 설정으로 패키징된 빌드**를 친구에게 전달합니다.
6. 각자 `Sign in / Check connection`으로 Epic 로그인 후 방을 생성·검색합니다.
7. 같은 LAN 테스트와 별도로, 실제 서로 다른 네트워크의 두 PC에서 접속/전투/호스트 종료를 확인합니다.

`EOS.local.ini`와 생성된 `DefaultEngine.ini`는 Git에서 제외됩니다. 게임 클라이언트 설정은 패키지에 포함되므로, 게임용 클라이언트 자격 외에 조직 관리용 비밀키나 개인 토큰을 넣지 마세요. 방 비밀번호는 가벼운 입장 제한이며 계정 인증이나 운영용 보안 체계를 대체하지 않습니다. LAN 연결 옵션에 비밀번호가 포함되므로 다른 서비스에서 사용하는 비밀번호를 재사용하지 마세요.

## 조작

| 동작 | 키 |
|---|---|
| 이동 / 시점 | WASD / 마우스 |
| 사격 / 조준 | 왼쪽 / 오른쪽 마우스 |
| 달리기 / 앉기 | Shift / C |
| 점프 / 수송기에서 내리기 | Space |
| 아이템 줍기 / 재장전 / 회복 | F / R / H |
| 소총 / 권총 | 1 / 2 |
| 인벤토리 / 지도 / 메뉴 | Tab / M / Esc |
| 사망 후 다음 생존자 관전 | V |

## 테스트와 다음 검증

Linux/macOS에서 엔진 독립 규칙 테스트:

```sh
./Scripts/Test.sh
```

Windows MSVC Developer Command Prompt:

```bat
cl /std:c++17 /EHsc /W4 /I Source\LastCircle\Public Tests\rules_test.cpp /Fe:"%TEMP%\last-circle-rules.exe"
"%TEMP%\last-circle-rules.exe"
```

상세한 실제 플레이 검증 항목은 [TESTING.md](TESTING.md), 사용 에셋 내역은 [ASSETS.md](ASSETS.md)를 참고하세요. **아래 상태를 구분합니다.**

| 검증 | 현재 결과 |
|---|---|
| 엔진 독립 C++ 경기 규칙 | 통과 |
| 프로젝트 JSON / 콘텐츠 생성 Python 문법 | 통과 |
| UHT·UE C++ 빌드 / 맵 생성 / Windows 패키징 | 미실행: UE/Windows 부재 |
| LAN 두 PC / EOS 서로 다른 인터넷 접속 | 미실행 |
| 10명 실제 클라이언트 / 지연·손실 테스트 | 미실행 |
| 1080p 성능 / 모션·잔상 품질 | 미실행 |

게임 로그는 패키지의 `LastCircle\Saved\Logs` 또는 사용자 로컬 저장 경로에 생깁니다(빌드 설정에 따라 다름). 문제가 생기면 해당 로그와 PC 사양으로 빌드/접속/그래픽 문제를 구분해야 합니다.
