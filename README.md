# moard-dashboard-extensions
이 프로젝트는 Moard의 크롬 확장 기반 사이드 패널 입니다.

<img width="270" alt="스크린샷 2025-06-17 오후 3 46 46" src="https://github.com/user-attachments/assets/a4db2e10-6e4a-42dd-ba23-02ca83f31153" />

## 개요

Moard는 다음과 같은 주요 기능을 제공합니다:

- 네이버 금융 페이지에서 사이드패널을 통한 주식 정보 확인
- 추천 콘텐츠 제공 (뉴스, 블로그, 유튜브)
- 사용자 행동 분석 및 추적

## 환경

- Chrome 브라우저 (Manifest V3 지원)
- 로그, 콘텐츠 서버 (localhost:8080)

## 실행 방법

1. Chrome 브라우저에서 확장 프로그램 관리 페이지(chrome://extensions/)를 엽니다.
2. 개발자 모드를 활성화합니다.
3. "압축해제된 확장 프로그램을 로드합니다" 버튼을 클릭합니다.
4. 프로젝트 디렉토리를 선택합니다.

## 프로젝트 구조

```
moard-dashboard-extensions/
├── manifest.json          # 확장 프로그램 설정 파일
├── sidepanel.html        # 사이드패널 UI
├── sidepanel.js          # 사이드패널 로직
├── background.js         # 백그라운드 스크립트
└── icon.png             # 확장 프로그램 아이콘
```

### 주요 파일 설명

- `manifest.json`: 확장 프로그램의 메타데이터와 권한 설정
- `sidepanel.html`: 사이드패널의 UI 구조와 스타일 정의
- `sidepanel.js`: 콘텐츠 표시, 사용자 로그, API 통신 등의 주요 기능 구현
- `background.js`: 탭 관리, 사이드패널 활성화, 링크 추적 등의 백그라운드 작업 처리
