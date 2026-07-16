import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/app';
import { authStorage } from './authStorage';
import { ApiEnvelope, ApiError, TokenPairResponse } from '@/types/api';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; skipAuthRefresh?: boolean };
export type ApiRequestConfig = AxiosRequestConfig & { skipAuthRefresh?: boolean };

let refreshPromise: Promise<TokenPairResponse> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

export const rawApi = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

function extractEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success) return envelope.data;
    throw new ApiError(400, envelope.error);
  }
  return payload as T;
}

api.interceptors.request.use((config) => {
  const session = authStorage.get();
  if (session?.accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    response.data = extractEnvelope(response.data);
    return response;
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status ?? 0;
    const original = error.config as RetryConfig | undefined;
    const payload = error.response?.data;
    const body =
      payload && typeof payload === 'object' && 'success' in payload && !payload.success
        ? payload.error
        : typeof payload === 'string'
          ? { code: 'REQUEST_FAILED', message: payload }
          : undefined;

    if (status === 401 && original && !original._retry && !original.skipAuthRefresh) {
      const session = authStorage.get();
      if (session?.refreshToken) {
        original._retry = true;
        try {
          refreshPromise ??= rawApi
            .post<ApiEnvelope<TokenPairResponse>>('/auth/refresh', { refresh_token: session.refreshToken })
            .then((res) => extractEnvelope(res.data))
            .finally(() => {
              refreshPromise = null;
            });
          const tokens = await refreshPromise;
          authStorage.updateAccess(tokens);
          original.headers.Authorization = `Bearer ${tokens.access_token}`;
          return api(original);
        } catch {
          authStorage.clear();
          sessionExpiredHandler?.();
        }
      }
    }

    throw new ApiError(status, body);
  },
);

export async function apiGet<T>(url: string, config?: ApiRequestConfig) {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
  const res = await api.post<T>(url, data, config);
  return res.data;
}

export async function apiPatch<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
  const res = await api.patch<T>(url, data, config);
  return res.data;
}

export async function apiPut<T>(url: string, data?: unknown, config?: ApiRequestConfig) {
  const res = await api.put<T>(url, data, config);
  return res.data;
}

export async function apiDelete(url: string) {
  await api.delete(url);
}
