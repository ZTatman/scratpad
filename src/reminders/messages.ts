import { Task } from '@/types/models';

export function buildMorningBriefingMessage(tasks: Task[], dateLabel: string): string {
  const pending = tasks.filter((task) => task.status === 'PENDING');

  if (pending.length === 0) {
    return `${dateLabel} Stash Goal:\n- No tasks scheduled.\n\nYou have 0 nuts to gather today.\nReply:\n1 DONE\n2 ROLLOVER\n3 SNOOZE\n4 DONE ALL`;
  }

  const lines = pending.map((task) => `• ${task.title}`);
  return `${dateLabel} Stash Goal:\n${lines.join('\n')}\n\nReply:\n1 DONE\n2 ROLLOVER\n3 SNOOZE\n4 DONE ALL`;
}

export function buildReminderPrompt(task: Task): string {
  return `Is that a task I smell? Time for ${task.title}.\nReply:\n1 DONE\n2 ROLLOVER\n3 SNOOZE\n4 DONE ALL`;
}

export function buildBreakdownPrompt(task: Task): string {
  return `"${task.title}" has rolled over 3 times. Break it down? Reply with comma-separated steps.`;
}

export function buildHibernationMessage(): string {
  return 'Goodnight from ScratPad. Quiet Hours are active. No more nudges tonight.';
}

export function buildCelebrationMessage(): string {
  return 'Happy Squirrel Dance! You stashed 100% of today\'s nuts. 🐿️🌰';
}
