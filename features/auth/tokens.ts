export type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
};

export function extractAuthTokens(response: unknown): AuthTokens | null {
  const root = asRecord(response);
  const data = asRecord(root.data);
  const source = Object.keys(data).length > 0 ? data : root;

  const accessToken = stringFrom(source.accessToken) ?? stringFrom(source.token);
  const refreshToken = stringFrom(source.refreshToken);

  if (!accessToken && !refreshToken) return null;

  const result: AuthTokens = {};
  if (accessToken !== undefined) result.accessToken = accessToken;
  if (refreshToken !== undefined) result.refreshToken = refreshToken;

  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringFrom(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
