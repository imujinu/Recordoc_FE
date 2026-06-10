# AGENTS.md (Wavb FE)

This file provides guidance to Codex when working with code in this repository.

## Important Constraints

- **Expo Go 사용 불가** — native module(`@siteed/audio-studio`) 포함으로 반드시 development build 필요
- **TypeScript**: `npx tsc --noEmit` 현재 실패함 (`src/screens/DetailScreen.tsx:126` ScrollView ref 타입 오류). 이 오류는 기존 known issue로 무시할 것.

## Commands

```bash
# 의존성 설치
npm install
npx expo install expo-font expo-constants expo-linking react-native-worklets

# 최초 빌드 또는 native dependency 변경 시
npx expo run:android

# JS/TS 코드만 변경 시 (development build 앱이 이미 설치된 경우)
npx expo start --dev-client
```

**`npx expo run:android` 재실행 필요한 경우:**
- native dependency 추가/삭제 시
- `app.json` config plugin 변경 시

## Environment Setup

백엔드 주소는 `src/constants/config.ts`에서 설정:

```ts
// Android Emulator
export const API_BASE_URL = "http://10.0.2.2:8000";
export const WS_BASE_URL = "ws://10.0.2.2:8000";

// 실기기 (개발 PC의 LAN IP 사용)
export const API_BASE_URL = "http://<LAN_IP>:8000";
export const WS_BASE_URL = "ws://<LAN_IP>:8000";
```

실기기에서 `localhost` / `127.0.0.1` 사용 시 휴대폰 자기 자신을 가리키므로 연결 불가.

## Architecture

Expo SDK 54 + React Native + TypeScript. expo-router 기반 파일 라우팅.

### Folder Structure
Wavb_FE/
├── app/                    # expo-router 라우트 (얇은 wrapper)
└── src/
├── screens/            # 실제 화면 컴포넌트
├── components/         # 공유 컴포넌트
├── constants/
│   └── config.ts       # API_BASE_URL, WS_BASE_URL
└── styles/

## Windows 환경 주의사항
- PowerShell로 파일 직접 수정 시 반드시 `-Encoding UTF8` 명시
- `npx` 실행 시 `npx.cmd` 사용 (PS 실행 정책 우회)

## Error Handling Policy

다음 상황에서는 자체 수정 시도 없이 즉시 멈추고 사용자에게 보고할 것:

1. **파일 인코딩 손상** — apply_patch 또는 텍스트 치환 후 구문 오류가 발생한 경우
2. **동일한 오류로 2회 이상 재시도** — 같은 실패가 반복되면 루프 중단
3. **작업 범위 외 파일에서 오류 발생** — 수정하지 않은 파일의 타입/빌드 오류는 건드리지 말고 목록만 보고

보고 형식:
- 발생한 오류 내용
- 시도한 접근법
- 사용자에게 필요한 결정 사항