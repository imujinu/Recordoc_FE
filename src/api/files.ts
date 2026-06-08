import type { DocumentPickerAsset } from 'expo-document-picker';
import { authFetch } from '@/api/auth';
import { API_BASE_URL } from '@/constants/config';

export type UploadKind = 'audio' | 'document';
export type FileKind = 'audio' | 'pdf' | 'ppt' | 'document';

export type FileUploadResponse = {
  transcript_id: string;
  title?: string;
  file_uri: string;
  original_filename?: string;
  mime_type?: string;
  status: string;
  source_type?: 'audio' | 'document';
  transcript?: string;
  segment_count?: number;
  chunk_count?: number;
};

export type ProcessStatus = 'uploaded' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type FileProcessResponse = {
  transcript_id: string;
  status: string;
  content_status: string;
  index_status: string;
  segment_count: number;
  chunk_count: number;
};

export type ProcessFileResponse = FileProcessResponse;

export type TranscriptSummarySegment = {
  start_seconds?: number | string | null;
  end_seconds?: number | string | null;
  startSeconds?: number | string | null;
  endSeconds?: number | string | null;
  text?: string | null;
};

export type TranscriptSummaryChunk = {
  summary?: string | null;
  full_text?: string | null;
  fullText?: string | null;
  text?: string | null;
  keywords?: unknown[] | null;
  start_seconds?: number | string | null;
  end_seconds?: number | string | null;
};

export type TranscriptSummaryOverview = {
  title?: string | null;
  summary?: string | null;
  key_points?: unknown[] | null;
};

export type TranscriptSummaryContext = {
  index?: number | null;
  topic?: string | null;
  subtitle?: string | null;
  content?: string | null;
  keywords?: unknown[] | null;
  concepts?: unknown[] | null;
  learning_points?: unknown[] | null;
  start_seconds?: number | string | null;
  end_seconds?: number | string | null;
  segment_start_index?: number | null;
  segment_end_index?: number | null;
};

export type TranscriptSummaryResponse = {
  transcript_id?: string;
  summary_id?: string;
  persona_id?: string | null;
  overview?: TranscriptSummaryOverview | null;
  title?: string | null;
  status?: ProcessStatus | string | null;
  summary?: string | null;
  full_text?: string | null;
  fullText?: string | null;
  transcript?: string | null;
  text?: string | null;
  keywords?: unknown[] | null;
  segments?: TranscriptSummarySegment[] | null;
  chunks?: TranscriptSummaryChunk[] | null;
  summaries?: TranscriptSummaryChunk[] | null;
  contexts?: TranscriptSummaryContext[] | null;
};

export type FileTranscriptSegmentResponse = {
  segment_index?: number | null;
  start_seconds?: number | string | null;
  end_seconds?: number | string | null;
  speaker_label?: string | null;
  text?: string | null;
  confidence?: number | string | null;
  source_type?: string | null;
  source_page_start?: number | null;
  source_page_end?: number | null;
  source_slide_start?: number | null;
  source_slide_end?: number | null;
  source_start_seconds?: number | string | null;
  source_end_seconds?: number | string | null;
};

export type FileTranscriptResponse = {
  transcript_id: string;
  full_text?: string | null;
  segments?: FileTranscriptSegmentResponse[] | null;
};

export type FileListItem = {
  transcript_id: string;
  type?: 'file';
  title?: string | null;
  file_uri: string;
  original_filename?: string | null;
  mime_type?: string | null;
  status?: string | null;
  content_status?: string | null;
  index_status?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

export type FileDetailResponse = FileListItem & {
  source_type?: string | null;
  error_message?: string | null;
  duration_seconds?: number | null;
  segment_count?: number | null;
  chunk_count?: number | null;
  updated_at?: string | null;
  summary?: TranscriptSummaryResponse | null;
};

export type FolderWorkItem = {
  id: string;
  type: 'folder';
  name: string;
  sort_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  file_count?: number | null;
};

export type FileWorkItem = FileListItem & {
  type: 'file';
};

export type WorkItem = FolderWorkItem | FileWorkItem;

export const AUDIO_EXTENSIONS = ['m4a', 'mp3', 'wav', 'webm'] as const;
export const DOCUMENT_EXTENSIONS = ['pdf', 'ppt', 'pptx'] as const;

const AUDIO_MIME_TYPES = {
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  webm: 'audio/webm',
} as const;

const DOCUMENT_MIME_TYPES = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
};

