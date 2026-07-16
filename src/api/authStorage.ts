import type { AuthUser, TokenPairResponse } from '@/types/api';

const KEY = 'lurevo.auth.v1';

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

function read(): StoredSession | null {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

export const authStorage = {
  get: read,
  set(tokens: TokenPairResponse) {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: tokens.user,
      } satisfies StoredSession),
    );
  },
  updateAccess(tokens: TokenPairResponse) {
    authStorage.set(tokens);
  },
  clear() {
    window.localStorage.removeItem(KEY);
  },
};
