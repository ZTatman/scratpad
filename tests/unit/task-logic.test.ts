import { computeNextDueForRepeat } from '@/lib/task-logic';

describe('computeNextDueForRepeat', () => {
  it('returns same date for NONE', () => {
    const dueAt = '2026-02-19T09:00:00.000Z';
    expect(computeNextDueForRepeat(dueAt, 'NONE')).toBe(dueAt);
  });

  it('moves one day for DAILY', () => {
    const next = computeNextDueForRepeat('2026-02-19T09:00:00.000Z', 'DAILY');
    expect(next.startsWith('2026-02-20')).toBe(true);
  });

  it('moves one week for WEEKLY', () => {
    const next = computeNextDueForRepeat('2026-02-19T09:00:00.000Z', 'WEEKLY');
    expect(next.startsWith('2026-02-26')).toBe(true);
  });
});
