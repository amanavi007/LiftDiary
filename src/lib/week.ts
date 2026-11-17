export type WeekDay = { label: string; trained: boolean; isToday: boolean };

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Monday-first strip for the week containing `now`, in the server/runtime's local time. */
export function weekStrip(now: Date, sessionDates: Date[]): WeekDay[] {
  const mondayOffset = (now.getDay() + 6) % 7;
  const trained = new Set(sessionDates.map(dayKey));
  return LABELS.map((label, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + i);
    return { label, trained: trained.has(dayKey(d)), isToday: dayKey(d) === dayKey(now) };
  });
}
