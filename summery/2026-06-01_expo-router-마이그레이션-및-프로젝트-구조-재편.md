# expo-router 마이그레이션 및 프로젝트 구조 재편

**작업일시**: 2026-06-01  
**브랜치**: feat/screen-record

---

## 배경

기존 프로젝트는 `App.tsx`, `RecordingScreen.tsx` 두 파일이 루트에 나란히 있고, 라우팅이 없었으며 스타일이 컴포넌트 안에 인라인으로 포함되어 있었다. 앱이 5개 이상의 화면으로 성장할 것을 고려해 초기에 구조를 잡았다.

---

## 작업 내역

### 1. 패키지 설치

**설치한 패키지**

| 패키지 | 이유 |
|---|---|
| `expo-router ~6.0.24` | 파일 기반 라우팅 엔진 도입 |
| `react-native-safe-area-context ~5.6.0` | expo-router 내부 의존성. 노치/바 안전 영역 계산 |
| `react-native-screens ~4.16.0` | 화면을 네이티브 Screen 컴포넌트로 렌더링해 메모리 최적화 |
| `react-native-gesture-handler ~2.28.0` | 화면 전환 스와이프 제스처를 네이티브 스레드에서 처리 |
| `react-native-reanimated ~4.1.1` | 화면 전환 애니메이션(모달 슬라이드 등) |
| `@expo/vector-icons ^15.0.3` | 기존에 코드에서 import하고 있었으나 package.json에 미등록 상태였음 — 명시 등록 |

`npx expo install`을 사용한 이유: Expo SDK 54의 `bundledNativeModules.json` 기반으로 호환 버전을 자동 선택하기 위해. `npm install`로 최신 버전을 받으면 네이티브 코드 불일치로 런타임 크래시 발생 가능.

---

### 2. 설정 파일 수정

**`package.json`** — `"main": "index.ts"` → `"main": "expo-router/entry"`

expo-router는 자체 진입점을 통해 `app/` 디렉토리를 스캔하고 라우트를 등록한다. 기존의 `registerRootComponent(App)` 방식과 공존 불가.

**`app.json`** — `scheme: "recordoc"`, `web.bundler: "metro"` 추가

expo-router는 딥링크 URL 스킴이 필수(`scheme`)이며, Metro 번들러를 사용해야 한다(`web.bundler`). expo-router 플러그인은 `npx expo install` 시 자동 추가됨.

**`tsconfig.json`** — `paths: { "@/*": ["./src/*"] }` 추가

`../../styles/theme` 같은 상대경로 대신 `@/styles/theme`로 단순화. 파일 이동 시 import 경로를 일괄 수정할 필요가 없어진다.

**`babel.config.js`** — 신규 생성

루트에 babel 설정이 없었다. `tsconfig.json`의 `paths` alias를 Metro가 인식하려면 명시적 Babel 설정이 필요.

---

### 3. 공유 색상 토큰 추출

**`src/styles/theme.ts`** 신규 생성

`MINT = '#22C9A0'`이 `App.tsx`와 `RecordingScreen.tsx`에 각각 중복 선언되어 있었다. `Colors` 객체로 단일화해 디자인 변경이 한 곳에서 전파되도록 했다. `as const`로 TypeScript가 문자열 리터럴 타입으로 추론해 오타를 컴파일 타임에 잡는다.

---

### 4. 스타일 분리

**`src/styles/HomeScreen.styles.ts`**, **`src/styles/RecordingScreen.styles.ts`** 신규 생성

각 화면의 `StyleSheet.create` 블록을 별도 파일로 분리했다. 화면 로직을 읽을 때 스타일 코드가 방해하지 않으며, 각 파일이 단일 책임을 갖는다. 색상은 `Colors.*` 참조로 교체.

---

### 5. 화면 이전

**`src/screens/HomeScreen.tsx`** — `App.tsx` 내용 이전

변경 사항:
- 탭바 JSX 제거 (TabBar 컴포넌트로 분리)
- `moreVisible` 모달 제거 (더보기가 독립 탭 라우트로 분리되므로 불필요)
- 녹음 그리드 아이템 onPress: `router.push('/recording')` 연결
- `@/styles/theme`, `@/styles/HomeScreen.styles` import

