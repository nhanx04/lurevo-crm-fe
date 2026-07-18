export function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatCurrency(value: string, currency = 'USD') {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${currency} ${value}`;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(number);
}

export function formatInteger(value: number | string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(number);
}

export function formatCompactNumber(value: number | string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

export function formatDecimalString(value?: string | null) {
  if (!value) return '0';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number);
}

export function formatPercentage(value?: string | null) {
  if (value === null || value === undefined || value === '') return 'No previous data';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(number)}%`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Not enough data';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

export function formatFileSize(bytes: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + ' MB';
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function sanitizeColor(color?: string | null) {
  return /^#[0-9a-f]{6}$/i.test(color || '') ? color || undefined : undefined;
}
