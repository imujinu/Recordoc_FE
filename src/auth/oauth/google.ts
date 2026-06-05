import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { loginWithGoogleIdToken } from '@/api/auth';
import { GOOGLE_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@/constants/config';
import { OAuthProviderError, type OAuthProvider } from './types';

function optionalEnv(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getGoogleWebClientId(): string | undefined {
  return optionalEnv(GOOGLE_WEB_CLIENT_ID) ?? optionalEnv(GOOGLE_CLIENT_ID);
}

function configureGoogleSignIn() {
  const webClientId = getGoogleWebClientId();
  if (!webClientId) return;

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
}

function getErrorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

export const googleOAuthProvider: OAuthProvider = {
  id: 'google',
  label: 'Google',
  shortLabel: 'G',
  buttonText: 'Google로 시작하기',
  isConfigured: () => Boolean(getGoogleWebClientId()),
  configure: configureGoogleSignIn,
  signIn: async () => {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
      throw new OAuthProviderError(
        'not_configured',
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 값을 설정한 뒤 다시 시도해주세요.',
      );
    }

    configureGoogleSignIn();

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') {
        return { type: 'cancelled' };
      }

      const idToken = result.data.idToken;
      if (!idToken) {
        throw new OAuthProviderError(
          'unknown',
          'Google 로그인 응답에 idToken이 없습니다. Web client id 설정을 확인해주세요.',
        );
      }

      await loginWithGoogleIdToken(idToken);
      return { type: 'success' };
    } catch (error) {
      const code = getErrorCode(error);
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) {
        return { type: 'cancelled' };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new OAuthProviderError(
          'play_services_unavailable',
          'Google Play 서비스를 업데이트한 뒤 다시 시도해주세요.',
        );
      }
      throw error;
    }
  },
};
