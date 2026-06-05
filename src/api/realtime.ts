import { API_BASE_URL } from '@/constants/config';
import { authFetch } from './auth';

// 백엔드 RealtimeSaveRequest의 domain_type 허용값과 동일하게 유지
export type RealtimeDomainType = 'general' | 'legal' | 'medical' | 'science' | 'it' | 'religion';

interface RealtimeSegmentPayload {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

// 백엔드 유효 도메인 타입 — 실시간 저장 경로는 _resolve_domain_type 정규화를 거치지 않으므로
// 반드시 이 6종 중 하나를 보내야 한다. (Wavb_BE schemas/rag.py: DomainType)
export type DomainType =
  | 'general'
  | 'legal'
  | 'medical'
  | 'science'
  | 'it'
  | 'religion';

interface SaveRealtimePayload {
  domain_type: DomainType;
  title: string; // 백엔드 RealtimeSaveRequest.title 필수 — 누락 시 422
  duration_seconds: number;
  segments: RealtimeSegmentPayload[];
}

export async function saveRealtimeTranscript(payload: SaveRealtimePayload): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/audio/transcripts/realtime`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? '저장에 실패했습니다.');
  }
}
