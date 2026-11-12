/**
 * Local calendar dates as `YYYY-MM-DD` strings. A date is always
 * the user's local day, never a UTC date. Weekdays use JavaScript's numbering: 0 is Sunday,
 * 6 is Saturday.
 */
export type LocalDate = string;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** An inclusive range of local dates. */
export interface DateRange {
  start: LocalDate;
  end: LocalDate;
}

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

/** The local date of a moment. */
export function toLocalDate(moment: Date): LocalDate {
  return `${pad(moment.getFullYear(), 4)}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

/** Today on the device clock. */
export function today(now: Date = new Date()): LocalDate {
  return toLocalDate(now);
}

export function isLocalDate(value: string): boolean {
  const match = LOCAL_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Local midnight of a date. Throws on a malformed date, which is a programming error. */
export function parseLocalDate(value: LocalDate): Date {
  if (!isLocalDate(value)) throw new Error(`Not a local date: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Moves a date by whole days. Calendar arithmetic, so daylight saving changes do not matter. */
export function addDays(value: LocalDate, days: number): LocalDate {
  const date = parseLocalDate(value);
  return toLocalDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function addMonths(value: LocalDate, months: number): LocalDate {
  const date = parseLocalDate(value);
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toLocalDate(
    new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay))
  );
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000
  );
}

export function weekdayOf(value: LocalDate): Weekday {
  return parseLocalDate(value).getDay() as Weekday;
}

export function isWeekend(value: LocalDate): boolean {
  const day = weekdayOf(value);
  return day === 0 || day === 6;
}

/** The week containing `value`, starting on `weekStart` (1 for Monday, 0 for Sunday). */
export function weekRange(value: LocalDate, weekStart: Weekday = 1): DateRange {
  const offset = (weekdayOf(value) - weekStart + 7) % 7;
  const start = addDays(value, -offset);
  return { start, end: addDays(start, 6) };
}

export function monthRange(value: LocalDate): DateRange {
  const date = parseLocalDate(value);
  return {
    start: toLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: toLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

/** The calendar quarter containing `value` (January to March is the first). */
export function quarterRange(value: LocalDate): DateRange {
  const date = parseLocalDate(value);
  const firstMonth = Math.floor(date.getMonth() / 3) * 3;
  return {
    start: toLocalDate(new Date(date.getFullYear(), firstMonth, 1)),
    end: toLocalDate(new Date(date.getFullYear(), firstMonth + 3, 0)),
  };
}

/** A custom range from two picked dates, in either order. */
export function customRange(a: LocalDate, b: LocalDate): DateRange {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

export function isInRange(value: LocalDate, range: DateRange): boolean {
  return value >= range.start && value <= range.end;
}

/**
 * One month for a calendar grid: the blank cells before day 1 (so the first column is
 * `weekStart`), then every date of the month.
 */
export function monthGrid(
  year: number,
  month: number,
  weekStart: Weekday = 1
): { leadingBlanks: number; days: LocalDate[] } {
  const first = new Date(year, month - 1, 1);
  const length = new Date(year, month, 0).getDate();
  return {
    leadingBlanks: (first.getDay() - weekStart + 7) % 7,
    days: Array.from({ length }, (_, i) => toLocalDate(new Date(year, month - 1, i + 1))),
  };
}

/** Milliseconds until the next local midnight, when "today" changes. */
export function msUntilNextDay(now: Date = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/** Every date in the range, oldest first. */
export function eachDay(range: DateRange): LocalDate[] {
  const days: LocalDate[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) days.push(day);
  return days;
}
