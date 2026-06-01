import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';

interface RealtimeSegmentPayload {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

interface SaveRealtimePayload {
  domain_type: 'meeting' | 'lecture';
  duration_seconds: number;
  segments: RealtimeSegmentPayload[];
}

export async function saveRealtimeTranscript(payload: SaveRealtimePayload): Promise<void> {
  const token = await SecureStore.getItemAsync('at');
  const res = await fetch(`${API_BASE_URL}/audio/transcripts/realtime`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? '저장에 실패했습니다.');
  }
}
