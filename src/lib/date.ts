export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(input: Date, days: number): Date {
  const out = new Date(input);
  out.setDate(out.getDate() + days);
  return out;
}

export function setTime(base: Date, hours: number, minutes: number): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function parseHHmm(value: string): { hours: number; minutes: number } {
  const [h, m] = value.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { hours: 0, minutes: 0 };
  }
  return { hours, minutes };
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
