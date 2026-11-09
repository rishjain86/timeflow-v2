// Pure helpers: format dates for the provider portal in the ORGANIZATION's time zone.

const fmt = (d: Date, tz: string, opts: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(d);

/** YYYY-MM-DD in the given time zone (sortable, comparable). */
export const ymd = (d: Date, tz: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const timeLabel = (d: Date, tz: string): string =>
  fmt(d, tz, { hour: 'numeric', minute: '2-digit', hour12: true });

const longDate = (d: Date, tz: string): string => fmt(d, tz, { month: 'short', day: 'numeric', year: 'numeric' });

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today, Nov 6, 2026" | "Tomorrow, ..." | "Yesterday, ..." | "Fri, Nov 8, 2026" */
export const dayHeading = (d: Date, now: Date, tz: string): string => {
  const key = ymd(d, tz);
  if (key === ymd(now, tz)) return `Today, ${longDate(d, tz)}`;
  if (key === ymd(new Date(now.getTime() + DAY_MS), tz)) return `Tomorrow, ${longDate(d, tz)}`;
  if (key === ymd(new Date(now.getTime() - DAY_MS), tz)) return `Yesterday, ${longDate(d, tz)}`;
  return `${fmt(d, tz, { weekday: 'short' })}, ${longDate(d, tz)}`;
};

/** "Today, 10:00 AM" | "Yesterday, 11:30 AM" | "Jul 26, 2026" */
export const sessionLabel = (d: Date, now: Date, tz: string): string => {
  const key = ymd(d, tz);
  if (key === ymd(now, tz)) return `Today, ${timeLabel(d, tz)}`;
  if (key === ymd(new Date(now.getTime() - DAY_MS), tz)) return `Yesterday, ${timeLabel(d, tz)}`;
  return longDate(d, tz);
};

export const signedLabel = (d: Date, tz: string): string => `${longDate(d, tz)}, ${timeLabel(d, tz)}`;

/** Notes are due 24h after the session ends. */
export const dueLabel = (sessionEnd: Date, now: Date, tz: string): string => {
  const due = new Date(sessionEnd.getTime() + DAY_MS);
  if (now.getTime() <= due.getTime()) {
    return `Due ${dayHeading(due, now, tz).split(',')[0]}, ${timeLabel(due, tz)}`;
  }
  const hours = Math.floor((now.getTime() - due.getTime()) / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Overdue by ${days} Day${days === 1 ? '' : 's'}`;
  }
  return `Overdue by ${Math.max(hours, 1)} Hour${hours <= 1 ? '' : 's'}`;
};

/** "Thursday, Aug 15, 2026" */
export const longDay = (d: Date, tz: string): string =>
  fmt(d, tz, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

/** "Aug 04, 2026" */
export const shortDate = (d: Date, tz: string): string =>
  fmt(d, tz, { month: 'short', day: '2-digit', year: 'numeric' });

/**
 * The patient is the CASE (project). `patientName` is the clean name; older cases only have the long stitched
 * display name ("Jane Doe - HCAI 123 - OT TX - ..."), so fall back to its first segment.
 */
export const patientLabel = (
  project: { name: string; patientName: string | null } | null | undefined,
  fallback?: string | null
): string => project?.patientName?.trim() || project?.name?.split(' - ')[0]?.trim() || fallback || 'Unknown patient';
