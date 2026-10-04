# 게시용 구성과 현재 상태

**공개 경로: https://minsung.pages.dev/piggy-quest/**
기존 Cloudflare Pages 프로젝트에 추가했으며 원래 첫 화면은 보존합니다.
버전별 커밋·배포 ID·HTTP 검증은 상위 `docs/piggy-quest-integration.md`에 기록합니다.
ChatGPT Sites 게시 도구가 이 환경에 제공되지 않아 chatgpt.site 주소는 없습니다.
VM Chromium의 공개 HTTPS 검사는 CA 신뢰 문제로 제한됩니다. 시스템 CA 신뢰 DB 변경은
자동 승인 검토가 거부했습니다. TLS 검증을 끄지 않고 로컬 HTTP 기능 검사와 공개 HTTPS
파일 해시 비교를 구분해 기록합니다.

## 게시할 파일

`python scripts/build.py` → `dist/index.html`

이 한 파일에 게임 코드, 스타일, SVG 에셋, 파일별 소스 보기,
전체 소스 ZIP 내보내기, 인수인계 문서가 포함됩니다.
정적 HTML과 JavaScript 실행이 허용되는 웹 환경에서 사용할 수 있습니다.
빌드한 결과가 크므로 코드 일부만 복사하지 말고 파일 전체 또는 전체 소스 ZIP을 전달하세요.

## ChatGPT Sites를 사용할 수 있는 다음 작업 환경

전체 소스 ZIP 또는 단일 실행 HTML과 CODEX_PROMPT.md를 첨부하세요.
해당 환경에서 실제 제공되는 Sites 생성/게시 도구로 배포하도록 요청하세요.
게시 여부와 공유 범위는 실제 게시 인터페이스에서 확인해야 합니다.
이 문서는 Sites 공개 API나 파일 가져오기 메뉴가 항상 존재한다고 가정하지 않습니다.

공식 제품 안내를 확인한 출처:
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://chatgpt.com/features/sites/
확인일: 2026-10-04. 현재 대화에서 게시를 수행했다는 근거가 아닙니다.

## 게시 후 점검

홈이 로딩되는지, 새 원정/이동/전투/귀환/치료가 동작하는지 확인합니다.
사이트 안에서 소스코드 → 전체 ZIP을 내려받고 압축을 풀어 다시 실행합니다.
모바일 가로 화면에서 이동과 공격 버튼을 동시에 누릅니다.
브라우저 보안 정책으로 Blob 다운로드 또는 파일 저장이 제한되는지 확인합니다.
제한이 있다면 실제 소스 ZIP 파일을 배포 폴더에 두고 다운로드 경로를 연결해야 합니다.

## 금지

.env, API 키, 학생 자료, 사용자 개인 저장 JSON을 게시 파일에 넣지 않습니다.
서버·DB·로그인 기능을 이미 지원한다고 설명하지 않습니다.
사이트 URL 발급 및 HTTP/브라우저 확인 전에는 배포 완료로 보고하지 않습니다.
