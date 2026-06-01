import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? '로그인에 실패했습니다.');
  }
  const data = await res.json() as { access_token: string; refresh_token: string };
  await SecureStore.setItemAsync('at', data.access_token);
  await SecureStore.setItemAsync('rt', data.refresh_token);
}
