import { coerceSettings, DEFAULT_SETTINGS } from '@/storage/persistence';

describe('settings persistence defaults', () => {
  it('fills missing values with defaults', () => {
    const merged = coerceSettings({ dailyBriefingEnabled: false });
    expect(merged.dailyBriefingEnabled).toBe(false);
    expect(merged.dailyBriefingTime).toBe(DEFAULT_SETTINGS.dailyBriefingTime);
    expect(merged.maxDailyReminders).toBe(DEFAULT_SETTINGS.maxDailyReminders);
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
});
