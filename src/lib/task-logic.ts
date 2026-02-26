import { addDays } from '@/lib/date';
import { RepeatType } from '@/types/models';

export function computeNextDueForRepeat(dueAtIso: string, repeat: RepeatType): string {
  const dueAt = new Date(dueAtIso);
  if (repeat === 'DAILY') return addDays(dueAt, 1).toISOString();
  if (repeat === 'WEEKLY') return addDays(dueAt, 7).toISOString();
  return dueAtIso;
}
