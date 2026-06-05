import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/constants/config';

type AuthStatus = 'auth' | 'unauth';
type AuthChangeListener = (status: AuthStatus) => void;
type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  detail?: string;
};

const authChangeListeners = new Set<AuthChangeListener>();
let refreshPromise: Promise<string> | null = null;

export function subscribeAuthChange(listener: AuthChangeListener): () => void {
  authChangeListeners.add(listener);
  return () => authChangeListeners.delete(listener);
}

function notifyAuthChange(status: AuthStatus) {
  authChangeListeners.forEach((listener) => listener(status));
}

function isAuthFailure(status: number) {
  return status === 401 || status === 403;
}

function mergeHeaders(headers: HeadersInit | undefined, token: string): HeadersInit {
  const merged: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      merged[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      merged[key] = value;
    });
  } else if (headers) {
    Object.assign(merged, headers);
  }

  merged.Authorization = `Bearer ${token}`;
  return merged;
}

async function clearAuthTokens() {
  await SecureStore.deleteItemAsync('at');
  await SecureStore.deleteItemAsync('rt');
  notifyAuthChange('unauth');
}

export async function logout(): Promise<void> {
  await clearAuthTokens();
}

async function refreshAccessToken(): Promise<string> {
  const rt = await SecureStore.getItemAsync('rt');
  if (!rt) {
    await clearAuthTokens();
    throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    await clearAuthTokens();
    throw new Error(data.detail ?? '로그인이 만료되었습니다. 다시 로그인해주세요.');
  }

  await SecureStore.setItemAsync('at', data.access_token);
  if (data.refresh_token) {
    await SecureStore.setItemAsync('rt', data.refresh_token);
  }
  notifyAuthChange('auth');
  return data.access_token;
}

async function getRefreshedAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function getAccessToken(): Promise<string> {
  const token = await SecureStore.getItemAsync('at');
  if (!token) {
    throw new Error('로그인이 필요합니다.');
  }
  return token;
}

export async function refreshStoredAccessToken(): Promise<string> {
  return getRefreshedAccessToken();
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();

  const firstResponse = await fetch(input, {
    ...init,
    headers: mergeHeaders(init.headers, token),
  });

  if (!isAuthFailure(firstResponse.status)) {
    return firstResponse;
  }

  const nextToken = await getRefreshedAccessToken();
  return fetch(input, {
    ...init,
    headers: mergeHeaders(init.headers, nextToken),
  });
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
  await SecureStore.setItemAsync('at', data.access_token);
  await SecureStore.setItemAsync('rt', data.refresh_token);
  notifyAuthChange('auth');
}
