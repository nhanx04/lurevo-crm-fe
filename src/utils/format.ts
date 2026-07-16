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
