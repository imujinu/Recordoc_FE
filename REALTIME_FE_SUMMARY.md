# Frontend 실시간 녹음 연동 작업 요약

## 변경 내용

### 신규 파일

| 파일 | 내용 |
|------|------|
| `src/constants/config.ts` | API_BASE_URL, WS_BASE_URL 상수 (Android 에뮬레이터 기본값) |
| `src/api/auth.ts` | `POST /auth/login` 호출 + SecureStore(`'at'`, `'rt'`)에 토큰 저장 |
| `src/api/realtime.ts` | `POST /audio/transcripts/realtime` 저장 API |
| `src/hooks/useRealtimeTranscription.ts` | WebSocket 연결 + 5초 청크 오디오 녹음 루프 훅 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `app.json` | `expo-av` 플러그인(마이크 권한 메시지), Android `RECORD_AUDIO` 권한 추가 |
| `app/_layout.tsx` | `useSegments` 추가 → 로그인 후 route 변화 시 토큰 재확인(status 즉시 업데이트) |
| `src/screens/LoginScreen.tsx` | `handleLogin()` → `login()` API 호출, 성공 시 `router.replace('/')` |
| `src/screens/RecordingScreen.tsx` | 모킹 타이머/스크립트 제거 → `useRealtimeTranscription` 훅 연결 |

### 패키지 추가

```bash
npx expo install expo-av expo-file-system
```

---

## useRealtimeTranscription 훅 흐름

```
start()
  → SecureStore에서 'at' 토큰 읽기
  → Audio.requestPermissionsAsync()
  → WebSocket 연결: ws://HOST:8000/audio/realtime?token=<jwt>
  → "ready" 이벤트 수신 → 첫 번째 Audio.Recording 시작
  → setInterval(5초): 청크 중지 → bytes 읽기 → WS binary 전송 → 새 청크 시작
  → setInterval(1초): 경과 시간 카운트

pause() / resume()
  → isPausedRef 플래그 + recording.pauseAsync() / startAsync()
  → 청크 루프는 유지되나 isPausedRef로 skip

stop()
  → 인터벌 정리
  → 마지막 청크 전송
  → WS에 {"type": "stop"} text frame 전송
  → WS 닫기
  → segmentsRef.current 반환 (저장용)
```

---

## 테스트 순서

```bash
# 백엔드 먼저 실행
cd Recordoc_BE/server
docker-compose up -d
uv run uvicorn main:app --reload

# 프론트엔드
cd Recordoc_FE
npx expo start --clear
```

1. 로그인 화면 → 테스트 계정 이메일/비밀번호 입력 → 로그인
2. 홈 화면 진입 확인 (SecureStore에 `'at'` 저장됨)
3. 탭바 중앙 마이크 FAB 탭 → RecordingScreen 진입
4. 마이크 권한 허용
5. 백엔드 로그에서 WebSocket 연결 수락 확인
6. 약 5초 후 첫 번째 전사 텍스트 화면 표시 확인
7. 일시정지 버튼 → 타이머 멈춤, 파형 회색 전환 확인
8. 재개 버튼 → 녹음 재개 확인
9. 정지 버튼 → 확인 모달 → "확인" → DB 저장 → 홈으로 이동 확인

---

## 실기기 테스트 시 주의사항

`src/constants/config.ts`의 URL을 **개발 PC의 LAN IP**로 변경 필요:

```typescript
export const API_BASE_URL = 'http://192.168.x.x:8000';  // PC의 실제 LAN IP
export const WS_BASE_URL  = 'ws://192.168.x.x:8000';
```

Android 에뮬레이터: `10.0.2.2` (현재 기본값)
iOS 시뮬레이터: `localhost`

---

## 알려진 제한사항

- **마지막 청크 미포함 가능**: `stop()` 호출 시점에 마지막 5초 미만 클립의 Whisper 전사가 아직 도착하지 않았을 경우, 해당 텍스트가 저장되지 않을 수 있음. 이전 완성된 청크들은 정상 저장됨.
- **domain_type 고정**: 현재 "meeting"으로 고정. 추후 사용자 선택 UI 추가 가능.
- **기존 타입 에러**: `src/screens/DetailScreen.tsx`의 `RefObject<ScrollView>` 에러는 기존 파일의 pre-existing 이슈이며 이번 작업과 무관.
