import { ParsedCommand } from '../types.js';

function parseTaskId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parseInboundCommand(body: string): ParsedCommand {
  const trimmed = body.trim();
  const upper = trimmed.toUpperCase();

  if (upper === '1') return { type: 'DONE' };
  if (upper === '2') return { type: 'ROLLOVER' };
  if (upper === '4' || upper === 'DONE ALL') return { type: 'DONE_ALL' };

  if (upper.startsWith('3') || upper.startsWith('SNOOZE')) {
    const maybeMinutes = Number(trimmed.split(/[\s:]+/)[1]);
    return { type: 'SNOOZE', minutes: Number.isFinite(maybeMinutes) ? maybeMinutes : undefined };
  }

  if (upper.startsWith('DONE ')) {
    return { type: 'DONE', taskId: parseTaskId(trimmed.split(' ')[1]) };
  }

  if (upper.startsWith('ROLLOVER ')) {
    return { type: 'ROLLOVER', taskId: parseTaskId(trimmed.split(' ')[1]) };
  }

  if (trimmed.includes(',')) {
    const subtasks = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (subtasks.length > 0) {
      return { type: 'BREAKDOWN', subtasks };
    }
  }

  return { type: 'UNKNOWN' };
}
