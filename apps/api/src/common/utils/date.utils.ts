export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes, seconds = '0'] = time.split(':');
  const copy = new Date(date);
  copy.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return copy;
}

export function diffMinutes(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 60000));
}
