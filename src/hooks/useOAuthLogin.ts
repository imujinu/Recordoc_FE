import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getOAuthProvider, oauthProviders, OAuthProviderError, type OAuthProviderId } from '@/auth/oauth';

type OAuthLoadingState = Partial<Record<OAuthProviderId, boolean>>;

function getFallbackErrorMessage(providerLabel: string, error: unknown): string {
  if (error instanceof Error) return error.message;
  return `${providerLabel} 로그인에 실패했습니다.`;
}

function showOAuthError(providerLabel: string, error: unknown) {
  if (error instanceof OAuthProviderError) {
    if (error.code === 'not_configured') {
      Alert.alert(`${providerLabel} 설정 필요`, error.message);
      return;
    }
    if (error.code === 'play_services_unavailable') {
      Alert.alert('Google Play 서비스 필요', error.message);
      return;
    }
    Alert.alert(`${providerLabel} 로그인`, error.message);
    return;
  }

  Alert.alert(`${providerLabel} 로그인 실패`, getFallbackErrorMessage(providerLabel, error));
}

export function useOAuthLogin() {
  const [loadingByProvider, setLoadingByProvider] = useState<OAuthLoadingState>({});

  useEffect(() => {
    oauthProviders.forEach((provider) => provider.configure?.());
  }, []);

  const loginWithProvider = useCallback(async (providerId: OAuthProviderId) => {
    const provider = getOAuthProvider(providerId);
    if (!provider) return;

    if (!provider.isConfigured()) {
      showOAuthError(
        provider.label,
        new OAuthProviderError('not_configured', `${provider.label} 로그인 설정을 확인해주세요.`),
      );
      return;
    }

    setLoadingByProvider((prev) => ({ ...prev, [providerId]: true }));
    try {
      const result = await provider.signIn();
      if (result.type === 'success') {
        router.replace('/');
      }
    } catch (error) {
      showOAuthError(provider.label, error);
    } finally {
      setLoadingByProvider((prev) => ({ ...prev, [providerId]: false }));
    }
  }, []);

  return {
    loadingByProvider,
    loginWithProvider,
  };
}
