import { getToken } from '@/api/auth';
import { API_BASE_URL } from '@/constants/config';

// 백엔드 RealtimeSaveRequest의 domain_type 허용값과 동일하게 유지
export type RealtimeDomainType = 'general' | 'legal' | 'medical' | 'science' | 'it' | 'religion';

interface RealtimeSegmentPayload {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

interface SaveRealtimePayload {
  domain_type: RealtimeDomainType;
  title: string;
  duration_seconds: number;
  segments: RealtimeSegmentPayload[];
}

export async function saveRealtimeTranscript(payload: SaveRealtimePayload): Promise<void> {
  const token = await getToken('at');
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
