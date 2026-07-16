import { FieldError } from '@/types/api';

export function jsonObjectFromText(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON must be an object');
  }
  return parsed as Record<string, unknown>;
}

export function normalizeTags(input: string[]) {
  const seen = new Set<string>();
  return input
    .flatMap((tag) => tag.split(','))
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function firstFieldError(details: FieldError[] | undefined, field: string) {
  return details?.find((error) => error.field === field)?.message;
}
