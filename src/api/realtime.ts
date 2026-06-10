import { API_BASE_URL } from '@/constants/config';
import { authFetch } from './auth';

export interface RealtimeSegmentPayload {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface RealtimeRecordingPayload {
  fileUri: string;
  filename: string;
  mimeType: string;
  durationMs: number;
}

export interface SaveRealtimePayload {
  transcriptId: string;
  title: string;
  durationSeconds: number;
  segments: RealtimeSegmentPayload[];
  recording: RealtimeRecordingPayload;
}

type ReactNativeFilePart = {
  uri: string;
  name: string;
  type: string;
};

function fallbackRecordingName(title: string): string {
  const trimmed = title.trim();
  return `${trimmed || 'recording'}.wav`;
}

export function buildRealtimeTranscriptFormData(payload: SaveRealtimePayload): FormData {
  const form = new FormData();
  const filePart: ReactNativeFilePart = {
    uri: payload.recording.fileUri,
    name: payload.recording.filename || fallbackRecordingName(payload.title),
    type: payload.recording.mimeType || 'audio/wav',
  };

  form.append('transcript_id', payload.transcriptId);
  form.append('file', filePart as unknown as Blob);
  form.append('title', payload.title);
  form.append('duration_seconds', String(payload.durationSeconds));
  form.append('segments', JSON.stringify(payload.segments));

  return form;
}

export async function saveRealtimeTranscript(payload: SaveRealtimePayload): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/audio/transcripts/realtime`, {
    method: 'POST',
    body: buildRealtimeTranscriptFormData(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to save realtime transcript.');
  }
}
