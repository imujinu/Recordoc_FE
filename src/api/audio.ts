import { getToken, refreshAccessToken } from '@/api/auth';
import { API_BASE_URL } from '@/constants/config';

export type TranscriptLanguage = 'ko' | 'en';
export type DomainType = 'general' | 'legal' | 'medical' | 'science' | 'it' | 'religion';

export interface UploadTranscriptParams {
  fileUri: string;
  fileName: string;
  mimeType: string;
  languages: TranscriptLanguage[];
  domainType: DomainType;
}

export interface TranscriptResponse {
  transcript_id: string;
  transcript: string;
  duration_seconds: number | null;
  stt_model: string;
  segment_count: number;
  status: string;
}

async function buildUploadForm(params: UploadTranscriptParams): Promise<FormData> {
  // fetch(uri)로 로컬 파일을 읽어 실제 Blob으로 변환 — { uri, name, type } 객체는
  // 일부 환경에서 문자열로 직렬화되므로 Blob을 직접 생성해야 한다.
  const fileBlob = await fetch(params.fileUri).then((r) => r.blob());

  const form = new FormData();
  form.append('file', fileBlob, params.fileName);
  form.append('file_uri', params.fileUri);
  form.append('file_name', params.fileName);
  form.append('domain_type', params.domainType);
  params.languages.forEach((l) => form.append('languages', l));
  return form;
}

export async function uploadTranscript(params: UploadTranscriptParams): Promise<TranscriptResponse> {
  let token = await getToken('at');

  let res = await fetch(`${API_BASE_URL}/audio/transcripts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: await buildUploadForm(params),
  });

  // access_token 만료 시 refresh 후 1회 재시도
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) throw new Error('로그인이 필요합니다.');
    res = await fetch(`${API_BASE_URL}/audio/transcripts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: await buildUploadForm(params),
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[uploadTranscript] 오류 응답:', res.status, JSON.stringify(err));
    throw new Error((err as { detail?: string }).detail ?? '변환 요청에 실패했습니다.');
  }

  return res.json() as Promise<TranscriptResponse>;
}
