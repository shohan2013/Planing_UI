/**
 * Pure time maths for the machine schedule dialog: intervals, free gaps, the earliest
 * slot that fits, and the per-day timeline segments. Times are epoch milliseconds;
 * dates coming from / going to the API and inputs are local `yyyy-MM-ddTHH:mm`.
 */
import { IMachineJob } from 'src/app/core/model/MergedPlanning/machine-schedule-model';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Gaps shorter than this are not offered as free slots. */
const MIN_FREE_SLOT_MS = 15 * MINUTE;
/**
 * Offered slots keep one minute clear of booked jobs on both sides: they start the
 * minute after a job ends and end a minute before the next starts, so a slot that
 * merely touches a job (end == next start) isn't rejected as an overlap.
 */
export const SLOT_GAP_MS = MINUTE;
/** Upper bound on timeline rows, so a far-future plan can't render hundreds of days. */
const MAX_TIMELINE_DAYS = 45;

export interface IInterval {
  start: number;
  end: number;
}

export function parseLocal(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Epoch ms -> local `yyyy-MM-ddTHH:mm` (the datetime-local / API format). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Rounds up to the next whole minute (inputs have minute precision). */
export function ceilMinute(ms: number): number {
  return Math.ceil(ms / MINUTE) * MINUTE;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Next local midnight (handles DST by using the calendar, not +24h). */
export function addDays(dayStart: number, days: number): number {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function overlapMs(a: IInterval, b: IInterval): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/** "41h 6m" style; whole hours keep counting past a day, like the stat tiles. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / MINUTE));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

/** Sorted, non-overlapping union of the intervals. */
export function mergeIntervals(intervals: IInterval[]): IInterval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: IInterval[] = [];
  for (const i of sorted) {
    const last = merged[merged.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else merged.push({ ...i });
  }
  return merged;
}

/** Free gaps inside [from, to] around the (merged) busy intervals. */
export function freeGaps(busy: IInterval[], from: number, to: number): IInterval[] {
  const gaps: IInterval[] = [];
  let cursor = ceilMinute(from);
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start >= to) break;
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start - SLOT_GAP_MS, to) });
    cursor = Math.max(cursor, ceilMinute(b.end) + SLOT_GAP_MS);
  }
  if (cursor < to) gaps.push({ start: cursor, end: to });
  return gaps.filter((g) => g.end - g.start >= MIN_FREE_SLOT_MS);
}

/**
 * Earliest slot of `durationMs` starting at/after `from` that touches no busy interval;
 * falls back to right after the last busy interval (the machine is open from then on).
 */
export function earliestFit(busy: IInterval[], from: number, durationMs: number): IInterval {
  let cursor = ceilMinute(from);
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start - cursor >= durationMs + SLOT_GAP_MS) break;
    cursor = Math.max(cursor, ceilMinute(b.end) + SLOT_GAP_MS);
  }
  return { start: cursor, end: cursor + durationMs };
}

/* ------------------------------- the schedule ------------------------------ */

export interface IScheduledJobView {
  job: IMachineJob;
  start: number;
  end: number;
  durationMs: number;
  /** Overlap with the user's slot (0 = none). */
  conflictMs: number;
  inProgress: boolean;
  /** Start and end fall on different days. */
  multiDay: boolean;
}


export interface IScheduleSummary {
  now: number;
  /** End of the last planned job (or `now` when nothing is planned). */
  lastEnd: number;
  /** First minute a slot can start after the last planned job (one minute after it). */
  openFrom: number;
  jobs: IScheduledJobView[];
  busy: IInterval[];
  bookedMs: number;
  freeMs: number;
  /** 0..100, booked share of now -> last planned job. */
  loadPct: number;
  /** Free gaps between now and the last planned job. */
  freeSlots: IInterval[];
  slot: IInterval | null;
  /** Jobs the user's slot overlaps. */
  conflicts: IScheduledJobView[];
  /** Earliest slot as long as the user's slot that fits (only when it clashes). */
  suggestion: IInterval | null;
}

