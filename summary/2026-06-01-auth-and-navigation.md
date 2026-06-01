# 세션 작업 요약 — 2026-06-01 (인증 + 네비게이션)

## 1. WorkListScreen → 내 작업 탭 연결

**변경 파일**: `app/(tabs)/my-work.tsx`

stub 화면을 제거하고 `src/screens/WorkListScreen`을 import해 렌더링.

---

## 2. DetailScreen 라우트 추가 + 보기 버튼 연결

**변경 파일**: `app/detail.tsx` (신규), `app/_layout.tsx`, `src/screens/WorkListScreen.tsx`, `src/screens/DetailScreen.tsx`

- `app/detail.tsx` 생성 — DetailScreen 래퍼
- `_layout.tsx`에 `detail` Stack.Screen 추가
- WorkListScreen "보기" 버튼 → `router.push('/detail')`
- DetailScreen 뒤로가기 → `router.back()`

---

## 3. 탭바 아이콘 변경

**변경 파일**: `src/components/TabBar.tsx`

| 탭 | 변경 전 | 변경 후 |
|---|---|---|
| 내 작업 | `folder-outline` | `layers-outline` |
| 채팅 → 업로드 | `chatbubble-outline` / 라벨 "채팅" | `cloud-upload-outline` / 라벨 "업로드" |

---

## 4. UploadScreen → 업로드 탭 연결

**변경 파일**: `app/(tabs)/chat.tsx`

stub 화면을 제거하고 `src/screens/UploadScreen`을 import해 렌더링.

---

## 5. LandingScreen — AT/RT 없을 때 앱 진입 시 표시

**변경 파일**: `app/_layout.tsx`, `app/landing.tsx` (신규)

- `expo-secure-store` 설치
- `_layout.tsx`에서 앱 시작 시 SecureStore의 `'at'`, `'rt'` 키 조회
- 두 토큰이 모두 있으면 → `/(tabs)` 진입
- 하나라도 없으면 → `<Redirect href="/landing" />`
- 로딩 중엔 `null` 반환 (스플래시 유지)

---

## 6. LandingScreen → LoginScreen 연결

**변경 파일**: `app/login.tsx` (신규), `app/_layout.tsx`, `src/screens/LandingScreen.tsx`, `src/screens/LoginScreen.tsx`

- `app/login.tsx` 생성 — LoginScreen 래퍼
- `_layout.tsx`에 `login` Stack.Screen 추가
- LandingScreen "이메일로 시작하기" → `router.push('/login')`
- LoginScreen 뒤로가기 → `router.back()`

---

## 7. 테스트 계정 자동 로그인

**변경 파일**: `src/screens/LandingScreen.tsx`

LandingScreen "테스트 계정으로 로그인" 버튼에서 `login('test@example.com', '1234')` 호출.
성공 시 `router.replace('/')` → 탭 메인으로 이동, 실패 시 Alert 표시.
`src/api/auth.ts`의 `login()` 함수 재사용 (AT/RT SecureStore 저장 포함).

---

## 변경 파일 전체 목록

```
app/_layout.tsx                      — AT/RT 체크, landing·login Stack.Screen 추가
app/(tabs)/my-work.tsx               — WorkListScreen 연결
app/(tabs)/chat.tsx                  — UploadScreen 연결
app/detail.tsx                       — 신규 (DetailScreen 래퍼)
app/landing.tsx                      — 신규 (LandingScreen 래퍼)
app/login.tsx                        — 신규 (LoginScreen 래퍼)
src/components/TabBar.tsx            — 아이콘·라벨 변경
src/screens/WorkListScreen.tsx       — 보기 버튼 네비게이션 연결
src/screens/DetailScreen.tsx         — 뒤로가기 연결
src/screens/LandingScreen.tsx        — 이메일 버튼·테스트 로그인 연결
src/screens/LoginScreen.tsx          — 뒤로가기 연결
```
