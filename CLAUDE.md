# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# 개발 서버 시작 (캐시 초기화 포함 권장)
npx expo start --clear

# 플랫폼 지정
npx expo start --android
npx expo start --ios
npx expo start --web

# 타입 체크
npx tsc --noEmit
```

새 패키지 설치 시 반드시 `npx expo install <pkg>`를 사용할 것 (`npm install` 금지).
Expo SDK 54의 `bundledNativeModules.json` 기반으로 호환 버전을 자동 선택하기 때문.

No test runner is configured yet.

## Architecture

**Stack**: Expo SDK 54 + React Native 0.81 + TypeScript (strict mode), New Architecture enabled.  
**Routing**: expo-router v6 (파일 기반 라우팅, `app/` 디렉토리).  
**Entry point**: `package.json` `"main": "expo-router/entry"` → `app/_layout.tsx`

## 폴더 구조

```
app/                          # expo-router 라우트 (얇은 wrapper만, 로직 없음)
  _layout.tsx                 # Root Stack: (tabs) + recording modal
  recording.tsx               # → src/screens/RecordingScreen
  (tabs)/
    _layout.tsx               # Tabs + 커스텀 TabBar 주입
    index.tsx                 # → src/screens/HomeScreen  (루트 경로 /)
    my-work.tsx               # stub
    chat.tsx                  # stub
    more.tsx                  # stub

src/
  screens/                    # 실제 화면 컴포넌트
    HomeScreen.tsx
    RecordingScreen.tsx
  components/                 # 공유 UI 컴포넌트
    TabBar.tsx                # 커스텀 탭바 (BottomTabBarProps 시그니처)
    TabBar.styles.ts
    StopRecordingModal.tsx    # 녹음 종료 확인 모달
  styles/
    theme.ts                  # 공유 색상 토큰 (Colors 객체)
    HomeScreen.styles.ts
    RecordingScreen.styles.ts
```

## 라우팅 구조

- `/` → `app/(tabs)/index.tsx` → `HomeScreen`
- `/recording` → `app/recording.tsx` → `RecordingScreen` (modal 방식으로 슬라이드 업)
- `/my-work`, `/chat`, `/more` → 각각 stub 화면

mic FAB는 탭 라우트가 아님. `TabBar.tsx`에서 `router.push('/recording')`으로 모달 진입.

## 스타일 규칙

- 색상은 항상 `@/styles/theme`의 `Colors.*`를 사용할 것. 하드코딩 금지.
- 스타일은 컴포넌트 파일에 인라인으로 두지 않고 `*.styles.ts`로 분리.
- `TabBar`의 스타일만 예외적으로 `src/components/TabBar.styles.ts`에 위치.

## Import alias

`@/` → `src/` 로 매핑 (`tsconfig.json` + `metro.config.js`).

```ts
import { Colors } from '@/styles/theme';
import HomeScreen from '@/screens/HomeScreen';
```

## Backend 프로젝트 참조 (`../Recordoc_BE/`)

백엔드는 FastAPI + asyncpg + PostgreSQL(pgvector)로 구성된 Python 서버입니다. 기본 URL: `http://localhost:8000`

### 폴더 구조

```
Recordoc_BE/server/
├── routes/                       # API 엔드포인트
│   ├── audio.py                  # POST /audio/transcripts, POST /audio/summarize
│   ├── auth.py                   # POST /auth/login, POST /auth/register
│   ├── rag.py                    # POST /rag/query
│   └── realtime.py               # WebSocket 실시간 전사 (FE 미연동)
│
├── services/                     # 비즈니스 로직
│   ├── transcript_ingestion_service.py   # 오디오 → 청크 전체 파이프라인
│   ├── transcription_service.py          # Whisper STT
│   ├── audio_chunking.py                 # FFmpeg 분할
│   ├── chunk_metadata_service.py         # LLM 메타데이터 보강
│   ├── rag_query_service.py              # 벡터 유사도 검색
│   ├── summary_service.py                # GPT 요약
│   ├── summary_pdf_service.py            # PDF 생성
│   └── auth_service.py                   # 인증
│
├── repositories/
│   ├── rag_repository.py         # transcripts / segments / chunks CRUD
│   └── auth_repository.py
│
├── schemas/                      # Pydantic 요청·응답 모델
│   ├── rag.py                    # Transcript, Segment, Chunk
│   ├── auth.py                   # LoginRequest, TokenResponse
│   └── realtime.py
│
├── db/
│   ├── connection.py             # asyncpg 커넥션 풀
│   └── migrations/               # SQL 마이그레이션
│
├── main.py                       # FastAPI 앱 진입점
└── settings.py                   # 환경변수 설정 (pydantic-settings)
```

### 주요 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/auth/register` | 회원가입 |
| `POST` | `/auth/login` | 로그인 → JWT 토큰 반환 |
| `POST` | `/audio/transcripts` | 오디오 업로드 → 전사·청킹·임베딩 (multipart/form-data) |
| `POST` | `/audio/summarize` | 오디오 요약만 (DB 저장 없음) |
| `GET`  | `/audio/transcripts` | 트랜스크립트 목록 조회 |
| `GET`  | `/audio/transcripts/:id` | 트랜스크립트 상세 조회 |
| `POST` | `/rag/query` | 자연어 질의 → 유사 청크 + 응답 |

### 핵심 스키마 (`schemas/rag.py`)

```python
Transcript: { id, status, full_text, summary, created_at }
Segment:    { id, transcript_id, text, start_seconds, end_seconds, speaker_label }
Chunk:      { id, transcript_id, text, topic, subtopic, keywords[], embedding }
```

### 환경변수 (`server/.env`)

```
DATABASE_URL=postgresql://...   # asyncpg 접속 문자열
OPENAI_API_KEY=sk-...           # Whisper + GPT
```

---

## 현재 상태

- UI 언어: 한국어
- 상태 관리: `useState` / `useRef` / `useEffect` 로컬만 사용 (전역 상태 라이브러리 없음)
- 음성 녹음 API 미연동 — `RecordingScreen`의 타이머·스크립트는 mock 데이터
- `StopRecordingModal`의 `onConfirm`에서 현재는 `router.back()` 처리 (추후 STT 트리거 예정)
