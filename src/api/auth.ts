import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/constants/config';

async function setToken(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

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
  await setToken('at', data.access_token);
  await setToken('rt', data.refresh_token);
}

// refresh_token으로 새 토큰 쌍을 발급받아 저장하고 새 access_token을 반환한다.
// 실패 시(rt 만료 등) null 반환 — 호출부에서 로그아웃 처리.
export async function refreshAccessToken(): Promise<string | null> {
  const rt = await getToken('rt');
  if (!rt) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; refresh_token: string };
  await setToken('at', data.access_token);
  await setToken('rt', data.refresh_token);
  return data.access_token;
}

export async function logout(): Promise<void> {
  await setToken('at', '');
  await setToken('rt', '');
}
