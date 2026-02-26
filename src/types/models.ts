export type TaskStatus = 'PENDING' | 'DONE';

export type RepeatType = 'NONE' | 'DAILY' | 'WEEKLY';

export type Task = {
  id: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  repeat: RepeatType;
  rolloverCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReminderSettings = {
  phoneNumber: string;
  defaultSnoozeMinutes: number;
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
  quietHoursMessageSentToday: boolean;
  celebrationSentToday: boolean;
  snoozeUntilMs: number;
  lastInboundSyncAtMs: number;
  processedInboundActionIds: Record<string, number>;
};

export type SmsCommand = 'DONE' | 'ROLLOVER' | 'SNOOZE' | 'DONE_ALL' | 'BREAKDOWN';

export type SmsWebhookPayload = {
  from: string;
  body: string;
  receivedAt: string;
};

export type ParsedCommand =
  | { type: 'DONE'; taskId?: string }
  | { type: 'ROLLOVER'; taskId?: string }
  | { type: 'SNOOZE'; minutes?: number }
  | { type: 'DONE_ALL' }
  | { type: 'BREAKDOWN'; taskId?: string; subtasks: string[] }
  | { type: 'UNKNOWN' };

export type SmsSendRequest = {
  to: string;
  body: string;
  type: 'MORNING' | 'REMINDER' | 'HIBERNATION' | 'CELEBRATION' | 'BREAKDOWN_PROMPT';
};
