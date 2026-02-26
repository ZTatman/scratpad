import { GuardrailInput } from '../types.js';

function parseHHmm(value: string, fallback: string): { hour: number; minute: number } {
  const source = value.includes(':') ? value : fallback;
  const [hour, minute] = source.split(':').map((part) => Number(part));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    const [fh, fm] = fallback.split(':').map((part) => Number(part));
    return { hour: fh || 0, minute: fm || 0 };
  }
  return { hour, minute };
}

export function isInQuietHours(now: Date, quietHoursStart: string, quietHoursEnd: string): boolean {
  const { hour: sh, minute: sm } = parseHHmm(quietHoursStart, '22:00');
  const { hour: eh, minute: em } = parseHHmm(quietHoursEnd, '08:00');

  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const current = now.getHours() * 60 + now.getMinutes();

  if (start <= end) return current >= start && current < end;
  return current >= start || current < end;
}

export function canSendReminderWithGuardrails(input: GuardrailInput): { allowed: boolean; reason?: string } {
  const { now, taskId, settings, stats } = input;

  if (!settings.remindersEnabled) {
    return { allowed: false, reason: 'disabled' };
  }

  if (isInQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  if (stats.totalSentToday >= settings.maxDailyReminders) {
    return { allowed: false, reason: 'max_daily_reached' };
  }

  if ((stats.perTaskSentToday[taskId] ?? 0) >= settings.maxRemindersPerTask) {
    return { allowed: false, reason: 'max_task_reached' };
  }

  if (stats.lastSentAtMs > 0) {
    const elapsedMinutes = Math.floor((now.getTime() - stats.lastSentAtMs) / 60000);
    if (elapsedMinutes < Math.max(1, settings.minSpacingMinutes)) {
      return { allowed: false, reason: 'min_spacing' };
    }
  }

  return { allowed: true };
}
