function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

// matchTime is a naive Eastern wall-clock string (see Matchup.matchTime) —
// treated as UTC purely so Intl gives us weekday/month names and a 12-hour
// clock without the runtime's own timezone reinterpreting the naive string.
export function formatMatchTime(matchTime: string): string {
  const match = matchTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return matchTime;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)));

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const day = Number(get('day'));
  return `${get('weekday')}, ${get('month')} ${day}${ordinalSuffix(day)} @ ${get('hour')}:${get('minute')} ${get('dayPeriod')} ET`;
}
