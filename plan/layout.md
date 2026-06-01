# Plan: 프로젝트 구조 전면 재편 + expo-router 마이그레이션

## Context

현재 프로젝트는 2개의 독립된 화면 파일(`App.tsx`, `RecordingScreen.tsx`)이 루트에 나란히 있으며, 라우팅/네비게이션이 없고, 스타일이 컴포넌트 파일 안에 인라인으로 포함되어 있다. 앱이 5개 이상의 화면으로 성장할 것을 고려해, 지금 초기 단계에 구조를 잡는다.

목표:
- expo-router (파일 기반 라우팅) 도입
- 스타일과 컴포넌트 분리
- 확장 가능한 폴더 구조 확립
- 홈 화면 mic FAB → RecordingScreen 이동 연결

---

## 목표 폴더 구조

```
Recordoc_FE/
├── app/                          # expo-router 라우트 (얇은 wrapper만)
│   ├── _layout.tsx               # Root Stack (tabs + recording modal)
│   ├── recording.tsx             # → src/screens/RecordingScreen
│   └── (tabs)/
│       ├── _layout.tsx           # Tabs + 커스텀 TabBar 연결
│       ├── index.tsx             # → src/screens/HomeScreen
│       ├── my-work.tsx           # stub
│       ├── chat.tsx              # stub
│       └── more.tsx              # stub
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx        # App.tsx 내용 (탭바 제외)
│   │   └── RecordingScreen.tsx   # 기존 RecordingScreen.tsx 이전
│   ├── components/
│   │   ├── TabBar.tsx            # 커스텀 탭바 (App.tsx에서 분리)
│   │   └── TabBar.styles.ts
│   └── styles/
│       ├── theme.ts              # 공유 색상 토큰
│       ├── HomeScreen.styles.ts
│       └── RecordingScreen.styles.ts
├── assets/
├── babel.config.js               # 신규 생성
├── app.json                      # scheme, plugins, web.bundler 추가
├── package.json                  # main 변경 + 패키지 추가
└── tsconfig.json                 # @/ 경로 alias 추가
```

---

## 구현 단계

### Step 1: 패키지 설치 및 설정 파일 수정

**1-1. 패키지 설치**
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated
```

> **왜 `npm install`이 아닌 `npx expo install`?**
> Expo는 SDK 버전마다 각 패키지의 호환 버전을 `bundledNativeModules.json`으로 관리한다. `npx expo install`은 이 목록을 참조해 SDK 54에 맞는 버전을 자동 선택한다. `npm install`로 최신 버전을 받으면 네이티브 코드 불일치로 런타임 크래시가 날 수 있다.

| 패키지 | 역할 |
|---|---|
| `expo-router` | 파일 기반 라우팅 엔진. `app/` 디렉토리 구조가 곧 URL/라우트가 됨 |
| `react-native-safe-area-context` | iPhone 노치·안드로이드 엣지 등 안전 영역 계산. expo-router의 `<Stack>`, `<Tabs>`가 내부적으로 의존함 |
| `react-native-screens` | 각 화면을 네이티브 View가 아닌 네이티브 Screen 컴포넌트로 렌더링해 메모리·성능 최적화. expo-router 필수 의존성 |
| `react-native-gesture-handler` | 터치·스와이프 제스처를 JS 스레드가 아닌 네이티브 스레드에서 처리. 화면 전환 스와이프 제스처에 필요 |
| `react-native-reanimated` | 네이티브 스레드 기반 애니메이션. expo-router의 화면 전환 애니메이션(모달 슬라이드 등)에 필요 |

**1-2. `package.json`**
- `"main"` → `"expo-router/entry"`

> expo-router는 자체 진입점(`expo-router/entry`)을 통해 `app/` 디렉토리를 스캔하고 라우트를 등록한다. 기존 `index.ts`의 `registerRootComponent(App)` 방식은 단일 컴포넌트를 수동으로 등록하는 방식이라 파일 기반 라우팅과 공존할 수 없다.

**1-3. `app.json`**
```json
{
  "expo": {
    "scheme": "recordoc",
    "plugins": ["expo-router"],
    "web": { "bundler": "metro", "favicon": "./assets/favicon.png" },
    // ...기존 내용 유지
  }
}
```

> - **`scheme`**: expo-router는 딥링크 URL 스킴이 필수다. 앱 내 화면 간 이동이 내부적으로 URL(`recordoc://recording`)로 표현되기 때문. 없으면 개발 서버 시작 시 경고 + 일부 기능 미동작.
> - **`plugins: ["expo-router"]`**: Expo 빌드 시 expo-router가 필요한 네이티브 설정(Babel 플러그인, Metro 설정 등)을 자동 주입하도록 한다.
> - **`web.bundler: "metro"`**: expo-router는 Metro 번들러 기반으로 동작한다. 기본값인 Webpack과 충돌하므로 명시적으로 교체해야 한다.

**1-4. `tsconfig.json`** — `compilerOptions` 내 추가:
```json
"paths": { "@/*": ["./src/*"] }
```