export function getFileExtension(fileName: string): string {
  const withoutQuery = fileName.split(/[?#]/)[0];
  const parts = withoutQuery.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? '' : '';
}

export function isAllowedUploadFile(fileName: string, kind: UploadKind): boolean {
  const extension = getFileExtension(fileName);
  const allowed = kind === 'audio' ? AUDIO_EXTENSIONS : DOCUMENT_EXTENSIONS;
  return allowed.includes(extension as never);
}

export function inferMimeType(fileName: string, fallback?: string): string {
  const extension = getFileExtension(fileName);

  if (extension in AUDIO_MIME_TYPES) {
    return AUDIO_MIME_TYPES[extension as keyof typeof AUDIO_MIME_TYPES];
  }
  if (extension in DOCUMENT_MIME_TYPES) {
    return DOCUMENT_MIME_TYPES[extension as keyof typeof DOCUMENT_MIME_TYPES];
  }

  return fallback || 'application/octet-stream';
}

export function inferFileKind(file: Pick<FileListItem, 'original_filename' | 'file_uri' | 'mime_type'>): FileKind {
  const fileName = file.original_filename || file.file_uri;
  const extension = getFileExtension(fileName);
  const mimeType = file.mime_type?.toLowerCase() ?? '';

  if (mimeType.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension as never)) {
    return 'audio';
  }
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || extension === 'ppt' || extension === 'pptx') {
    return 'ppt';
  }

  return 'document';
}

export function getProcessStatus(file: Pick<FileListItem, 'status' | 'content_status' | 'index_status'>): ProcessStatus {
  const status = file.status?.trim().toLowerCase();
  const contentStatus = file.content_status?.trim().toLowerCase();
  const indexStatus = file.index_status?.trim().toLowerCase();
  const hasDetailedStatus = Boolean(contentStatus || indexStatus);

  if (contentStatus === 'failed' || indexStatus === 'failed') return 'failed';
  if (status === 'cancelled' || status === 'canceled' || indexStatus === 'cancelled' || indexStatus === 'canceled') {
    return 'cancelled';
  }
  if (contentStatus === 'processing' || indexStatus === 'processing') return 'processing';
  if (contentStatus === 'completed' && indexStatus === 'completed') return 'completed';
  if (!hasDetailedStatus && (status === 'completed' || status === 'done')) return 'completed';
  if (contentStatus === 'uploaded' || status === 'uploaded') return 'uploaded';
  return 'uploaded';
}

export function fileDetailToSummaryResponse(file: FileDetailResponse): TranscriptSummaryResponse {
  return {
    ...file.summary,
    transcript_id: file.summary?.transcript_id ?? file.transcript_id,
    summary_id: file.summary?.summary_id,
    persona_id: file.summary?.persona_id ?? null,
    overview: file.summary?.overview ?? null,
    title: file.summary?.title ?? file.title,
    status: getProcessStatus(file),
    summary: file.summary?.summary ?? null,
    full_text: file.summary?.full_text ?? null,
    fullText: file.summary?.fullText ?? null,
    transcript: file.summary?.transcript ?? null,
    text: file.summary?.text ?? null,
    keywords: file.summary?.keywords ?? [],
    segments: file.summary?.segments ?? null,
    chunks: file.summary?.chunks ?? file.summary?.summaries ?? null,
    summaries: file.summary?.summaries ?? file.summary?.chunks ?? null,
    contexts: file.summary?.contexts ?? [],
  };
}

