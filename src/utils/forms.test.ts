import { describe, expect, it } from 'vitest';
import { jsonObjectFromText, normalizeTags } from './forms';

describe('form utilities', () => {
  it('removes duplicate tags case-insensitively', () => {
    expect(normalizeTags(['Pet, pet', 'Gift'])).toEqual(['Pet', 'Gift']);
  });

  it('requires metadata JSON to be an object', () => {
    expect(jsonObjectFromText('{"a":1}')).toEqual({ a: 1 });
    expect(() => jsonObjectFromText('[1]')).toThrow('JSON must be an object');
  });
});