> `src/screens/HomeScreen`을 import할 때 `../../screens/HomeScreen` 같은 상대경로 대신 `@/screens/HomeScreen`으로 쓸 수 있게 한다. 파일이 깊어질수록 `../../../`가 늘어나 가독성이 떨어지고 파일 이동 시 모든 경로를 수정해야 한다. alias는 이 문제를 근본적으로 방지한다.

**1-5. `babel.config.js`** 신규 생성 (루트에 없음):
```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

> 현재 루트에 `babel.config.js`가 없다. Expo는 내부 기본값으로 동작하지만, `tsconfig.json`의 `paths` alias(`@/`)를 Metro가 인식하려면 명시적인 Babel 설정이 필요하다. `babel-preset-expo`는 expo-router 플러그인과 TSX 트랜스파일을 모두 처리한다.

---

### Step 2: 공유 테마 토큰 추출

**`src/styles/theme.ts`** 신규 생성:
```ts
export const Colors = {
  mint: '#22C9A0',
  mintLight: '#E6F7F3',
  bg: '#F7FAF9',
  white: '#fff',
  border: '#eee',
  borderLight: '#e8f4f0',
  textDark: '#222',
  textMid: '#555',
  textLight: '#aaa',
} as const;
```

> 현재 `MINT = '#22C9A0'`이 `App.tsx`와 `RecordingScreen.tsx`에 각각 중복 선언되어 있다. 색상 하나를 바꾸려면 모든 파일을 열어서 수정해야 한다. `theme.ts`로 단일화하면 디자인 변경이 한 곳에서 전파된다. `as const`를 붙이면 TypeScript가 문자열 리터럴 타입으로 추론해 오타를 컴파일 타임에 잡는다.

---

### Step 3: HomeScreen 분리

**`src/screens/HomeScreen.tsx`**
- `App.tsx` 내용을 기반으로 생성
- `MINT`/`MINT_LIGHT`/`BG` 상수 → `Colors` import로 교체
- `<View style={styles.tabBar}>...</View>` 블록 제거 (TabBar 컴포넌트로 이동)
- `moreVisible` 모달 제거 (더보기는 tab route로 대체)
- 녹음 그리드 아이템 onPress: `router.push('/recording')`
- styles → `@/styles/HomeScreen.styles` import

> **왜 탭바를 HomeScreen에서 제거하는가?** 탭바는 앱의 모든 탭에서 공유되는 UI다. HomeScreen에 두면 각 탭 화면마다 탭바를 직접 렌더링해야 하는 구조가 된다. expo-router의 `<Tabs tabBar={...}>`에 한 번만 등록하면 모든 탭에서 자동으로 동작한다.
>
> **왜 `moreVisible` 모달을 제거하는가?** 탭바가 TabBar 컴포넌트로 분리되면 "더보기" 버튼의 onPress가 HomeScreen의 state(`moreVisible`)에 접근할 수 없다. 더보기는 독립된 탭 라우트(`more.tsx`)로 분리하는 것이 자연스러운 구조다.

**`src/styles/HomeScreen.styles.ts`**
- `App.tsx`의 `StyleSheet.create` 블록 이전
- tabBar/tabItem/recButton 관련 스타일 제거
- 색상 → `Colors.*` 참조로 교체

> 스타일을 별도 `.styles.ts` 파일로 분리하는 이유: `App.tsx`는 현재 컴포넌트 로직 240줄 + 스타일 정의가 한 파일에 있다. 스타일 파일을 분리하면 각 파일이 하나의 책임만 가지며, 화면 로직을 읽을 때 스타일 코드가 방해하지 않는다. 컴포넌트와 같은 폴더가 아닌 `src/styles/`에 두는 이유는 나중에 스크린 폴더 구조가 바뀌어도 스타일 경로가 안정적으로 유지되기 때문이다.

---

### Step 4: RecordingScreen 이전

**`src/screens/RecordingScreen.tsx`**
- `RecordingScreen.tsx` 내용 기반
- `MINT`/`MINT_LIGHT` → `Colors` import
- 헤더 "취소" 버튼: `router.back()`
- styles → `@/styles/RecordingScreen.styles` import

> 헤더 "취소" 버튼에 `router.back()`을 연결하는 이유: RecordingScreen은 `presentation: 'modal'`로 스택에 쌓인다. `router.back()`은 현재 라우트를 스택에서 꺼내 이전 화면(홈 탭)으로 돌아간다. 이전엔 네비게이션이 없어서 버튼이 아무 동작도 안 했다.

**`src/styles/RecordingScreen.styles.ts`**
- 기존 `StyleSheet.create` 블록 이전
- 색상 → `Colors.*` 참조로 교체

---

### Step 5: TabBar 컴포넌트 분리

**`src/components/TabBar.tsx`**
- `App.tsx`의 탭바 UI 추출
- 시그니처: `({ state, descriptors, navigation }: BottomTabBarProps)`
- 탭 4개 (홈, 내작업, 채팅, 더보기) → `navigation.navigate(routeName)`
- 중앙 mic FAB (탭 라우트 아님) → `router.push('/recording')`
- 활성 탭: `state.index`로 MINT vs 회색 구분
- styles → `./TabBar.styles` import

> **왜 expo-router 기본 탭바가 아닌 커스텀 컴포넌트를 쓰는가?** 현재 디자인에 중앙 mic FAB가 `marginTop: -18`로 탭바 위로 떠 있는 구조(floating action button)가 있다. 이 레이아웃은 expo-router/react-navigation의 기본 `tabBarButton` 옵션으로 구현할 수 없다. `<Tabs tabBar={(props) => <TabBar {...props} />}`로 완전한 커스텀 컴포넌트를 넘기면 레이아웃 제약이 없다.
>
> **mic FAB가 탭 라우트가 아닌 이유:** FAB는 탭 네비게이션의 일원이 아니라 어느 탭에서든 열 수 있는 임시 화면(modal)의 진입점이다. 탭으로 등록하면 URL에 `/mic` 같은 경로가 생기고 탭 상태에 포함되어 부자연스러운 UX가 된다.

**`src/components/TabBar.styles.ts`**
- tabBar/tabItem/tabLabel/tabLabelActive/recButton 스타일 포함

---

### Step 6: expo-router 파일 생성

**`app/_layout.tsx`** — 루트 Stack:
```tsx
import 'react-native-gesture-handler'; // 반드시 첫 번째 import
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recording" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

