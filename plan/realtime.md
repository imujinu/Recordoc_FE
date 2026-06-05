# 실시간 PCM 스트리밍 전환 플랜 (Recordoc_FE)

## Context

현재 `useRealtimeTranscription.ts`는 `expo-av`의 `Audio.Recording`(HIGH_QUALITY 프리셋)으로 5초마다 녹음을 끊어 **m4a/AAC 컨테이너 파일**을 base64로 읽어 WebSocket으로 전송한다. 그러나 백엔드(`Recordoc_BE/server/routes/realtime.py`)는 이미 `websocket.iter_bytes()`로 **raw PCM16(linear16 / 16000Hz / mono)** 바이트를 그대로 받아 Deepgram Nova-3로 흘려보내는 **실시간 스트리밍 구조**로 완성돼 있다. 즉 FE가 보내던 압축 컨테이너 포맷이 백엔드 기대 포맷과 달라 전사가 실패해 왔다.

또한 백엔드는 `transcript` 메시지에 `chunk_index`가 아니라 `is_final`(interim/final)을 보내고, FE는 모든 transcript(중간 결과 포함)를 `segments`에 append하는 버그가 있다.

**목표**: FE를 development build로 전환하고 `@siteed/expo-audio-studio`의 `useAudioRecorder`로 **연속 raw PCM16**을 캡처해 `onAudioStream` 콜백마다 즉시 `ws.send()`하는 진짜 실시간 스트리밍으로 재작성한다. interim/final을 분리해 UI를 개선한다.

**결정 사항**: 1차 검증은 **Android 로컬 dev build**(`npx expo run:android`), 스트리밍 라이브러리는 **@siteed/expo-audio-studio**.

## 전제 / 불변 조건

- 스트리밍/포맷 계약은 불변: FE 출력은 백엔드/Deepgram 설정에 맞춘다 — **encoding=linear16(pcm 16bit signed LE), sample_rate=16000, channels=1(mono)**.
- WS 엔드포인트 `${WS_BASE_URL}/audio/realtime/connect?token=${token}`, 연결 직후 `{"type":"ready"}`, 인증 실패 시 close code 4001. (변경 없음)
- 백엔드는 **바이너리 프레임만** 오디오로 처리하고, 종료는 `WebSocketDisconnect`로 감지한다(텍스트 `stop` 미처리).
- `@siteed/expo-audio-studio`는 네이티브 모듈 → **Expo Go 불가, dev client 필수**.
- **예외(이번 플랜이 추가하는 유일한 백엔드 변경)**: "문단을 요약으로 접기(collapse)"를 FE가 근사·race 없이 정확히 하려면, 백엔드가 ① 각 `transcript`(final)에 `final_index`를 부여하고 ② `summary` 이벤트에 그 요약이 덮은 final 범위(`start_final_index`/`end_final_index`)를 실어야 한다. → **STEP B(백엔드 보강)** 에서 처리.

## 목표 동작 (이 플랜이 달성하려는 UX)

1. 실시간 음성 → transcript(interim/final) → 하단 **실시간 라인**에 표시.
2. 25초 누적 시 백엔드가 `summary` 발화 → 해당 final 범위의 실시간 라인을 **걷어내고(collapse)** 상단 **요약 청크**로 접는다.
3. 요약 청크의 **"전체 보기"** 토글로 `full_text`(원문)를 펼쳐 볼 수 있다.

---

## 작업 단계

### STEP 0 — 의존성 & development build 전환 (선행)

1. 설치:
   - `npx expo install expo-dev-client`
   - `@siteed/expo-audio-studio` (README 지정 버전; `npx expo install`로 호환 버전 시도, 안 되면 README 버전 고정)
2. `app.json` 수정:
   - `plugins`에서 `["expo-av", {...}]` **제거**.
   - `@siteed/expo-audio-studio` config plugin 추가(마이크 권한 문자열 = iOS `NSMicrophoneUsageDescription`).
   - Android `RECORD_AUDIO`는 이미 `android.permissions`에 존재 → 유지.
   - `newArchEnabled: true` 유지 — 라이브러리의 New Architecture 지원 여부 README 확인. 미지원이면 호환 버전 선택(false 전환은 최후수단).
3. `package.json`에서 `expo-av` 제거 (grep으로 이 훅이 유일 사용처임 확인 완료 → 안전).
4. `npx expo prebuild --clean` 으로 `android/` 네이티브 폴더 생성.
5. `npx expo run:android` (Android Studio/SDK + 실기기 또는 에뮬레이터). 이후 개발은 `npx expo start --dev-client`.
6. `config.ts`의 `WS_BASE_URL`(`ws://172.30.1.2:8000`)이 실기기/에뮬레이터에서 접근 가능한 LAN IP인지 확인(PC·기기 동일 네트워크).

