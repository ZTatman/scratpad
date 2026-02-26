import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/storage/keys';
import { ReminderSettings, ReminderStats, Task } from '@/types/models';
import { todayKey } from '@/lib/date';

const DEFAULT_SETTINGS: ReminderSettings = {
  remindersEnabled: true,
  dailyBriefingEnabled: true,
  dailyBriefingTime: '08:00',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  maxDailyReminders: 15,
  maxRemindersPerTask: 3,
  minSpacingMinutes: 10
};

const DEFAULT_STATS = (): ReminderStats => ({
  dateKey: todayKey(),
  totalSentToday: 0,
  perTaskSentToday: {},
  lastSentAtMs: 0,
  quietHoursMessageSentToday: false,
  celebrationSentToday: false,
  snoozeUntilMs: 0
});

type UiPrefs = {
  onboardingDone: boolean;
  deletedTask?: Task;
  activeBreakdownTaskId?: string;
};

const DEFAULT_UI: UiPrefs = {
  onboardingDone: false
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.tasks);
  const parsed = safeParse<Task[]>(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export async function loadSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
  const parsed = safeParse<Partial<ReminderSettings>>(raw, {});
  // coerceSettings keeps old/missing keys migration-safe across app versions.
  return coerceSettings(parsed);
}

export async function saveSettings(settings: ReminderSettings): Promise<void> {
  const safe = coerceSettings(settings);
  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(safe));
}

export async function loadStats(): Promise<ReminderStats> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.stats);
  const parsed = safeParse<Partial<ReminderStats>>(raw, {});
  const defaults = DEFAULT_STATS();
  const currentDate = todayKey();

  const merged: ReminderStats = {
    ...defaults,
    ...parsed,
    perTaskSentToday: parsed.perTaskSentToday ?? {}
  };

  // Reminder counters are day-bound; once date changes we reset to avoid stale suppression.
  if (merged.dateKey !== currentDate) {
    return DEFAULT_STATS();
  }

  return merged;
}

export async function saveStats(stats: ReminderStats): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

export async function loadUiPrefs(): Promise<UiPrefs> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ui);
  const parsed = safeParse<UiPrefs>(raw, DEFAULT_UI);
  return {
    ...DEFAULT_UI,
    ...parsed
  };
}

export async function saveUiPrefs(ui: UiPrefs): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ui, JSON.stringify(ui));
}

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

export function coerceSettings(settings: Partial<ReminderSettings> = {}): ReminderSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    maxDailyReminders: Math.max(1, Number(settings.maxDailyReminders ?? DEFAULT_SETTINGS.maxDailyReminders)),
    maxRemindersPerTask: Math.max(1, Number(settings.maxRemindersPerTask ?? DEFAULT_SETTINGS.maxRemindersPerTask)),
    minSpacingMinutes: Math.max(1, Number(settings.minSpacingMinutes ?? DEFAULT_SETTINGS.minSpacingMinutes))
  };
}

export { DEFAULT_SETTINGS, DEFAULT_STATS, DEFAULT_UI, type UiPrefs };
