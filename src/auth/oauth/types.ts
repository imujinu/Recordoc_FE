export type OAuthProviderId = 'google' | 'kakao' | 'naver';

export type OAuthSignInResult = { type: 'success' } | { type: 'cancelled' };

export type OAuthErrorCode = 'not_configured' | 'play_services_unavailable' | 'unavailable' | 'unknown';

export class OAuthProviderError extends Error {
  code: OAuthErrorCode;

  constructor(code: OAuthErrorCode, message: string) {
    super(message);
    this.name = 'OAuthProviderError';
    this.code = code;
  }
}

export type OAuthProvider = {
  id: OAuthProviderId;
  label: string;
  shortLabel: string;
  buttonText: string;
  isConfigured: () => boolean;
  configure?: () => void;
  signIn: () => Promise<OAuthSignInResult>;
};
