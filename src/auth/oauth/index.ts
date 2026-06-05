import { createDisabledOAuthProvider } from './disabled';
import { googleOAuthProvider } from './google';
import type { OAuthProvider, OAuthProviderId } from './types';

export type { OAuthProvider, OAuthProviderId, OAuthSignInResult } from './types';
export { OAuthProviderError } from './types';

export const oauthProviders: OAuthProvider[] = [
  createDisabledOAuthProvider('kakao', 'Kakao', 'K'),
  createDisabledOAuthProvider('naver', 'Naver', 'N'),
  googleOAuthProvider,
];

export function getOAuthProvider(providerId: OAuthProviderId): OAuthProvider | undefined {
  return oauthProviders.find((provider) => provider.id === providerId);
}
