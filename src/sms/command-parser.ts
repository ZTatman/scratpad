import { ParsedCommand } from '@/types/models';

function parseTaskId(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parseSmsCommand(body: string): ParsedCommand {
  const trimmed = body.trim();
  const upper = trimmed.toUpperCase();

  // Fast path for single-digit lock-screen replies.
  if (upper === '1') return { type: 'DONE' };
  if (upper === '2') return { type: 'ROLLOVER' };
  if (upper.startsWith('3')) {
    const minutes = Number(trimmed.split(/[\s:]+/)[1]);
    return { type: 'SNOOZE', minutes: Number.isFinite(minutes) ? minutes : undefined };
  }
  if (upper === '4') return { type: 'DONE_ALL' };

  if (upper.startsWith('DONE ALL')) return { type: 'DONE_ALL' };

  if (upper.startsWith('DONE ')) {
    return { type: 'DONE', taskId: parseTaskId(trimmed.split(' ')[1]) };
  }

  if (upper.startsWith('ROLLOVER ')) {
    return { type: 'ROLLOVER', taskId: parseTaskId(trimmed.split(' ')[1]) };
  }

  if (upper.startsWith('SNOOZE')) {
    const maybe = Number(trimmed.split(/[\s:]+/)[1]);
    return { type: 'SNOOZE', minutes: Number.isFinite(maybe) ? maybe : undefined };
  }

  // Comma-separated text is interpreted as a task breakdown response.
  if (trimmed.includes(',') && !upper.startsWith('DONE') && !upper.startsWith('ROLLOVER')) {
    const parts = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return { type: 'BREAKDOWN', subtasks: parts };
    }
  }

  return { type: 'UNKNOWN' };
}