> iOS는 이번 범위 밖. 추후 EAS development 프로파일(`eas.json`에 `developmentClient:true`) 추가 후 `eas build --profile development --platform ios`.

### STEP B — 백엔드 보강: summary 경계 인덱스 + 키워드 추출 (`Recordoc_BE`)

두 가지를 `summary` 이벤트에 추가한다:
- **(B-1) 경계 인덱스** — FE collapse를 근사·race 없이 정확히 하기 위한 `final_index` / summary 범위.
- **(B-2) 키워드** — 요약문을 토대로 LLM이 핵심 키워드를 추출해 함께 전송(요약 청크의 키워드 칩에 사용).

**왜 (B-1)이 필요한가**: 현재 `summary` 이벤트는 `{summary, full_text, segment_index}`만 보내고, 그 요약이 **어느 transcript(final)까지 덮었는지** 정보가 없다. 그래서 FE는 "직전 요약 이후 받은 줄 = 이번 요약"으로 근사할 수밖에 없는데, `_send_summary`가 백그라운드 태스크(`asyncio.create_task`)라 경계 근처 final 한두 개가 다음 구간으로 새는 race가 있다. → **백엔드가 final에 인덱스를 부여하고, summary에 그 범위를 실으면 FE가 정확히 collapse**할 수 있다.

**왜 (B-2)인가**: 키워드를 FE에서 뽑으면 모바일에 LLM/형태소 부담이 가고, 이미 요약을 만드는 백엔드가 같은 텍스트로 한 번에 뽑는 게 효율적이다. 25초 분량(짧은 텍스트)이라 **요약+키워드를 단일 LLM 호출**로 처리해 레이턴시·비용을 줄인다.

1. **`server/routes/realtime.py` `forward_transcripts`** — final마다 단조 증가 `final_index`를 부여해 payload에 실어 보내고, 버퍼에도 전달:
   ```python
   buffer = RealtimeSummaryBuffer(threshold_seconds=25.0)
   segment_index = 0
   final_index = 0
   async for event in provider.transcript_events():
       payload = asdict(event)
       if event.is_final:
           payload["final_index"] = final_index   # FE가 세그먼트 매칭 키로 사용
       await websocket.send_json(payload)
       if event.is_final:
           if event.text:
               buffer.add(event.text, final_index) # 범위 추적용 인덱스 동반 전달
           if buffer.should_flush():
               task = asyncio.create_task(_send_summary(websocket, buffer, segment_index))
               _background_tasks.add(task); task.add_done_callback(_background_tasks.discard)
               segment_index += 1
           final_index += 1
   ```
   - interim 이벤트엔 `final_index`를 넣지 않는다(FE는 final에서만 읽음). 빈 텍스트 final은 `buffer.add` 호출 안 함 → 범위에서 자연히 제외(FE도 빈 final은 저장 안 하므로 정합).
2. **`server/services/summary/summary_service.py`** — (B-2) 요약+키워드 단일 호출 메서드 **신규 추가**(기존 `summarize()`는 다른 호출부가 있어 그대로 둠):
   ```python
   import json

   async def summarize_with_keywords(self, transcript: str) -> tuple[str, list[str]]:
       """요약 + 핵심 키워드를 한 번의 LLM 호출로 추출 (실시간 25초 구간용, 짧은 텍스트 전제)."""
       if not transcript.strip():
           raise HTTPException(status_code=422, detail="Transcript cannot be empty.")
       prompt = (
           "다음 한국어 음성 전사 구간을 분석해 JSON만 출력하라.\n"
           '형식: {"summary": "2~3문장 한국어 요약", "keywords": ["핵심어", ...]}\n'
           "- keywords는 3~6개, 전사에 실제 등장한 핵심 명사/개념만. 새 내용 지어내지 말 것."
       )
       try:
           response = await self._client.chat.completions.create(
               model=self._model,
               temperature=0.3,
               response_format={"type": "json_object"},  # JSON 강제
               messages=[
                   {"role": "system", "content": SYSTEM_PROMPT},
                   {"role": "user", "content": f"{prompt}\n\nText:\n{transcript.strip()}"},
               ],
           )
           data = json.loads(response.choices[0].message.content or "{}")
       except Exception:
           # 키워드 추출 실패가 요약 자체를 막지 않도록 폴백: 기존 summarize()로 요약만, 키워드는 빈 배열
           return await self.summarize(transcript), []
       summary = (data.get("summary") or "").strip()
       keywords = [k.strip() for k in (data.get("keywords") or []) if isinstance(k, str) and k.strip()][:6]
       if not summary:
           return await self.summarize(transcript), keywords
       return summary, keywords
   ```
