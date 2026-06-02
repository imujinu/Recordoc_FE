# 실시간 Deepgram 스트리밍 구조 전환 플랜

## 배경 / 왜 바꿔야 하는가

현재 `useRealtimeTranscription.ts`는 `Audio.RecordingOptionsPresets.HIGH_QUALITY`로 녹음 후
**m4a/aac 파일 전체를 5초마다** WebSocket으로 전송한다.

백엔드(`deepgram_provider.py`)는 수신한 binary를 **raw PCM16 bytes**로 간주하여 Deepgram에 그대로 forwarding한다.
→ 포맷 불일치로 인해 **현재 실시간 전사는 동작하지 않는다.**

---

## 변경 범위

### 프론트엔드
- `src/constants/config.ts`
- `src/hooks/useRealtimeTranscription.ts`
- `src/screens/UploadScreen.tsx` (렌더링)

### 백엔드 (변경 없음)
백엔드는 이미 25초 버퍼 + `RealtimeSummaryEvent` 전송 로직이 구현되어 있다.
프론트엔드는 WebSocket 이벤트 수신만 추가하면 된다.

---

## 구현 스텝

---

### STEP 1 — 녹음 옵션을 Deepgram 스펙에 맞게 교체

**파일:** `src/constants/config.ts`

```
// Deepgram 요구 사항: linear16 encoding, 16kHz, mono
// HIGH_QUALITY 프리셋은 플랫폼마다 m4a/aac를 내보내 raw PCM이 아님.
// WAV(linearPCM) 포맷으로 명시적으로 고정해야 백엔드가 Deepgram에 그대로 forwarding 가능.
export const DEEPGRAM_RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/wav', bitsPerSecond: 256000 },
};

// 250ms: Deepgram에 자주 보낼수록 interim 응답이 빠름.
// 너무 짧으면(< 100ms) 파일 I/O 오버헤드가 커지므로 250ms가 적절한 균형점.
export const CHUNK_INTERVAL_MS = 250;
```

---

### STEP 2 — WAV 헤더 제거 후 raw PCM bytes만 전송

**파일:** `src/hooks/useRealtimeTranscription.ts`

```
// WAV 파일 = 44바이트 헤더(RIFF+fmt+data 마커) + raw PCM 데이터.
// 매 청크가 완전한 WAV 파일이므로 헤더를 제거하지 않으면
// Deepgram이 PCM 데이터 앞에 44바이트 헤더 쓰레기를 인식해 전사 오류가 발생한다.
// 'data' 서브청크 마커를 직접 탐색해 비표준 WAV 헤더 변형에도 대응.
function extractPcmFromWav(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  for (let i = 12; i < Math.min(buffer.byteLength - 8, 200); i++) {
    if (view.getUint32(i, false) === 0x64617461) { // 'data' ASCII
      return buffer.slice(i + 8); // data 마커(4) + 크기 필드(4) = 8바이트 스킵
    }
  }
  return buffer.slice(44); // fallback: 표준 44바이트 헤더
}
```

`sendCurrentChunk()` 내부에서:
```
// base64 → ArrayBuffer 변환 후 WAV 헤더 제거 → WebSocket으로 raw PCM 전송
const raw = extractPcmFromWav(base64ToArrayBuffer(base64));
wsRef.current.send(raw);
```

---

### STEP 3 — 불필요한 JSON stop 메시지 제거

**파일:** `src/hooks/useRealtimeTranscription.ts` (stop 함수)

```
// 현재: wsRef.current.send(JSON.stringify({ type: 'stop' })) 후 close()
// 백엔드 forward_audio()는 WebSocketDisconnect 예외만 감지해 종료하며,
// JSON stop 메시지를 받는 분기가 없어 불필요하다.
// 단순히 ws.close()만 호출하면 백엔드가 정상 종료 처리를 한다.
wsRef.current.close();
```

---

### STEP 4 — interim / final 결과 분리 표시

**파일:** `src/hooks/useRealtimeTranscription.ts`

```
// Deepgram은 is_final=false(중간 결과)와 is_final=true(확정 결과)를 구분해 전송한다.
// is_final=false를 별도 상태로 관리하지 않으면 확정되지 않은 텍스트가
// 세그먼트 배열에 중복 적재되어 UI가 깜빡이거나 텍스트가 중복된다.
const [interimText, setInterimText] = useState('');

// ws.onmessage 내:
// is_final=false → setInterimText(text)         // 실시간 미리보기
// is_final=true  → finalSegments.push(segment)  // 확정 세그먼트에 추가
//                  setInterimText('')            // 미리보기 초기화
```

---

### STEP 5 — 백엔드 `summary` 이벤트 수신 처리

