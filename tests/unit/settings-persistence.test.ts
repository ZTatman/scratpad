import { coerceSettings, DEFAULT_SETTINGS } from '@/storage/persistence';

describe('settings persistence defaults', () => {
  it('fills missing values with defaults', () => {
    const merged = coerceSettings({ dailyBriefingEnabled: false });
    expect(merged.dailyBriefingEnabled).toBe(false);
    expect(merged.dailyBriefingTime).toBe(DEFAULT_SETTINGS.dailyBriefingTime);
    expect(merged.maxDailyReminders).toBe(DEFAULT_SETTINGS.maxDailyReminders);
    expect(merged.phoneNumber).toBe(DEFAULT_SETTINGS.phoneNumber);
    expect(merged.reminderIntervalMinutes).toBe(DEFAULT_SETTINGS.reminderIntervalMinutes);
    expect(merged.defaultSnoozeMinutes).toBe(DEFAULT_SETTINGS.defaultSnoozeMinutes);
  });

  it('coerces guardrail values to valid minimum', () => {
    const merged = coerceSettings({
      maxDailyReminders: 0,
      maxRemindersPerTask: -10,
      minSpacingMinutes: 0
    });

    expect(merged.maxDailyReminders).toBe(1);
    expect(merged.maxRemindersPerTask).toBe(1);
    expect(merged.minSpacingMinutes).toBe(1);
  });

  it('coerces phone/reminder interval/snooze settings', () => {
    const merged = coerceSettings({
      phoneNumber: '  +15551234567  ',
      reminderIntervalMinutes: 1,
      defaultSnoozeMinutes: 0
    });

    expect(merged.phoneNumber).toBe('+15551234567');
    expect(merged.reminderIntervalMinutes).toBe(5);
    expect(merged.defaultSnoozeMinutes).toBe(5);
  });
});
