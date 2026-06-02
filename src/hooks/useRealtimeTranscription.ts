import { useCallback, useRef, useState } from 'react';
import { getToken } from '@/api/auth';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { WS_BASE_URL, CHUNK_INTERVAL_MS, DEEPGRAM_RECORDING_OPTIONS } from '@/constants/config';

export interface CompletedSegment {
  segmentIndex: number;
  summary: string;
  fullText: string;
}

export interface UseRealtimeTranscriptionReturn {
  isConnected: boolean;
  isPaused: boolean;
  completedSegments: CompletedSegment[];
  currentTranscripts: string[];
  interimText: string;
  elapsedSeconds: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
}

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

async function startNewRecording(): Promise<Audio.Recording> {
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(DEEPGRAM_RECORDING_OPTIONS);
  await recording.startAsync();
  return recording;
}

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSegments, setCompletedSegments] = useState<CompletedSegment[]>([]);
  const [currentTranscripts, setCurrentTranscripts] = useState<string[]>([]);
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const currentRecordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isSendingRef = useRef(false);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendCurrentChunk = useCallback(async () => {
    if (!isRecordingRef.current || isPausedRef.current || isSendingRef.current) return;
    isSendingRef.current = true;

    const recording = currentRecordingRef.current;
    currentRecordingRef.current = null;

    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64' as const,
            });
            const raw = extractPcmFromWav(base64ToArrayBuffer(base64));
            wsRef.current.send(raw);
          }
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }
    } catch (e) {
      console.warn('[Realtime] 청크 전송 오류:', e);
    } finally {
      isSendingRef.current = false;
    }

    if (isRecordingRef.current && !isPausedRef.current) {
      try {
        currentRecordingRef.current = await startNewRecording();
      } catch (e) {
        console.warn('[Realtime] 새 녹음 시작 오류:', e);
      }
    }
  }, []);

  const start = useCallback(async () => {
    const token = await getToken('at');
    if (!token) throw new Error('로그인이 필요합니다.');

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('마이크 권한이 필요합니다.');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE_URL}/audio/realtime/connect?token=${token}`);
      wsRef.current = ws;

      ws.onerror = () => reject(new Error('WebSocket 연결 실패'));
      ws.onclose = (e) => {
        setIsConnected(false);
        if (e.code === 4001) reject(new Error('인증 실패: 다시 로그인해주세요.'));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            text?: string;
            is_final?: boolean;
            summary?: string;
            full_text?: string;
            segment_index?: number;
            message?: string;
          };

          if (msg.type === 'ready') {
            setIsConnected(true);
            resolve();
          } else if (msg.type === 'transcript') {
            if (!msg.text) return;
            if (msg.is_final) {
              // 확정된 텍스트 → 현재 구간 버퍼에 누적
              setCurrentTranscripts((prev) => [...prev, msg.text!]);
              setInterimText('');
            } else {
              // 중간 결과 → 같은 자리에서 덮어쓰기 (누적 아님)
              setInterimText(msg.text);
            }
          } else if (msg.type === 'summary') {
            // 백엔드가 25초 구간 완료를 알림 → 현재 구간을 summary 카드로 교체
            setCompletedSegments((prev) => [
              ...prev,
              {
                segmentIndex: msg.segment_index ?? 0,
                summary: msg.summary ?? '',
                fullText: msg.full_text ?? '',
              },
            ]);
            setCurrentTranscripts([]);
            setInterimText('');
          } else if (msg.type === 'error') {
            console.warn('[Realtime] 전사 오류:', msg.message);
          }
        } catch {}
      };
    });

    isRecordingRef.current = true;
    currentRecordingRef.current = await startNewRecording();

    chunkIntervalRef.current = setInterval(() => {
      sendCurrentChunk();
    }, CHUNK_INTERVAL_MS);

    timerIntervalRef.current = setInterval(() => {
      if (!isPausedRef.current) setElapsedSeconds((s) => s + 1);
    }, 1000);
  }, [sendCurrentChunk]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    currentRecordingRef.current?.pauseAsync().catch(() => {});
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    currentRecordingRef.current?.startAsync().catch(() => {});
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const recording = currentRecordingRef.current;
    currentRecordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64' as const,
            });
            const raw = extractPcmFromWav(base64ToArrayBuffer(base64));
            wsRef.current.send(raw);
          }
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (e) {
        console.warn('[Realtime] 마지막 청크 전송 오류:', e);
      }
    }

    // JSON stop 메시지 없이 직접 close — 백엔드는 WebSocketDisconnect로 정상 종료 처리
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    isPaused,
    completedSegments,
    currentTranscripts,
    interimText,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
  };
}
