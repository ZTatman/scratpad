import { evaluateReminderTick } from '@/reminders/scheduler';
import { DEFAULT_SETTINGS } from '@/storage/persistence';
import { ReminderStats, Task } from '@/types/models';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => undefined)
}));

const transport = {
  sendMessage: jest.fn(async () => undefined)
};

const baseStats: ReminderStats = {
  dateKey: '2026-02-19',
  totalSentToday: 0,
  perTaskSentToday: {},
  lastSentAtMs: 0,
  quietHoursMessageSentToday: false,
  celebrationSentToday: false,
  snoozeUntilMs: 0
};

describe('scheduler integration', () => {
  beforeEach(() => {
    transport.sendMessage.mockClear();
  });

  it('sends celebration only when there are tasks and all are done', async () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Task',
        dueAt: '2026-02-19T09:00:00.000Z',
        status: 'DONE',
        repeat: 'NONE',
        rolloverCount: 0,
        createdAt: '2026-02-19T08:00:00.000Z',
        updatedAt: '2026-02-19T08:00:00.000Z'
      }
    ];

    const result = await evaluateReminderTick({
      now: new Date('2026-02-19T12:00:00.000Z'),
      tasks,
      settings: DEFAULT_SETTINGS,
      stats: baseStats,
      phoneNumber: '+15550001111',
      transport
    });

    expect(result.logs).toContain('sent_celebration');
    expect(transport.sendMessage).toHaveBeenCalledTimes(1);
  });
});