3. **`server/services/realtime/summary_buffer.py`** — final 범위 추적 + 키워드 반환:
   - 필드 추가: `_start_final_index: int | None = None`, `_end_final_index: int = -1`.
   - `add(self, text, final_index)`: 텍스트 append 후 `if self._start_final_index is None: self._start_final_index = final_index`; `self._end_final_index = final_index`.
   - `flush_with_summary()`: 내부 호출을 `summarize()` → **`summarize_with_keywords()`** 로 교체하고, 반환을 `(full_text, summary, keywords, start_final_index, end_final_index)` **5-튜플**로 확장. 성공 시 `_start_final_index=None`, `_end_final_index=-1` 리셋(기존 `_segments`/타이머 리셋과 함께).
4. **`server/schemas/realtime.py` `RealtimeSummaryEvent`** — 필드 추가:
   ```python
   start_final_index: int       # 이 요약이 덮는 첫 final_index (포함)
   end_final_index: int         # 마지막 final_index (포함)
   keywords: list[str] = []     # 요약문 기반 핵심 키워드 (3~6개)
   ```
5. **`server/routes/realtime.py` `_send_summary`** — 5-튜플 언팩 후 범위·키워드를 이벤트에 전달:
   ```python
   full_text, summary, keywords, start_idx, end_idx = await buffer.flush_with_summary()
   event = RealtimeSummaryEvent(summary=summary, full_text=full_text,
                                segment_index=segment_index,
                                start_final_index=start_idx, end_final_index=end_idx,
                                keywords=keywords)
   ```

> 하위호환: 추가 필드뿐이라 기존 transcript/summary 소비 코드와 충돌 없음. FE는 `final_index` 없는 interim은 무시.

### STEP 1 — `src/hooks/useRealtimeTranscription.ts` 전면 재작성

**제거**: `expo-av`/`expo-file-system` import, `startNewRecording`, `sendCurrentChunk`, `CHUNK_INTERVAL_MS`, `currentRecordingRef`, `isSendingRef`, `chunkIndexRef`, `chunkIntervalRef`, STEP 디버그 로그.

**유지·재사용**: `base64ToArrayBuffer`, WS 핸드셰이크 Promise 패턴(ready resolve / 4001 reject), `segmentsRef`+`setSegments` 이중화, 1초 elapsed 타이머(`timerIntervalRef`).

**신규 ref/state**: `allSegmentsRef`(저장용 전체 세그먼트, 불변 누적), `summariesRef`+`setSummaries`(요약 청크), `interimText` state. `segmentsRef`는 **표시용**으로 격하 — summary collapse 시 해당 범위 제거.

**데이터 모델 변경**:
```ts
export interface RealtimeTranscriptSegment {
  finalIndex: number;   // 백엔드가 부여한 final_index — collapse 매칭 키 (STEP B)
  text: string;
  startSeconds: number;
  endSeconds: number;
}

// 백엔드 summary 이벤트(RealtimeSummaryEvent)와 1:1 매핑 (STEP B로 범위·키워드 필드 추가됨).
export interface RealtimeSummaryChunk {
  segmentIndex: number;    // 백엔드 summary 전용 카운터(0,1,2…). transcript와 별개.
  summary: string;         // GPT 요약문
  fullText: string;        // 원문 전체 ("전체 보기"용)
  keywords: string[];      // 요약문 기반 핵심 키워드 (B-2, 3~6개)
  startFinalIndex: number; // 이 요약이 덮는 첫 final_index (포함)
  endFinalIndex: number;   // 마지막 final_index (포함)
  timeRange: string;       // collapse된 세그먼트의 startSeconds~endSeconds로 정확 계산
}
// 반환 타입에 추가: interimText: string, summaries: RealtimeSummaryChunk[]
```