**역할 분리 원칙:**
- **백엔드**: Deepgram final 결과를 버퍼에 쌓고, 누적 시간 ≥ 25초이면 GPT 요약 후 `summary` 이벤트 전송. 모든 집계·타이밍·요약은 백엔드 책임.
- **프론트엔드**: 이벤트를 받아 상태 업데이트만. 타이머/버퍼/요약 로직 없음.

```
// 백엔드가 보내는 RealtimeSummaryEvent 스키마 (프론트 변경 불필요)
{
  type: 'summary',
  summary: string,       // GPT 요약문
  full_text: string,     // 원문 전체 (프론트 "전체 보기" 버튼용)
  segment_index: number  // 몇 번째 25초 구간인지 (0부터)
}
```

**파일:** `src/hooks/useRealtimeTranscription.ts`

```typescript
// hook이 관리하는 상태 — 3개만 필요
//
// completedSegments: 백엔드가 summary를 보낸 완료 구간 목록
// currentTranscripts: 아직 summary가 안 온 현재 구간의 final 텍스트 누적 배열
// interimText: is_final=false인 실시간 미리보기 텍스트

type CompletedSegment = {
  summary: string;
  fullText: string;
  segmentIndex: number;
};

const [completedSegments, setCompletedSegments] = useState<CompletedSegment[]>([]);
const [currentTranscripts, setCurrentTranscripts] = useState<string[]>([]);
const [interimText, setInterimText] = useState('');

// ws.onmessage 이벤트별 처리
//
// type === 'transcript', is_final=false
//   → setInterimText(text)
//
// type === 'transcript', is_final=true
//   → setCurrentTranscripts(prev => [...prev, text])
//   → setInterimText('')
//   // 타이밍/버퍼 계산은 백엔드가 전담. 프론트는 그냥 쌓기만 한다.
//
// type === 'summary'
//   → setCompletedSegments(prev => [...prev, { summary, fullText: full_text, segmentIndex: segment_index }])
//   → setCurrentTranscripts([])   // 현재 구간 버퍼 초기화
//   → setInterimText('')
//   // 백엔드가 summary를 보냈다는 것은 해당 구간이 완전히 처리됐다는 신호.
//   // 프론트는 currentTranscripts를 비우고 새 구간 시작을 표시하면 된다.
```

---

### STEP 6 — UI 렌더링 업데이트

**파일:** `src/screens/UploadScreen.tsx`

```
// 렌더링 목록 구조 (위 → 아래 순서)
//
// ① completedSegments 순서대로 — 백엔드가 summary를 보낸 완료 구간
//   → 요약 카드
//       상단: "구간 N" 레이블 (segmentIndex + 1)
//       본문: summary 텍스트
//       우측: "전체 보기" 버튼
//              → 누르면 fullText 인라인 확장 또는 모달
//              → 같은 버튼을 다시 누르면 접힘 (토글)
//   구간 사이: 구분선으로 문단 경계 시각화
//
// ② currentTranscripts.join(' ') — 현재 구간의 확정된 텍스트
//   → 일반 텍스트 (아직 summary 안 온 상태)
//
// ③ interimText — is_final=false 실시간 미리보기
//   → 연한 색으로 구분 (확정 전임을 명시)

// "전체 보기" 토글 상태:
// expandedSet: Set<number> — segmentIndex 기준으로 toggle
// hook 외부 스크린 로컬 상태로 관리 (UI 상태는 오디오 처리와 분리)
const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
const toggleExpand = (idx: number) =>
  setExpandedSet(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });
```

---

## 검증 방법

1. `npx expo start --clear` 실행
2. 녹음 시작 → **0.5초 이내** interim 텍스트 화면 표시 확인
3. 발화 멈춤 → final 세그먼트 확정 후 interimText 사라짐 확인
4. 25초 이상 녹음 → 이전 transcript 세그먼트가 summary 카드로 교체됨 확인
5. "전체 보기" 버튼 → fullText 펼침/접힘 동작 확인
6. 구간 시간 레이블(예: "구간 1 (0:00 ~ 0:25)") 표시 확인
7. 백엔드 로그에서 binary 수신 → Deepgram forwarding → summary 이벤트 전송 순서 확인
8. `npx tsc --noEmit` 타입 에러 없음 확인

---

## 참고 파일 경로

| 역할 | 경로 |
|------|------|
| 프론트 핵심 hook | `src/hooks/useRealtimeTranscription.ts` |
| 설정 상수 | `src/constants/config.ts` |
| 녹음 화면 | `src/screens/UploadScreen.tsx` |
| 백엔드 WS 핸들러 | `Recordoc_BE/server/routes/realtime.py` |
| Deepgram 프로바이더 | `Recordoc_BE/server/services/realtime/deepgram_provider.py` |
| 백엔드 스키마 | `Recordoc_BE/server/schemas/realtime.py` (`RealtimeSummaryEvent`) |
