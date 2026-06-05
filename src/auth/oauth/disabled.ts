import { OAuthProviderError, type OAuthProvider, type OAuthProviderId } from './types';

export function createDisabledOAuthProvider(
  id: OAuthProviderId,
  label: string,
  shortLabel: string,
): OAuthProvider {
  return {
    id,
    label,
    shortLabel,
    buttonText: `${label}로 시작하기`,
    isConfigured: () => true,
    signIn: async () => {
      throw new OAuthProviderError('unavailable', `${label} 로그인은 아직 준비 중입니다.`);
    },
  };
}
