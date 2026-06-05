import { useCallback, useRef, useState } from 'react';
import {
  AudioStudioModule,
  useAudioRecorder,
  type AudioDataEvent,
  type RecordingConfig,
} from '@siteed/audio-studio';
import { WS_BASE_URL } from '@/constants/config';
import { getAccessToken, refreshStoredAccessToken } from '@/api/auth';

export interface RealtimeTranscriptSegment {
  finalIndex: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface RealtimeSummaryChunk {
  segmentIndex: number;
  summary: string;
  fullText: string;
  keywords: string[];
  startFinalIndex: number;
  endFinalIndex: number;
  timeRange: string;
}

export interface UseRealtimeTranscriptionReturn {
  isConnected: boolean;
  isPaused: boolean;
  segments: RealtimeTranscriptSegment[];
  summaries: RealtimeSummaryChunk[];
  interimText: string;
  elapsedSeconds: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
}

type PermissionResponse = {
  granted?: boolean;
  status?: string;
};

type RealtimeServerMessage =
  | { type: 'ready' }
  | {
      type: 'transcript';
      text?: string;
      is_final?: boolean;
      final_index?: number;
      chunk_index?: number;
    }
  | {
      type: 'summary';
      summary?: string;
      full_text?: string;
      segment_index?: number;
      start_final_index?: number;
      end_final_index?: number;
      keywords?: unknown;
    }
  | { type: 'error'; message?: string };

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// WAV 파일에서 raw PCM bytes만 추출.
// 매 청크가 완전한 WAV 파일이므로 헤더를 제거하지 않으면 Deepgram이 헤더를 PCM으로 오해한다.
// 'data' 서브청크 마커(0x64617461)를 직접 탐색해 비표준 WAV 헤더 변형에도 대응.
function extractPcmFromWav(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  for (let i = 12; i < Math.min(buffer.byteLength - 8, 200); i++) {
    if (view.getUint32(i, false) === 0x64617461) { // 'data' ASCII
      return buffer.slice(i + 8); // data 마커(4) + 크기 필드(4) = 8바이트 스킵
    }
  }
  return buffer.slice(44); // fallback: 표준 44바이트 헤더
}

function float32ToPCM16Buffer(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    const value = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(index * 2, value, true);
  });

  return buffer;
}

function int16ToPCM16Buffer(samples: Int16Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  samples.forEach((sample, index) => {
    view.setInt16(index * 2, sample, true);
  });

  return buffer;
}

function audioDataToPCM16Buffer(event: AudioDataEvent): ArrayBuffer {
  const { data } = event;

  if (typeof data === 'string') {
    return base64ToArrayBuffer(data);
  }

  if (data instanceof Int16Array) {
    return int16ToPCM16Buffer(data);
  }

  if (data instanceof Float32Array) {
    return float32ToPCM16Buffer(data);
  }

  throw new Error('지원하지 않는 오디오 스트림 데이터 형식입니다.');
}

