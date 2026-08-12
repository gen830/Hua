/**
 * Lightweight SM-2-style scheduling for vocabulary review.
 * No external APIs — pure date math for offline-friendly review sessions.
 */

export type SrsGrade = 'again' | 'good'

export type SrsState = {
  dueAt: number
  intervalDays: number
  ease: number
  repetitions: number
  lastReviewedAt: number | null
}

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
export const MASTERED_INTERVAL_DAYS = 21

/** New / never-reviewed card: due immediately. */
export function initialSrsState(now = Date.now()): SrsState {
  return {
    dueAt: now,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    repetitions: 0,
    lastReviewedAt: null,
  }
}

export function isDue(state: Pick<SrsState, 'dueAt'>, now = Date.now()): boolean {
  return state.dueAt <= now
}

function addDays(fromMs: number, days: number): number {
  const d = new Date(fromMs)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

function addMinutes(fromMs: number, minutes: number): number {
  return fromMs + minutes * 60_000
}

/**
 * Apply a review grade and return the next SRS state.
 * - again: short retry (10 min), reset streak, ease −0.2
 * - good: graduate intervals 1d → 3d → ease×interval
 */
export function applySrsGrade(
  state: SrsState,
  grade: SrsGrade,
  now = Date.now(),
): SrsState {
  if (grade === 'again') {
    return {
      dueAt: addMinutes(now, 10),
      intervalDays: 0,
      ease: Math.max(MIN_EASE, Number((state.ease - 0.2).toFixed(2))),
      repetitions: 0,
      lastReviewedAt: now,
    }
  }

  let intervalDays: number
  if (state.repetitions === 0) {
    intervalDays = 1
  } else if (state.repetitions === 1) {
    intervalDays = 3
  } else {
    intervalDays = Math.max(1, Math.round(state.intervalDays * state.ease))
  }

  return {
    dueAt: addDays(now, intervalDays),
    intervalDays,
    ease: Number(Math.min(3.0, state.ease + 0.05).toFixed(2)),
    repetitions: state.repetitions + 1,
    lastReviewedAt: now,
  }
}

/** Prefer keeping `reviewing` until interval reaches the mastered threshold. */
export function statusAfterSrs(
  next: Pick<SrsState, 'intervalDays'>,
  currentStatus: 'reviewing' | 'mastered',
): 'reviewing' | 'mastered' {
  if (next.intervalDays >= MASTERED_INTERVAL_DAYS) return 'mastered'
  if (currentStatus === 'mastered' && next.intervalDays < MASTERED_INTERVAL_DAYS) {
    return 'reviewing'
  }
  return currentStatus
}
