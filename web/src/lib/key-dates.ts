import type { KeyDate } from '../data/types';

export type PhaseStatus = 'Upcoming' | 'In Progress' | 'Complete';

// Current wall-clock time in America/New_York as 'YYYY-MM-DDTHH:mm:ss', so it
// compares directly (as a string) against KeyDate.activeAt/endsAt regardless
// of where the visitor or build machine is.
export function nowInNewYork(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

// A dated phase runs until its own endsAt if set, otherwise until the next
// dated phase in the list begins. The last phase with neither stays open-ended.
export function phaseEndsAt(keyDates: KeyDate[], index: number): string | undefined {
  const own = keyDates[index].endsAt;
  if (own) return own;
  return keyDates.slice(index + 1).find((d) => d.activeAt)?.activeAt;
}

export function phaseStatus(activeAt: string, endsAt: string | undefined, now: string): PhaseStatus {
  if (now < activeAt) return 'Upcoming';
  if (endsAt && now >= endsAt) return 'Complete';
  return 'In Progress';
}
