import { canSendReminder, isInQuietHours, passesMinSpacing } from '@/reminders/policy';
import { ReminderSettings, ReminderStats, Task } from '@/types/models';

const settings: ReminderSettings = {
  remindersEnabled: true,
  dailyBriefingEnabled: true,
  dailyBriefingTime: '08:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  maxDailyReminders: 15,
  maxRemindersPerTask: 3,
  minSpacingMinutes: 10
};

const baseStats: ReminderStats = {
  dateKey: '2026-02-19',
  totalSentToday: 0,
  perTaskSentToday: {},
  lastSentAtMs: 0,
  quietHoursMessageSentToday: false,
  celebrationSentToday: false,
  snoozeUntilMs: 0,
  lastInboundSyncAtMs: 0,
  processedInboundActionIds: {}
};

const pendingTask: Task = {
  id: 'task-1',
  title: 'Review notes',
  dueAt: '2026-02-19T09:00:00.000Z',
  status: 'PENDING',
  repeat: 'NONE',
  rolloverCount: 0,
  createdAt: '2026-02-19T08:00:00.000Z',
  updatedAt: '2026-02-19T08:00:00.000Z'
};

describe('policy', () => {
  it('handles overnight quiet hours', () => {
    expect(isInQuietHours(new Date('2026-02-19T23:30:00'), '22:00', '08:00')).toBe(true);
    expect(isInQuietHours(new Date('2026-02-19T07:30:00'), '22:00', '08:00')).toBe(true);
    expect(isInQuietHours(new Date('2026-02-19T12:00:00'), '22:00', '08:00')).toBe(false);
  });

  it('enforces minimum spacing', () => {
    expect(passesMinSpacing(0, Date.now(), 10)).toBe(true);
    expect(passesMinSpacing(1000, 1000 + 8 * 60000, 10)).toBe(false);
    expect(passesMinSpacing(1000, 1000 + 10 * 60000, 10)).toBe(true);
  });

  it('blocks reminder when per-task cap reached', () => {
    const result = canSendReminder({
      now: new Date('2026-02-19T11:00:00'),
      settings,
      stats: { ...baseStats, perTaskSentToday: { 'task-1': 3 } },
      task: pendingTask
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('per_task_cap');
  });
});