**스트리밍 흐름**:
- `const { startRecording, stopRecording, pauseRecording, resumeRecording } = useAudioRecorder();`
- `start()`: ① WS 연결 + ready 대기(기존 Promise) → ② `await startRecording({ sampleRate:16000, channels:1, encoding:'pcm_16bit', interval:250, onAudioStream })` → ③ elapsed 타이머 시작.
- `onAudioStream(event)`: 실행 가드(`isRunningRef && !isPausedRef && ws OPEN`) 후 `event.data` 타입 분기:
  - 문자열(base64) → `base64ToArrayBuffer(event.data)` (재사용)
  - `ArrayBuffer` → 그대로
  - `Float32Array` 등 → `.buffer` (필요시 Int16 변환은 STEP 4 검증 후 확정)
  - → `ws.send(buffer)` (바이너리 프레임)
- `pause/resume`: `isPausedRef` 토글 + `pauseRecording()/resumeRecording()`.

**메시지 처리(interim/final 분리 + summary collapse)**:
- `ready` → `setIsConnected(true)`, resolve.
- `transcript` & `is_final === true` → `startSeconds=lastEndRef`, `endSeconds=elapsedRef`, 커밋 후 `lastEndRef=endSeconds`, **`finalIndex = msg.final_index`**(STEP B). 세그먼트를 **두 곳에 append**: `allSegmentsRef`(저장용, collapse로도 절대 제거 안 함) + `segmentsRef`(표시용). `setSegments`, interim 비움.
- `transcript` & `is_final === false` → `interimText`만 갱신(`segments`에 넣지 않음 — 기존 버그 해소).
- `summary` → **collapse 처리** (payload: `{ type:"summary", summary, full_text, segment_index, start_final_index, end_final_index, keywords }`):
  1. `segmentsRef`에서 `finalIndex ∈ [start_final_index, end_final_index]`인 세그먼트를 골라낸다(`covered`).
  2. `timeRange = `${formatTime(covered[0].startSeconds)} — ${formatTime(covered.at(-1).endSeconds)}`` 로 **정확히** 계산.
  3. `RealtimeSummaryChunk`(summary/fullText/**keywords**/segmentIndex/start·endFinalIndex/timeRange) 생성 → `summariesRef` append, `setSummaries`.
  4. **`segmentsRef`에서 `covered`를 제거** → `setSegments`(남은 = 현재 진행 구간). = "문단을 요약으로 접기".
  - `covered`가 비면(이미 collapse됐거나 빈 구간) 요약 청크만 추가하고 제거 생략(방어).
- `error` → `console.warn`.

> ⚠️ **summary 타이밍**: "20~30초"가 아니라 **고정 25초 임계값**이며, `should_flush()`가 `is_final` 시점에만 평가되므로 "마지막 flush 이후 25초 경과한 뒤 도착하는 첫 final"에서 발화된다(보통 25초대 중후반). STEP B 범위 인덱스 덕분에 발화가 늦게 도착해도 **정확한 세그먼트만 collapse**된다(근사·race 없음).

**stop() 순서(마지막 발화 유실 방지)**:
1. `isRunningRef=false`, 타이머 clear.
2. `await stopRecording()` — 버퍼 잔여 PCM이 `onAudioStream`으로 마지막 송신되도록 **`ws.close()`보다 먼저**.
3. (보정) `interimRef`에 텍스트 남아 있으면 마지막 세그먼트로 커밋(합성 `finalIndex = 직전+1`; 어떤 summary 범위에도 안 들어가 collapse 안 됨 → 실시간 라인에 남고 저장엔 포함).
4. `ws.close()` (텍스트 `stop` 전송 **제거**), `wsRef=null`, `setIsConnected(false)`.
5. `return allSegmentsRef.current` — **collapse로 제거되지 않은 전체 발화**를 저장용으로 반환(요약으로 접힌 구간도 원문 보존).

### STEP 2 — `src/screens/RecordingScreen.tsx` 수정

> 이 화면은 이미 새 UI(상단 **요약 청크** `SUMMARIZED_CHUNKS` + 하단 **실시간 라인** + 키워드 검색 팝업)로 교체됨. 아래는 mock → 실데이터 연결.

- 훅 구조분해에 `interimText`, `summaries` 추가.
- **요약 청크(상단) — collapse 결과**: 하드코딩 `SUMMARIZED_CHUNKS` 제거 → `summaries`(`RealtimeSummaryChunk[]`)를 렌더.
  - `summary` + 정확한 `timeRange` 표시. **`keywords[]`는 이제 백엔드(B-2)가 제공** → 기존 키워드 칩 UI를 `chunk.keywords`로 렌더(빈 배열이면 칩 영역 생략).
  - **키워드 칩 탭 → 검색 팝업**: 칩 자체는 실데이터지만 **검색 실행 API(강의자료/웹)는 아직 없음** → 팝업은 띄우되 `handleSearch`는 현행 `console.log` TODO 유지(별도 검색 API STEP에서 연동).
  - **"전체 보기" 토글**: 청크별 확장 상태를 `RecordingScreen` 로컬 state로 관리(예: `expanded: Record<number, boolean>`를 `segmentIndex` 키로). 펼치면 `chunk.fullText`(원문)를 `summaryText` 아래에 표시, 접으면 숨김. → 목표 동작 3 충족.
