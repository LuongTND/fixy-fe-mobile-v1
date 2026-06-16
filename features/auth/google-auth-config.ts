export type GoogleAuthEnv = {
  googleClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
};

export function buildGoogleAuthRequestConfig({
  googleClientId,
  googleIosClientId,
  googleAndroidClientId,
}: GoogleAuthEnv) {
  return {
    clientId: googleClientId,
    webClientId: googleClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
  };
}

export function buildGoogleAuthRedirectOptions(googleIosRedirectScheme?: string) {
  return googleIosRedirectScheme
    ? {
        native: `${googleIosRedirectScheme}:/oauthredirect`,
      }
    : undefined;
}
