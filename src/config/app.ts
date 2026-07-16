const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

export const appConfig = {
  apiBaseUrl: normalizeBaseUrl(rawBaseUrl),
  upload: {
    maxImagesPerListing: 15,
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  },
};