- **실시간 라인(하단) — 현재 진행 구간만**: collapse로 제거되고 **남은** `segments`만 표시(이미 요약된 줄은 상단으로 이동). 진행 중 문구는 `{interimText || '받아쓰는 중...'}`. 세그먼트 `key={seg.finalIndex}`, 시간 `formatTime(seg.startSeconds)`.
- **저장 매핑(`handleStop`)**: 저장은 **collapse와 무관하게 전체 발화 보존** — `stop()` 반환값(전체 세그먼트)을 매핑(`segment_index: seg.finalIndex`, `start_seconds: Math.floor(seg.startSeconds)`, `end_seconds: Math.floor(seg.endSeconds)`). UI에서 접혔다고 원문이 사라지면 안 되므로, 훅이 collapse 시 제거한 세그먼트도 **별도 누적 ref(`allSegmentsRef`)에 보존**해 `stop()`이 그걸 반환하도록 한다.
- 자동 스크롤 `useEffect` 의존성에 `interimText`(선택) 추가.

### STEP 3 — `src/api/realtime.ts` (✅ 이번에 수정 완료)

세그먼트 스키마(`{segment_index,start_seconds,end_seconds,text}`)는 동일하지만, **상위 payload에 버그가 있어 수정함**:

- **`title` 필수 누락 → 422 버그 수정**: 백엔드 `RealtimeSaveRequest.title: str`은 필수(`ingest_realtime_segments`도 `title` 위치 인자 필수). `SaveRealtimePayload`에 `title: string` 추가, `RecordingScreen.handleStop`에서 `title: \`${recordDate} 녹음\`` 전달.
- **`domain_type` 값 보정**: 실시간 저장 경로(`ingest_realtime_segments → ingest_from_segments`)는 `_resolve_domain_type` 정규화를 **거치지 않고** 받은 값을 그대로 DB 저장·청크 플래닝에 사용. 기존 `'meeting'`은 유효 6종(`general/legal/medical/science/it/religion`)이 아니라 메타데이터 품질 저하 → `DomainType` 유니온 정의 후 `'general'`로 전송. (강의/회의 도메인이 백엔드에 없어 중립값 `general` 채택; 추후 도메인 확장 시 변경.)

---

## 세그먼트 타이밍 방식 (채택안)

5초 고정 청크가 사라지므로 **elapsed 스냅샷 누적**: 각 final 도착 시 `startSeconds=직전 endSeconds`, `endSeconds=현재 elapsedSeconds`, 커밋 후 `lastEndRef` 갱신 → 세그먼트가 시간선상 연속. 세그먼트 식별/저장 인덱스는 **백엔드 `final_index`(STEP B)** 를 그대로 사용(요약 범위 매칭과 키 일치). 요약 청크의 `timeRange`는 collapse된 세그먼트들의 `startSeconds~endSeconds`로 계산.

## 변경 파일 요약

| 파일 | 요지 |
|---|---|
| **`Recordoc_BE` `routes/realtime.py`** | (STEP B) final에 `final_index` 부여·전송, `_send_summary`가 범위·키워드 전달 |
| **`Recordoc_BE` `services/summary/summary_service.py`** | (B-2) `summarize_with_keywords()` 신규 — 요약+키워드 단일 LLM 호출 |
| **`Recordoc_BE` `services/realtime/summary_buffer.py`** | (STEP B) final 범위 추적 + `summarize_with_keywords` 사용, flush 5-튜플 반환 |
| **`Recordoc_BE` `schemas/realtime.py`** | (STEP B) `RealtimeSummaryEvent`에 `start/end_final_index`·`keywords` 추가 |
| `app.json` | expo-av plugin 제거, @siteed config plugin 추가 |
| `package.json` | expo-dev-client·@siteed 추가, expo-av 제거 |
| `src/hooks/useRealtimeTranscription.ts` | 전면 재작성(스트리밍·interim/final·**summary collapse**·`allSegmentsRef`·stop 순서) |
| `src/screens/RecordingScreen.tsx` | 요약 청크=`summaries`(collapse 결과)+**전체보기 토글**, 실시간 라인=남은 `segments`, interimText |
| `src/api/realtime.ts` | ✅ **(완료)** `title` 필수 추가(422 버그 수정), `domain_type` 유효값(`general`)으로 보정 |
| `android/` (prebuild 생성) | 신규 네이티브 폴더 |