function getErrorMessage(body: ApiErrorBody, fallback: string): string {
  if (typeof body.detail === 'string') return body.detail;
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.detail)) return body.detail.map(String).join('\n');
  return fallback;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  return new Error(getErrorMessage(body, fallback));
}

export async function uploadFile(asset: DocumentPickerAsset, folderId?: string): Promise<FileUploadResponse> {
  const fileName = asset.name;
  const formData = new FormData();

  if (asset.file) {
    formData.append('file', asset.file, fileName);
  } else {
    formData.append('file', {
      uri: asset.uri,
      name: fileName,
      type: inferMimeType(fileName, asset.mimeType),
    } as unknown as Blob);
  }
  formData.append('file_name', fileName);
  if (folderId) {
    formData.append('folder_id', folderId);
  }

  const response = await authFetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await readError(response, '파일 업로드에 실패했습니다.');
  }

  return response.json() as Promise<FileUploadResponse>;
}

export async function processFile(transcriptId: string, signal?: AbortSignal): Promise<ProcessFileResponse> {
  const response = await authFetch(`${API_BASE_URL}/files/${encodeURIComponent(transcriptId)}/process`, {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw await readError(response, '요약 및 스크립트 생성에 실패했습니다.');
  }

  return response.json() as Promise<ProcessFileResponse>;
}

export async function cancelFileProcess(transcriptId: string, signal?: AbortSignal): Promise<FileProcessResponse> {
  const response = await authFetch(`${API_BASE_URL}/files/${encodeURIComponent(transcriptId)}/cancel`, {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw await readError(response, '요약 및 스크립트 생성을 중지하지 못했습니다.');
  }

  return response.json() as Promise<FileProcessResponse>;
}

export async function getTranscriptSummary(
  transcriptId: string,
  signal?: AbortSignal,
): Promise<TranscriptSummaryResponse> {
  const response = await authFetch(`${API_BASE_URL}/audio/transcripts/${encodeURIComponent(transcriptId)}/summary`, {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw await readError(response, '요약과 스크립트를 불러오지 못했습니다.');
  }

  return response.json() as Promise<TranscriptSummaryResponse>;
}

export async function getFileDetail(transcriptId: string, signal?: AbortSignal): Promise<FileDetailResponse> {
  const response = await authFetch(`${API_BASE_URL}/files/${encodeURIComponent(transcriptId)}`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw await readError(response, '파일 상세 정보를 불러오지 못했습니다.');
  }

  return response.json() as Promise<FileDetailResponse>;
}

export async function getFileTranscript(transcriptId: string, signal?: AbortSignal): Promise<FileTranscriptResponse> {
  const response = await authFetch(`${API_BASE_URL}/files/${encodeURIComponent(transcriptId)}/transcript`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    throw await readError(response, '전체 원문을 불러오지 못했습니다.');
  }

  return response.json() as Promise<FileTranscriptResponse>;
}

export async function listFiles(): Promise<FileListItem[]> {
  const response = await authFetch(`${API_BASE_URL}/files`);

  if (!response.ok) {
    throw await readError(response, '저장된 파일 목록을 불러오지 못했습니다.');
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as FileListItem[]) : [];
}

export async function createFolder(name: string): Promise<FolderWorkItem> {
  const response = await authFetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw await readError(response, '폴더 생성에 실패했습니다.');
  }

  return response.json() as Promise<FolderWorkItem>;
}

export async function listWorkItems(): Promise<WorkItem[]> {
  const response = await authFetch(`${API_BASE_URL}/work-items`);

  if (!response.ok) {
    throw await readError(response, '내 작업 목록을 불러오지 못했습니다.');
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as WorkItem[]) : [];
}

export async function listFolderItems(folderId: string): Promise<FileWorkItem[]> {
  const response = await authFetch(`${API_BASE_URL}/folders/${encodeURIComponent(folderId)}/items`);

  if (!response.ok) {
    throw await readError(response, '폴더 파일 목록을 불러오지 못했습니다.');
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({ ...item, type: 'file' })) as FileWorkItem[];
}
