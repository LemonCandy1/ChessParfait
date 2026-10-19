import { describe, expect, it } from 'vitest';
import { findPlan } from '../data/trainingPlans';
import {
    addDays,
    currentStreak,
    isDayComplete,
    isLoggableDay,
    isRestDay,
    minutesFor,
    rewardForFinishedDay,
    sanitiseItems,
    streakEndingOn
} from './training';

const club = findPlan('club')!;
const required = club.items.filter(i => i.required).map(i => i.id);

describe('checklist', () => {
    it('drops unknown or duplicate items and keeps plan order', () => {
        expect(sanitiseItems(club, ['games', 'bogus', 'warmup', 'games'])).toEqual(['warmup', 'games']);
        expect(sanitiseItems(club, 'not-an-array')).toEqual([]);
    });

    it('finishes the day only when every required item is ticked', () => {
        expect(isDayComplete(club, required)).toBe(true);
        expect(isDayComplete(club, required.slice(1))).toBe(false);
        expect(isDayComplete(club, required.filter(id => id !== 'games').concat('openings'))).toBe(false);
    });

    it('adds up the minutes of ticked items', () => {
        expect(minutesFor(club, required)).toBe(130); // 20 + 40 + 30 + 40, as in the sample plan
        expect(minutesFor(club, [...required, 'openings'])).toBe(160);
    });
});

describe('dates', () => {
    it('does calendar arithmetic across month and year ends', () => {
        expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
        expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('accepts only the days a user could locally call today', () => {
        const now = new Date('2026-10-09T23:30:00Z'); // already 10 October in Melbourne
        expect(isLoggableDay('2026-10-10', now)).toBe(true);
        expect(isLoggableDay('2026-10-09', now)).toBe(true);
        expect(isLoggableDay('2026-10-08', now)).toBe(true);
        expect(isLoggableDay('2026-10-07', now)).toBe(false);
        expect(isLoggableDay('2026-10-11', now)).toBe(false);
        expect(isLoggableDay('2026-13-40', now)).toBe(false);
    });
});

describe('streaks and rewards', () => {
    // Sat 3, Sun 4, Mon 5 finished; Tue 6 missed (that week's rest day); Wed 7, Thu 8 finished.
    const finished = new Set(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-07', '2026-10-08']);

    it('counts finished days, bridging one rest day a week', () => {
        expect(streakEndingOn(finished, '2026-10-08')).toBe(5);
        expect(streakEndingOn(finished, '2026-10-05')).toBe(3);
        expect(streakEndingOn(finished, '2026-10-06')).toBe(3);
    });

    it('keeps the streak alive until today is over, and breaks on a second miss in a week', () => {
        expect(currentStreak(finished, '2026-10-09')).toBe(5);
        expect(currentStreak(finished, '2026-10-10')).toBe(0);
    });

    it('gives each Monday-to-Sunday week its own rest day', () => {
        // Mon 5 to Sat 10 finished, Sun 11 and Mon 12 missed (one per week), Tue 13 finished.
        const days = new Set(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-13']);
        expect(streakEndingOn(days, '2026-10-13')).toBe(7);
        expect(isRestDay(days, '2026-10-11')).toBe(true);
        expect(isRestDay(days, '2026-10-12')).toBe(true);
    });

    it('only calls a missed day a rest day when it was the first miss inside a streak', () => {
        expect(isRestDay(finished, '2026-10-06')).toBe(true);
        expect(isRestDay(finished, '2026-10-09')).toBe(false);
        expect(isRestDay(finished, '2026-10-02')).toBe(false);
        expect(isRestDay(finished, '2026-10-05')).toBe(false);
    });

    it('pays the daily points plus a bonus every 7th finished day', () => {
        expect(rewardForFinishedDay(1)).toEqual({ daily: 10, bonus: 0, total: 10 });
        expect(rewardForFinishedDay(7)).toEqual({ daily: 10, bonus: 25, total: 35 });
        expect(rewardForFinishedDay(14).bonus).toBe(25);
        expect(rewardForFinishedDay(8).bonus).toBe(0);
    });
});
