import { ReminderSettings, ReminderStats, Task } from '@/types/models';
import { todayKey } from '@/lib/date';

export function parseTime(value: string, fallback = '00:00'): { hour: number; minute: number } {
  const source = value.includes(':') ? value : fallback;
  const [h, m] = source.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    const [fh, fm] = fallback.split(':').map((part) => Number(part));
    return { hour: fh || 0, minute: fm || 0 };
  }
  return { hour: h, minute: m };
}

export function isInQuietHours(now: Date, quietStart: string, quietEnd: string): boolean {
  const { hour: sh, minute: sm } = parseTime(quietStart, '22:00');
  const { hour: eh, minute: em } = parseTime(quietEnd, '08:00');

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  // Handles same-day windows (e.g. 13:00-17:00).
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  // Handles overnight windows (e.g. 22:00-08:00).
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function passesMinSpacing(lastSentAtMs: number, nowMs: number, minSpacingMinutes: number): boolean {
  if (!lastSentAtMs || lastSentAtMs <= 0) return true;
  const deltaMinutes = Math.floor((nowMs - lastSentAtMs) / 60000);
  return deltaMinutes >= Math.max(1, minSpacingMinutes);
}

export function ensureStatsForToday(stats: ReminderStats, now = new Date()): ReminderStats {
  const key = todayKey(now);
  if (stats.dateKey === key) return stats;
  // Stats are day-scoped; reset counters at day boundary.
  return {
    dateKey: key,
    totalSentToday: 0,
    perTaskSentToday: {},
    lastSentAtMs: 0,
    quietHoursMessageSentToday: false,
    celebrationSentToday: false,
    snoozeUntilMs: 0,
    lastInboundSyncAtMs: 0,
    processedInboundActionIds: {}
  };
}

export function canSendReminder(args: {
  now: Date;
  settings: ReminderSettings;
  stats: ReminderStats;
  task: Task;
}): { allowed: boolean; reason?: string } {
  const { now, settings, stats, task } = args;

  // Guardrails are evaluated in short-circuit order so logs show the first blocking reason.
  if (!settings.remindersEnabled) {
    return { allowed: false, reason: 'disabled' };
  }

  if (task.status === 'DONE') {
    return { allowed: false, reason: 'task_done' };
  }

  if (stats.snoozeUntilMs > now.getTime()) {
    return { allowed: false, reason: 'snoozed' };
  }

  if (isInQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  if (stats.totalSentToday >= settings.maxDailyReminders) {
    return { allowed: false, reason: 'daily_cap' };
  }

  if ((stats.perTaskSentToday[task.id] ?? 0) >= settings.maxRemindersPerTask) {
    return { allowed: false, reason: 'per_task_cap' };
  }

  if (!passesMinSpacing(stats.lastSentAtMs, now.getTime(), settings.minSpacingMinutes)) {
    return { allowed: false, reason: 'min_spacing' };
  }

  return { allowed: true };
}

export function shouldSendMorningBriefing(
  now: Date,
  settings: ReminderSettings,
  stats: ReminderStats,
  pendingCount: number
): boolean {
  if (!settings.remindersEnabled) return false;
  if (!settings.dailyBriefingEnabled) return false;
  if (pendingCount < 0) return false;
  if (isInQuietHours(now, settings.quietHoursStart, settings.quietHoursEnd)) return false;

  const { hour, minute } = parseTime(settings.dailyBriefingTime, '08:00');
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  // Briefing piggybacks on stats; if we already sent anything after briefing time, don't send again.
  const alreadySent = stats.totalSentToday > 0 && stats.lastSentAtMs >= target.getTime();
  return now.getTime() >= target.getTime() && !alreadySent;
}
