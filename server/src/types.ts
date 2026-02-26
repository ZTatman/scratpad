export type SmsCommand = 'DONE' | 'ROLLOVER' | 'SNOOZE' | 'DONE_ALL' | 'BREAKDOWN' | 'UNKNOWN';

export type ParsedCommand =
  | { type: 'DONE'; taskId?: string }
  | { type: 'ROLLOVER'; taskId?: string }
  | { type: 'SNOOZE'; minutes?: number }
  | { type: 'DONE_ALL' }
  | { type: 'BREAKDOWN'; subtasks: string[] }
  | { type: 'UNKNOWN' };

export type SmsWebhookPayload = {
  messageSid?: string;
  from: string;
  body: string;
  receivedAt: string;
};

export type ReminderSettings = {
  remindersEnabled: boolean;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxDailyReminders: number;
  maxRemindersPerTask: number;
  minSpacingMinutes: number;
};

export type ReminderStats = {
  dateKey: string;
  totalSentToday: number;
  perTaskSentToday: Record<string, number>;
  lastSentAtMs: number;
};

export type GuardrailInput = {
  now: Date;
  taskId: string;
  settings: ReminderSettings;
  stats: ReminderStats;
};