> - **`react-native-gesture-handler`를 첫 번째 import로**: 안드로이드에서 제스처 인식기를 JS 번들 로드 전에 네이티브 레이어에 등록해야 한다. 다른 코드 이후에 import되면 제스처가 동작하지 않는다.
> - **`SafeAreaProvider`를 루트에 배치**: 하위 컴포넌트들이 `useSafeAreaInsets()`나 `<SafeAreaView>`로 노치/바 영역을 계산할 때 이 Provider에서 값을 읽는다. 루트에 한 번만 두면 된다.
> - **`presentation: 'modal'`**: RecordingScreen을 전체 화면 교체가 아닌 아래서 올라오는 시트로 표시한다. iOS에서는 카드 스타일 모달, 안드로이드에서는 슬라이드 업 애니메이션으로 동작한다.

**`app/(tabs)/_layout.tsx`**:
```tsx
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="my-work" options={{ headerShown: false }} />
      <Tabs.Screen name="chat" options={{ headerShown: false }} />
      <Tabs.Screen name="more" options={{ headerShown: false }} />
    </Tabs>
  );
}
```

> expo-router의 `(tabs)` 그룹(소괄호)은 URL 경로에 나타나지 않는 라우트 그룹이다. 탭 내부 경로는 `/my-work`, `/chat` 등 깔끔하게 표현된다. `<Tabs.Screen>`을 명시하는 이유: 미등록 파일도 라우트가 되지만, `headerShown: false` 같은 옵션을 주려면 명시해야 한다.

**`app/(tabs)/index.tsx`**:
```tsx
import HomeScreen from '@/screens/HomeScreen';
export default HomeScreen;
```

> route 파일은 이처럼 1-2줄짜리 wrapper여야 한다. 실제 로직이 route 파일에 있으면 화면 이동이 필요 없는 테스트나 재사용이 어려워진다.

**`app/(tabs)/my-work.tsx`**, **`chat.tsx`**, **`more.tsx`**: 각각 최소 stub View

> 라우트 파일이 없으면 탭바에서 해당 탭을 누를 때 "Unmatched Route" 에러가 난다. 내용이 없더라도 파일은 있어야 한다.

**`app/recording.tsx`**:
```tsx
import RecordingScreen from '@/screens/RecordingScreen';
export default RecordingScreen;
```

---

### Step 7: 루트 파일 정리

삭제:
- `index.ts` — `package.json`의 `"main": "expo-router/entry"`가 진입점을 대체했으므로 이 파일은 더 이상 실행되지 않는다. 남겨두면 혼란만 유발한다.
- `App.tsx` — 내용이 `src/screens/HomeScreen.tsx`로 완전히 이전됐다.
- `RecordingScreen.tsx` (루트) — 내용이 `src/screens/RecordingScreen.tsx`로 이전됐다.

---

## 주의사항

1. `react-native-gesture-handler`는 `app/_layout.tsx`에서 **첫 번째 import**이어야 함 (안드로이드 제스처 미작동 방지)
2. `SafeAreaProvider`는 루트 `_layout.tsx`에서 전체를 감싸야 함
3. Reanimated v4 (SDK 54 번들)은 babel plugin 불필요 — 추가하지 말 것
4. `더보기` 모달은 HomeScreen에서 제거하고 `app/(tabs)/more.tsx` stub으로 대체
5. mic FAB는 실제 탭 라우트가 아님 — `<Tabs.Screen>`에 등록하지 말 것

---

## 검증 방법

1. `npx expo start` 실행 후 에러 없이 홈 화면 렌더링 확인
2. 하단 탭바 4개 탭 전환 동작 확인
3. mic FAB 클릭 → RecordingScreen 모달로 전환 확인
4. RecordingScreen "취소" 버튼 → 홈 화면으로 복귀 확인
5. `npx tsc --noEmit` 타입 에러 없음 확인
