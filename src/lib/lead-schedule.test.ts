import { describe, it, expect } from 'vitest'
import {
  currentSlotMark, nextSlotAt, currentIntervalMark, nextIntervalAt,
  weekAnchor, isWeekStale,
} from './lead-schedule'

const SLOTS = [0, 5, 10, 15, 20]
const ms = (iso: string) => new Date(iso).getTime()
const DAY = 86400000

describe('currentSlotMark', () => {
  it('returns todays 10:00 slot at 12:30', () => {
    expect(currentSlotMark(ms('2026-07-05T12:30:00Z'), SLOTS)).toBe(ms('2026-07-05T10:00:00Z'))
  })
  it('is inclusive at the slot instant', () => {
    expect(currentSlotMark(ms('2026-07-05T15:00:00Z'), SLOTS)).toBe(ms('2026-07-05T15:00:00Z'))
  })
  it('returns todays 20:00 slot late at night', () => {
    expect(currentSlotMark(ms('2026-07-05T23:59:00Z'), SLOTS)).toBe(ms('2026-07-05T20:00:00Z'))
  })
  it('returns midnight slot just after midnight', () => {
    expect(currentSlotMark(ms('2026-07-05T00:10:00Z'), SLOTS)).toBe(ms('2026-07-05T00:00:00Z'))
  })
})

describe('nextSlotAt', () => {
  it('returns todays 15:00 at 12:30', () => {
    expect(nextSlotAt(ms('2026-07-05T12:30:00Z'), SLOTS)).toBe(ms('2026-07-05T15:00:00Z'))
  })
  it('rolls to tomorrow 00:00 after the last slot', () => {
    expect(nextSlotAt(ms('2026-07-05T20:30:00Z'), SLOTS)).toBe(ms('2026-07-06T00:00:00Z'))
  })
  it('is strictly future at the slot instant', () => {
    expect(nextSlotAt(ms('2026-07-05T15:00:00Z'), SLOTS)).toBe(ms('2026-07-05T20:00:00Z'))
  })
})

describe('interval helpers preserve existing behaviour', () => {
  const FIVE_H = 5 * 3600000
  it('currentIntervalMark floors to the epoch-aligned boundary', () => {
    const now = ms('2026-07-05T12:30:00Z')
    expect(currentIntervalMark(now, FIVE_H)).toBe(Math.floor(now / FIVE_H) * FIVE_H)
  })
  it('nextIntervalAt is one boundary ahead', () => {
    const now = ms('2026-07-05T12:30:00Z')
    expect(nextIntervalAt(now, FIVE_H)).toBe((Math.floor(now / FIVE_H) + 1) * FIVE_H)
  })
})

describe('weekAnchor', () => {
  it('returns the Monday for a mid-week day', () => {
    // 2024-01-03 is a Wednesday; its weeks Monday is 2024-01-01
    expect(weekAnchor(ms('2024-01-03T12:00:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
  it('returns itself at Monday 00:00', () => {
    expect(weekAnchor(ms('2024-01-01T00:00:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
  it('returns the same Monday on Sunday night', () => {
    // 2024-01-07 is a Sunday
    expect(weekAnchor(ms('2024-01-07T23:59:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
})

describe('isWeekStale', () => {
  const anchor = ms('2024-01-01T00:00:00Z')
  it('is stale when anchor is null', () => {
    expect(isWeekStale(null, anchor)).toBe(true)
  })
  it('is not stale within the week', () => {
    expect(isWeekStale(anchor, anchor + 3 * DAY)).toBe(false)
  })
  it('is stale at exactly 7 days', () => {
    expect(isWeekStale(anchor, anchor + 7 * DAY)).toBe(true)
  })
})