**`src/screens/RecordingScreen.tsx`** — 루트 `RecordingScreen.tsx` 이전

변경 사항:
- 종료 확인 모달 → `StopRecordingModal` 컴포넌트 import로 교체
- 헤더 "취소" 버튼: `router.back()` 연결 (이전에는 아무 동작 없었음)
- 하단 "취소" 버튼: `router.back()` 연결
- StopRecordingModal `onConfirm`에서 `router.back()` 호출 (녹음 종료 후 홈 복귀)

---

### 6. StopRecordingModal 컴포넌트 분리

**`src/components/StopRecordingModal.tsx`** 신규 생성

RecordingScreen에 인라인으로 있던 종료 확인 모달을 독립 컴포넌트로 추출했다.

Props: `visible: boolean`, `onCancel: () => void`, `onConfirm: () => void`

분리 이유: 모달 UI와 RecordingScreen 로직이 분리되어 각자 독립적으로 이해·수정 가능하다. 추후 모달 디자인 변경 시 RecordingScreen 코드를 건드리지 않아도 된다.

---

### 7. TabBar 컴포넌트 분리

**`src/components/TabBar.tsx`**, **`src/components/TabBar.styles.ts`** 신규 생성

`App.tsx`의 커스텀 탭바를 독립 컴포넌트로 추출했다.

expo-router 기본 탭바 대신 커스텀 컴포넌트를 사용한 이유: 중앙 mic FAB가 `marginTop: -18`로 탭바 위로 떠 있는 디자인은 기본 `tabBarButton` 옵션으로 구현 불가. `<Tabs tabBar={props => <TabBar {...props} />}>`로 완전한 커스텀 컴포넌트를 주입.

mic FAB를 탭 라우트로 등록하지 않은 이유: FAB는 어느 탭에서든 열 수 있는 모달의 진입점이다. 탭으로 등록하면 URL 경로와 탭 상태에 포함되어 UX가 부자연스러워진다.

---

### 8. expo-router 라우트 파일 생성

```
app/
  _layout.tsx          루트 Stack (탭 그룹 + RecordingScreen 모달)
  recording.tsx        → src/screens/RecordingScreen
  (tabs)/
    _layout.tsx        커스텀 TabBar 주입
    index.tsx          → src/screens/HomeScreen
    my-work.tsx        stub
    chat.tsx           stub
    more.tsx           stub
```

`presentation: 'modal'`로 RecordingScreen이 아래서 올라오는 시트로 표시되게 설정.

`(tabs)` 소괄호 그룹은 URL 경로에 나타나지 않아 경로가 `/`, `/my-work`, `/chat`처럼 깔끔하게 표현된다.

`react-native-gesture-handler`를 `_layout.tsx`에서 첫 번째 import로 선언한 이유: 안드로이드에서 제스처 인식기를 JS 번들 로드 전에 네이티브 레이어에 등록해야 한다.

---

### 9. 루트 파일 삭제

- `index.ts` — `expo-router/entry`로 대체됨
- `App.tsx` — `src/screens/HomeScreen.tsx`로 이전됨
- `RecordingScreen.tsx` (루트) — `src/screens/RecordingScreen.tsx`로 이전됨

---

## 최종 파일 구조

```
Recordoc_FE/
├── app/
│   ├── _layout.tsx
│   ├── recording.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── my-work.tsx
│       ├── chat.tsx
│       └── more.tsx
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   └── RecordingScreen.tsx
│   ├── components/
│   │   ├── TabBar.tsx
│   │   ├── TabBar.styles.ts
│   │   └── StopRecordingModal.tsx
│   └── styles/
│       ├── theme.ts
│       ├── HomeScreen.styles.ts
│       └── RecordingScreen.styles.ts
├── assets/
├── babel.config.js
├── app.json
├── package.json
└── tsconfig.json
```

---

## 검증

- `npx tsc --noEmit` — 타입 에러 없음 확인
