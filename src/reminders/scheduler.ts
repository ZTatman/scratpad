import Constants from 'expo-constants';
import { buildCelebrationMessage, buildHibernationMessage, buildMorningBriefingMessage, buildReminderPrompt } from '@/reminders/messages';
import { canSendReminder, ensureStatsForToday, isInQuietHours, shouldSendMorningBriefing } from '@/reminders/policy';
import { ReminderSettings, ReminderStats, Task } from '@/types/models';
import { todayKey } from '@/lib/date';
import { SmsTransport } from '@/sms/client';

export type SchedulerResult = {
  stats: ReminderStats;
  logs: string[];
};

let notificationsUnavailableLogged = false;

function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

async function notifyFallback(title: string, body: string): Promise<void> {
  // Expo Go SDK 53+ does not support the same expo-notifications behavior as dev builds.
  // Skip local fallback there so reminder logic can still run without runtime errors.
  if (isExpoGo()) return;

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null
    });
  } catch {
    if (!notificationsUnavailableLogged) {
      notificationsUnavailableLogged = true;
      console.warn('[ScratPad] Local notification fallback unavailable in current runtime.');
    }
  }
}

function isTodayTask(task: Task, now: Date): boolean {
  return task.dueAt.slice(0, 10) === todayKey(now);
}

export async function evaluateReminderTick(args: {
  now: Date;
  tasks: Task[];
  settings: ReminderSettings;
  stats: ReminderStats;
  phoneNumber: string;
  transport: SmsTransport;
}): Promise<SchedulerResult> {
  // Priority order matters:
  // 1) celebration (all done), 2) quiet-hours hibernation, 3) morning briefing, 4) regular reminder.
  // This keeps messages intentional and avoids overlapping sends in the same tick.
  const logs: string[] = [];
  let nextStats = ensureStatsForToday(args.stats, args.now);

  const todaysTasks = args.tasks.filter((task) => isTodayTask(task, args.now));
  const pending = todaysTasks.filter((task) => task.status === 'PENDING');

  if (todaysTasks.length > 0 && pending.length === 0 && !nextStats.celebrationSentToday) {
    const msg = buildCelebrationMessage();
    if (args.phoneNumber) {
      await args.transport.sendMessage(args.phoneNumber, msg, 'CELEBRATION');
    }
    await notifyFallback('ScratPad', msg);
    nextStats = {
      ...nextStats,
      totalSentToday: nextStats.totalSentToday + 1,
      lastSentAtMs: args.now.getTime(),
      celebrationSentToday: true
    };
    logs.push('sent_celebration');
    return { stats: nextStats, logs };
  }

  if (
    isInQuietHours(args.now, args.settings.quietHoursStart, args.settings.quietHoursEnd) &&
    !nextStats.quietHoursMessageSentToday
  ) {
    const msg = buildHibernationMessage();
    if (args.phoneNumber) {
      await args.transport.sendMessage(args.phoneNumber, msg, 'HIBERNATION');
    }
    await notifyFallback('ScratPad', msg);
    nextStats = {
      ...nextStats,
      totalSentToday: nextStats.totalSentToday + 1,
      lastSentAtMs: args.now.getTime(),
      quietHoursMessageSentToday: true
    };
    logs.push('sent_hibernation');
    return { stats: nextStats, logs };
  }

  if (shouldSendMorningBriefing(args.now, args.settings, nextStats, pending.length)) {
    const msg = buildMorningBriefingMessage(pending, 'Today');
    if (args.phoneNumber) {
      await args.transport.sendMessage(args.phoneNumber, msg, 'MORNING');
    }
    await notifyFallback('ScratPad', msg);
    nextStats = {
      ...nextStats,
      totalSentToday: nextStats.totalSentToday + 1,
      lastSentAtMs: args.now.getTime()
    };
    logs.push('sent_morning_briefing');
    return { stats: nextStats, logs };
  }

  const target = pending.sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  if (!target) {
    logs.push('no_pending_tasks');
    return { stats: nextStats, logs };
  }

  // Regular reminder path is guardrail-gated (caps, spacing, quiet hours, snooze, etc.).
  const decision = canSendReminder({
    now: args.now,
    settings: args.settings,
    stats: nextStats,
    task: target
  });

  if (!decision.allowed) {
    logs.push(`suppressed_${decision.reason}`);
    return { stats: nextStats, logs };
  }

  const prompt = buildReminderPrompt(target);
  if (args.phoneNumber) {
    await args.transport.sendMessage(args.phoneNumber, prompt, 'REMINDER');
  }
  await notifyFallback('ScratPad Reminder', prompt);

  nextStats = {
    ...nextStats,
    totalSentToday: nextStats.totalSentToday + 1,
    lastSentAtMs: args.now.getTime(),
    perTaskSentToday: {
      ...nextStats.perTaskSentToday,
      [target.id]: (nextStats.perTaskSentToday[target.id] ?? 0) + 1
    }
  };

  logs.push('sent_reminder');

  return { stats: nextStats, logs };
}
