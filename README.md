# Recordoc_FE

## 실행 방법

이 프로젝트는 실시간 녹음에서 native module(`@siteed/audio-studio`)을 사용하므로 Expo Go로 테스트할 수 없습니다. Android development build 앱을 설치해서 실행해야 합니다.

### 1. 사전 준비

- Node.js: 가능하면 `20.19.4+` 또는 `22.13.0+`
- Android Studio / Android SDK
- Android Emulator 또는 USB 디버깅이 켜진 Android 실기기
- 백엔드 서버 실행

### 2. 백엔드 주소 확인

실기기에서 테스트할 때는 `localhost`를 쓰면 안 됩니다. 개발 PC와 휴대폰이 같은 네트워크에 있어야 하고, `src/constants/config.ts`의 주소가 개발 PC의 LAN IP를 가리켜야 합니다.

예시:

```ts
export const API_BASE_URL = "http://172.30.1.2:8000";
export const WS_BASE_URL = "ws://172.30.1.2:8000";
```

Android Emulator에서 로컬 백엔드를 볼 때는 보통 `10.0.2.2`를 사용할 수 있습니다.

```ts
export const API_BASE_URL = "http://10.0.2.2:8000";
export const WS_BASE_URL = "ws://10.0.2.2:8000";
```

### 3. 의존성 설치

```bash
npm install
```

### 4. Android development build 설치 및 실행

처음 실행할 때, native dependency를 추가/삭제했을 때, `app.json`의 native config plugin이 바뀌었을 때는 development build를 다시 만들어야 합니다.

```bash
npx expo run:android
```

이 명령은 Android native project를 준비하고, 앱을 빌드한 뒤 Emulator 또는 연결된 실기기에 설치합니다.

### 5. 이후 개발 서버만 실행

development build 앱이 이미 설치되어 있고 JS/TS 코드만 바꿨다면 매번 `run:android`를 다시 할 필요는 없습니다.

```bash
npx expo start --dev-client
```

그 다음 설치된 `Recordoc_FE` 앱을 열고 Metro 개발 서버에 연결합니다. 터미널에서 `a`를 눌러 Android로 열 수도 있습니다.

## 실시간 녹음 테스트 순서

1. 백엔드 서버를 먼저 켭니다.
2. `src/constants/config.ts`의 `API_BASE_URL`, `WS_BASE_URL`이 기기에서 접근 가능한 주소인지 확인합니다.
3. 앱에서 로그인해 access token이 저장된 상태로 만듭니다.
4. 녹음 화면으로 진입합니다.
5. 개발 콘솔에서 다음 형태의 로그가 찍히는지 확인합니다.

```text
[Realtime] PCM stream started: ... sampleRate=16000, channels=1 ...
```

6. 말했을 때 하단 실시간 라인에 interim/final 전사가 표시되는지 확인합니다.
7. 25초 이상 말한 뒤 summary 이벤트가 오면 상단 요약 청크가 생기고, 해당 final transcript 범위가 하단 실시간 라인에서 접히는지 확인합니다.
8. `전체 보기`를 눌러 summary의 원문이 펼쳐지는지 확인합니다.
9. 저장 시 422 없이 완료되는지 확인합니다.

## 자주 막히는 부분

- Expo Go에서 실행하면 안 됩니다. native module이 들어가 있으므로 development build가 필요합니다.
- 실기기 테스트에서 `localhost` 또는 `127.0.0.1`은 휴대폰 자기 자신을 뜻합니다. 개발 PC의 LAN IP를 사용해야 합니다.
- native dependency나 `app.json` plugin을 바꾼 뒤에는 `npx expo run:android`를 다시 실행해야 합니다.
- `npx tsc --noEmit`은 현재 기존 `src/screens/DetailScreen.tsx:126`의 `ScrollView` ref 타입 오류 때문에 실패할 수 있습니다.
