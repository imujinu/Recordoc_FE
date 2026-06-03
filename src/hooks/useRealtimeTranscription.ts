import { useCallback, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { Audio } from 'expo-av';
import { WS_BASE_URL } from '@/constants/config';

export interface RealtimeTranscriptSegment {
  chunkIndex: number;
  text: string;
}

export interface UseRealtimeTranscriptionReturn {
  isConnected: boolean;
  isPaused: boolean;
  segments: RealtimeTranscriptSegment[];
  elapsedSeconds: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RealtimeTranscriptSegment[]>;
}

const CHUNK_INTERVAL_MS = 5000;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function startNewRecording(): Promise<Audio.Recording> {
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return recording;
}

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segments, setSegments] = useState<RealtimeTranscriptSegment[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // setInterval 클로저의 stale closure 방지용 refs
  const wsRef = useRef<WebSocket | null>(null);
  const currentRecordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isSendingRef = useRef(false);
  const segmentsRef = useRef<RealtimeTranscriptSegment[]>([]);
  const chunkIndexRef = useRef(0);
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
          const file = new File(uri);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = await file.base64();
            const buffer = base64ToArrayBuffer(base64);
            console.log(
              `[Realtime] 청크 #${chunkIndexRef.current} 전송 → 파일 ${file.size}B, base64 ${base64.length}자, 버퍼 ${buffer.byteLength}B`
            );
            wsRef.current.send(buffer);
          } else {
            console.warn('[Realtime] WebSocket이 OPEN 상태가 아니라 청크 전송 건너뜀');
          }
          file.delete();
        }
      }
    } catch (e) {
      console.warn('[Realtime] 청크 전송 오류:', e);
    } finally {
      isSendingRef.current = false;
    }

    // 다음 청크 녹음 즉시 시작
    if (isRecordingRef.current && !isPausedRef.current) {
      try {
        currentRecordingRef.current = await startNewRecording();
      } catch (e) {
        console.warn('[Realtime] 새 녹음 시작 오류:', e);
      }
    }
  }, []);

  const start = useCallback(async () => {
    const token = await SecureStore.getItemAsync('at');
    if (!token) throw new Error('로그인이 필요합니다.');

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('마이크 권한이 필요합니다.');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // WebSocket 연결 및 "ready" 이벤트 수신 대기
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
            chunk_index?: number;
            text?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            setIsConnected(true);
            resolve();
          } else if (msg.type === 'transcript' && msg.text) {
            console.log(
              `[Realtime] 전사 수신 #${msg.chunk_index ?? '?'}: "${msg.text}"`
            );
            const seg: RealtimeTranscriptSegment = {
              chunkIndex: msg.chunk_index ?? chunkIndexRef.current,
              text: msg.text,
            };
            segmentsRef.current = [...segmentsRef.current, seg];
            setSegments([...segmentsRef.current]);
          } else if (msg.type === 'error') {
            console.warn('[Realtime] 전사 오류:', msg.message);
          }
        } catch {}
      };
    });

    // 첫 번째 청크 녹음 시작
    isRecordingRef.current = true;
    currentRecordingRef.current = await startNewRecording();

    // 5초마다 청크 전송
    chunkIntervalRef.current = setInterval(() => {
      chunkIndexRef.current += 1;
      sendCurrentChunk();
    }, CHUNK_INTERVAL_MS);

    // 1초마다 경과 시간 증가
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

  const stop = useCallback(async (): Promise<RealtimeTranscriptSegment[]> => {
    if (!isRecordingRef.current) return segmentsRef.current;
    isRecordingRef.current = false;

    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    // 마지막 청크 전송
    const recording = currentRecordingRef.current;
    currentRecordingRef.current = null;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          const file = new File(uri);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const base64 = await file.base64();
            const buffer = base64ToArrayBuffer(base64);
            console.log(
              `[Realtime] 마지막 청크 전송 → 파일 ${file.size}B, base64 ${base64.length}자, 버퍼 ${buffer.byteLength}B`
            );
            wsRef.current.send(buffer);
          }
          file.delete();
        }
      } catch (e) {
        console.warn('[Realtime] 마지막 청크 전송 오류:', e);
      }
    }

    // stop 신호 전송 후 연결 종료
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setIsConnected(false);

    return segmentsRef.current;
  }, []);

  return { isConnected, isPaused, segments, elapsedSeconds, start, pause, resume, stop };
}