export function buildSummary(
  rawJobs: IMachineJob[],
  now: number,
  slotStart: string | null,
  slotEnd: string | null,
): IScheduleSummary {
  const s = parseLocal(slotStart);
  const e = parseLocal(slotEnd);
  const slot = s !== null && e !== null && e > s ? { start: s, end: e } : null;

  const jobs: IScheduledJobView[] = rawJobs
    .map((job) => ({ job, start: parseLocal(job.StartDate), end: parseLocal(job.EndDate) }))
    .filter((j): j is { job: IMachineJob; start: number; end: number } =>
      j.start !== null && j.end !== null && j.end > j.start && j.end > now,
    )
    .sort((a, b) => a.start - b.start)
    .map(({ job, start, end }) => ({
      job,
      start,
      end,
      durationMs: end - start,
      conflictMs: slot ? overlapMs(slot, { start, end }) : 0,
      inProgress: start <= now && end > now,
      multiDay: startOfDay(start) !== startOfDay(end - 1),
    }));

  const busy = mergeIntervals(jobs.map((j) => ({ start: j.start, end: j.end })));
  const lastEnd = busy.length ? Math.max(now, busy[busy.length - 1].end) : now;
  const windowMs = lastEnd - now;
  const bookedMs = busy.reduce((sum, b) => sum + overlapMs(b, { start: now, end: lastEnd }), 0);
  const conflicts = jobs.filter((j) => j.conflictMs > 0);

  return {
    now,
    lastEnd,
    openFrom: busy.length ? ceilMinute(lastEnd) + SLOT_GAP_MS : ceilMinute(now),
    jobs,
    busy,
    bookedMs,
    freeMs: Math.max(0, windowMs - bookedMs),
    loadPct: windowMs > 0 ? Math.round((bookedMs / windowMs) * 100) : 0,
    freeSlots: freeGaps(busy, now, lastEnd),
    slot,
    conflicts,
    suggestion: slot && conflicts.length ? earliestFit(busy, now, slot.end - slot.start) : null,
  };
}

/* -------------------------------- timeline -------------------------------- */

export type SegmentKind = 'past' | 'open' | 'job' | 'conflict' | 'suggested' | 'slot';

export interface ITimelineSegment {
  kind: SegmentKind;
  /** Position within the day, in % of 24h. */
  left: number;
  width: number;
  label?: string;
  title?: string;
}

export interface ITimelineRow {
  dayStart: number;
  isToday: boolean;
  /** "Today", "2 jobs", "Last plan", "Free". */
  caption: string;
  segments: ITimelineSegment[];
  /** "Now" marker position in % (today only). */
  nowPct: number | null;
}

/** Splits an interval into the part that falls inside one day, as % of that day. */
function clipToDay(i: IInterval, dayStart: number, dayEnd: number): { left: number; width: number } | null {
  const s = Math.max(i.start, dayStart);
  const e = Math.min(i.end, dayEnd);
  if (e <= s) return null;
  const span = dayEnd - dayStart;
  return { left: ((s - dayStart) / span) * 100, width: ((e - s) / span) * 100 };
}

export function buildTimeline(summary: IScheduleSummary): { rows: ITimelineRow[]; truncated: boolean } {
  const { now, lastEnd, jobs, slot, suggestion } = summary;
  const first = startOfDay(now);
  const lastPoint = Math.max(lastEnd, slot?.end ?? 0, suggestion?.end ?? 0);
  const lastDay = startOfDay(Math.max(now, lastPoint - 1));
  const lastPlanDay = jobs.length ? startOfDay(lastEnd - 1) : null;

  const rows: ITimelineRow[] = [];
  let truncated = false;
  for (let day = first; day <= lastDay; day = addDays(day, 1)) {
    if (rows.length >= MAX_TIMELINE_DAYS) {
      truncated = true;
      break;
    }
    const dayEnd = addDays(day, 1);
    const isToday = day === first;
    const segments: ITimelineSegment[] = [];
    const push = (kind: SegmentKind, i: IInterval, label?: string, title?: string) => {
      const pos = clipToDay(i, day, dayEnd);
      if (pos) segments.push({ kind, ...pos, label, title });
    };

    if (isToday) push('past', { start: day, end: now });
    if (lastPlanDay !== null && day === lastPlanDay) push('open', { start: lastEnd, end: dayEnd }, undefined, 'Open after last plan');

    let jobsToday = 0;
    for (const j of jobs) {
      if (j.end <= day || j.start >= dayEnd) continue;
      jobsToday++;
      const qty = `${(j.job.PlannedQty ?? 0).toLocaleString()}${j.job.UOM ? ' ' + j.job.UOM : ''}`;
      push('job', j, `${j.job.JobNo} · ${j.job.ItemName} (${qty})`, `${j.job.JobNo} · ${j.job.ItemName} · Qty ${qty}`);
      if (slot && j.conflictMs > 0) {
        push('conflict', { start: Math.max(slot.start, j.start), end: Math.min(slot.end, j.end) }, undefined, 'Conflict with your slot');
      }
    }
    if (suggestion) push('suggested', suggestion, 'Suggested', 'Earliest free slot that fits');
    if (slot) push('slot', slot, undefined, 'Your slot');

    rows.push({
      dayStart: day,
      isToday,
      caption: isToday
        ? 'Today'
        : day === lastPlanDay
          ? 'Last plan'
          : jobsToday
            ? `${jobsToday} ${jobsToday === 1 ? 'job' : 'jobs'}`
            : 'Free',
      segments,
      nowPct: isToday ? ((now - day) / (dayEnd - day)) * 100 : null,
    });
  }
  return { rows, truncated };
}
