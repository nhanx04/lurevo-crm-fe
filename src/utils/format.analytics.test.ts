import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercentage } from './format';

describe('analytics format helpers', () => {
  it('formats operational durations', () => {
    expect(formatDuration(1800)).toBe('30 min');
    expect(formatDuration(5400)).toBe('1.5 hours');
    expect(formatDuration(172800)).toBe('2.0 days');
  });

  it('formats missing comparison percentages safely', () => {
    expect(formatPercentage(null)).toBe('No previous data');
  });
});