---

## 검증 (Verification)

1. **PCM 흐름**: `onAudioStream`에서 첫 청크 `buffer.byteLength` 로그 — 16000×0.25×2 ≈ **8000B/청크** 근처면 설정 적용 정상. `event.sampleRate/channels` 동시 로그.
2. **포맷 sanity**: 첫 청크 앞부분에 `RIFF`/`ftyp` 등 매직바이트가 없어야 함(컨테이너 혼입 시 전사 실패).
3. **전사 round-trip**: 5초 발화 → 콘솔에 `transcript`(is_final true/false) 수신 로그 → UI에서 interim 한 줄이 갱신되다 final에서 새 줄로 커밋되는지 확인.
4. **summary collapse round-trip**: 발화를 25초 이상 지속 → `{type:"summary", start_final_index, end_final_index}` 수신 → ① 상단 요약 청크 1개 추가, ② **해당 범위의 실시간 라인이 하단에서 사라지고**(collapse) 그 다음 발화만 남는지, ③ `timeRange`가 그 구간의 실제 시각과 맞는지 확인.
5. **키워드**: summary 이벤트의 `keywords`가 3~6개 들어오고(전사에 등장한 단어), 요약 청크에 칩으로 렌더되는지 확인. LLM 키워드 추출 실패 시에도 `keywords:[]`로 요약은 정상 표시(폴백).
6. **전체보기**: 요약 청크의 "전체 보기" 토글 → `full_text` 원문이 펼쳐지고 다시 접히는지 확인.
7. **저장(collapse 무관 전체 보존)**: stop 후 payload에 `title`·`domain_type('general')` 포함(422 안 남), **요약으로 접힌 구간을 포함한 전체 세그먼트**가 들어가는지(=`allSegmentsRef` 반환), `start/end_seconds` 비음수·단조 증가, 마지막 발화 포함 확인.
8. **타입 체크**: `npx tsc --noEmit` (기존 `DetailScreen.tsx:126` 무관 에러 외 신규 에러 없어야 함).

## 리스크

- **onAudioStream data 타입**: base64 문자열이 아니라 `Float32Array`/`ArrayBuffer`일 수 있음 → 첫 청크 로그로 실제 타입 확정 후 변환 경로 고정(Float32라면 Int16 LE 변환 필요).
- **샘플레이트 강제**: 기기 기본이 44100/48000으로 떨어지면 Deepgram 16000 설정과 불일치 → 인식 실패. 라이브러리가 16000 리샘플을 보장하는지 확인.
- **New Architecture 호환**: `newArchEnabled:true`와 라이브러리 호환 버전 확인.
- **바이너리 전송**: 반드시 디코드된 ArrayBuffer를 `send`(base64 문자열을 그대로 보내면 백엔드 `iter_bytes()`가 못 받음).
- **STEP B 선행 의존**: FE collapse(STEP 1/2)는 백엔드의 `final_index`·summary 범위 필드에 의존한다. STEP B가 배포되기 전엔 `final_index`가 `undefined`로 와서 범위 매칭이 빈 배열이 된다 → 그 사이엔 collapse 없이 "요약 청크만 추가, 실시간 라인 유지"로 동작(graceful degrade). 두 레포 배포 순서: **BE(STEP B) 먼저 → FE**.
- **빈 final / 인덱스 정합**: 백엔드가 빈 텍스트 final에 `final_index`를 증가시키는지 여부와 무관하게, FE는 **수신한 `final_index` 값을 그대로** 키로 쓰므로 갭이 있어도 매칭은 정확. 단 FE도 빈 final은 세그먼트로 저장하지 않아야 범위에서 자연 제외된다.
- **키워드 JSON 모드(B-2)**: `response_format={"type":"json_object"}`는 `settings.openai_summary_model`이 JSON 모드를 지원해야 함(gpt-4o/4o-mini/3.5-turbo 등 OK). 미지원 모델이면 프롬프트로 JSON을 유도하고 파싱 실패 시 폴백(요약만, `keywords:[]`)으로 안전. 추가 LLM 비용은 25초당 1회로 미미.