function formatTime(totalSeconds: number): string {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(normalized / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((normalized % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function isOpen(ws: WebSocket | null): ws is WebSocket {
  return ws?.readyState === WebSocket.OPEN;
}

async function requestRecordingPermission(): Promise<void> {
  const requestPermissionsAsync = AudioStudioModule?.requestPermissionsAsync as
    | (() => Promise<PermissionResponse>)
    | undefined;

  if (!requestPermissionsAsync) return;

  const result = await requestPermissionsAsync();
  if (!result.granted && result.status !== 'granted') {
    throw new Error('마이크 권한이 필요합니다.');
  }
}

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useAudioRecorder();

  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segments, setSegments] = useState<RealtimeTranscriptSegment[]>([]);
  const [summaries, setSummaries] = useState<RealtimeSummaryChunk[]>([]);
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const audioStreamEnabledRef = useRef(false);
  const firstAudioChunkLoggedRef = useRef(false);
  const segmentsRef = useRef<RealtimeTranscriptSegment[]>([]);
  const allSegmentsRef = useRef<RealtimeTranscriptSegment[]>([]);
  const summariesRef = useRef<RealtimeSummaryChunk[]>([]);
  const interimRef = useRef('');
  const elapsedRef = useRef(0);
  const lastEndRef = useRef(0);
  const nextLocalFinalIndexRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    setIsConnected(false);
    setIsPaused(false);
    setSegments([]);
    setSummaries([]);
    setInterimText('');
    setElapsedSeconds(0);

    isPausedRef.current = false;
    isRunningRef.current = false;
    audioStreamEnabledRef.current = false;
    firstAudioChunkLoggedRef.current = false;
    segmentsRef.current = [];
    allSegmentsRef.current = [];
    summariesRef.current = [];
    interimRef.current = '';
    elapsedRef.current = 0;
    lastEndRef.current = 0;
    nextLocalFinalIndexRef.current = 0;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const appendFinalSegment = useCallback((text: string, finalIndex: number) => {
    const startSeconds = lastEndRef.current;
    const endSeconds = Math.max(elapsedRef.current, startSeconds);
    const segment: RealtimeTranscriptSegment = {
      finalIndex,
      text,
      startSeconds,
      endSeconds,
    };

    lastEndRef.current = endSeconds;
    nextLocalFinalIndexRef.current = Math.max(nextLocalFinalIndexRef.current, finalIndex + 1);

    allSegmentsRef.current = [...allSegmentsRef.current, segment];
    segmentsRef.current = [...segmentsRef.current, segment];
    setSegments([...segmentsRef.current]);
  }, []);

  const commitInterimText = useCallback(() => {
    const text = interimRef.current.trim();
    if (!text) return;

    appendFinalSegment(text, nextLocalFinalIndexRef.current);
    interimRef.current = '';
    setInterimText('');
  }, [appendFinalSegment]);

  const handleTranscript = useCallback(
    (message: Extract<RealtimeServerMessage, { type: 'transcript' }>) => {
      const text = message.text?.trim();
      if (!text) return;

      if (message.is_final) {
        const finalIndex =
          typeof message.final_index === 'number'
            ? message.final_index
            : nextLocalFinalIndexRef.current;

        appendFinalSegment(text, finalIndex);
        interimRef.current = '';
        setInterimText('');
        return;
      }

      interimRef.current = text;
      setInterimText(text);
    },
    [appendFinalSegment]
  );

  const handleSummary = useCallback(
    (message: Extract<RealtimeServerMessage, { type: 'summary' }>) => {
      const segmentIndex =
        typeof message.segment_index === 'number'
          ? message.segment_index
          : summariesRef.current.length;
      const startFinalIndex =
        typeof message.start_final_index === 'number' ? message.start_final_index : -1;
      const endFinalIndex =
        typeof message.end_final_index === 'number' ? message.end_final_index : -1;
      const hasValidRange = startFinalIndex >= 0 && endFinalIndex >= startFinalIndex;
      const inRange = (segment: RealtimeTranscriptSegment) =>
        hasValidRange &&
        segment.finalIndex >= startFinalIndex &&
        segment.finalIndex <= endFinalIndex;
      const displayCovered = segmentsRef.current.filter(inRange);
      const allCovered = allSegmentsRef.current.filter(inRange);
      const timeSource = displayCovered.length > 0 ? displayCovered : allCovered;
      const first = timeSource[0];
      const last = timeSource[timeSource.length - 1];
      const timeRange =
        first && last
          ? `${formatTime(first.startSeconds)} — ${formatTime(last.endSeconds)}`
          : `${formatTime(0)} — ${formatTime(elapsedRef.current)}`;

      const chunk: RealtimeSummaryChunk = {
        segmentIndex,
        summary: message.summary?.trim() ?? '',
        fullText: message.full_text?.trim() ?? '',
        keywords: normalizeKeywords(message.keywords),
        startFinalIndex,
        endFinalIndex,
        timeRange,
      };

      summariesRef.current = [...summariesRef.current, chunk];
      setSummaries([...summariesRef.current]);

      if (displayCovered.length > 0) {
        segmentsRef.current = segmentsRef.current.filter((segment) => !inRange(segment));
        setSegments([...segmentsRef.current]);
      }
    },
    []
  );

  const handleServerMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message = JSON.parse(String(event.data)) as RealtimeServerMessage;

        if (message.type === 'transcript') {
          handleTranscript(message);
          return;
        }

        if (message.type === 'summary') {
          handleSummary(message);
          return;
        }

        if (message.type === 'error') {
          console.warn('[Realtime] 전사 오류:', message.message);
        }
      } catch (error) {
        console.warn('[Realtime] 메시지 파싱 오류:', error);
      }
    },
    [handleSummary, handleTranscript]
  );

  const sendAudioStream = useCallback(async (event: AudioDataEvent) => {
    if (!audioStreamEnabledRef.current || isPausedRef.current || !isOpen(wsRef.current)) {
      return;
    }

    try {
      const buffer = audioDataToPCM16Buffer(event);

      if (!firstAudioChunkLoggedRef.current) {
        const head = Array.from(new Uint8Array(buffer.slice(0, 4)))
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join(' ');
        console.log(
          `[Realtime] PCM stream started: ${buffer.byteLength}B/chunk, sampleRate=16000, channels=1, head=${head}`
        );
        firstAudioChunkLoggedRef.current = true;
      }

      wsRef.current.send(buffer);
    } catch (error) {
      console.warn('[Realtime] PCM 스트림 전송 오류:', error);
    }
  }, []);

  const connectWebSocket = useCallback(
    (token: string) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const ws = new WebSocket(`${WS_BASE_URL}/audio/realtime/connect?token=${token}`);
        wsRef.current = ws;

        ws.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error('WebSocket 연결 실패'));
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          if (!settled) {
            settled = true;
            reject(
              event.code === 4001
                ? new Error('인증 실패: 다시 로그인해주세요.')
                : new Error('WebSocket 연결이 종료되었습니다.')
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(String(event.data)) as RealtimeServerMessage;
            if (message.type === 'ready') {
              setIsConnected(true);
              if (!settled) {
                settled = true;
                resolve();
              }
              return;
            }
          } catch {
            // Non-ready messages are parsed by the shared handler below.
          }

          handleServerMessage(event);
        };
      }),
    [handleServerMessage]
  );

  const startTimer = useCallback(() => {
    timerIntervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);
  }, []);

  const start = useCallback(async () => {
    const token = await getAccessToken();

    resetState();
    await requestRecordingPermission();
    try {
      await connectWebSocket(token);
    } catch (error) {
      console.warn('[Realtime] WebSocket first connect failed, retrying with refreshed token:', error);
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);

      const refreshedToken = await refreshStoredAccessToken();
      await connectWebSocket(refreshedToken);
    }

    const config: RecordingConfig = {
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_16bit',
      interval: 250,
      keepAwake: true,
      output: {
        primary: { enabled: true, format: 'wav' },
      },
      onAudioStream: sendAudioStream,
    };

    isRunningRef.current = true;
    audioStreamEnabledRef.current = true;
    try {
      await startRecording(config);
      startTimer();
    } catch (error) {
      isRunningRef.current = false;
      audioStreamEnabledRef.current = false;
      if (isOpen(wsRef.current)) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);
      throw error;
    }
  }, [connectWebSocket, resetState, sendAudioStream, startRecording, startTimer]);

  const pause = useCallback(() => {
    if (!isRunningRef.current || isPausedRef.current) return;

    isPausedRef.current = true;
    setIsPaused(true);
    pauseRecording().catch((error) => {
      console.warn('[Realtime] 일시정지 오류:', error);
    });
  }, [pauseRecording]);

  const resume = useCallback(() => {
    if (!isRunningRef.current || !isPausedRef.current) return;

    isPausedRef.current = false;
    setIsPaused(false);
    resumeRecording().catch((error) => {
      console.warn('[Realtime] 재개 오류:', error);
    });
  }, [resumeRecording]);

  const stop = useCallback(async (): Promise<RealtimeTranscriptSegment[]> => {
    if (!isRunningRef.current) return allSegmentsRef.current;

    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      await stopRecording();
    } catch (error) {
      console.warn('[Realtime] 녹음 종료 오류:', error);
    } finally {
      audioStreamEnabledRef.current = false;
    }

    commitInterimText();

    if (isOpen(wsRef.current)) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setIsConnected(false);

    return allSegmentsRef.current;
  }, [commitInterimText, stopRecording]);

  return {
    isConnected,
    isPaused,
    segments,
    summaries,
    interimText,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
  };
}
