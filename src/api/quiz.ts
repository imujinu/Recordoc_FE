import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';

export type QuizStatus = 'correct' | 'wrong' | 'untested' | 'skipped';

export type QuizNodeStatusUpdate = {
  node_id: string;
  quiz_status: QuizStatus;
};

export async function updateQuizNodeStatuses(updates: QuizNodeStatusUpdate[]): Promise<void> {
  const token = await SecureStore.getItemAsync('at');
  const res = await fetch(`${API_BASE_URL}/graph/quiz-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ updates }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? '퀴즈 결과 반영에 실패했습니다.');
  }
}
