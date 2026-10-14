import { describe, expect, it } from 'vitest';
import { findPlan } from '../data/trainingPlans';
import {
    addDays,
    currentStreak,
    isDayComplete,
    isLoggableDay,
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
    const finished = new Set(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-07', '2026-10-08']);

    it('counts consecutive finished days', () => {
        expect(streakEndingOn(finished, '2026-10-08')).toBe(2);
        expect(streakEndingOn(finished, '2026-10-05')).toBe(3);
        expect(streakEndingOn(finished, '2026-10-06')).toBe(0);
    });

    it('keeps the streak alive until today is over', () => {
        expect(currentStreak(finished, '2026-10-09')).toBe(2);
        expect(currentStreak(finished, '2026-10-10')).toBe(0);
    });

    it('pays the daily points plus a bonus every 7th day in a row', () => {
        expect(rewardForFinishedDay(1)).toEqual({ daily: 30, bonus: 0, total: 30 });
        expect(rewardForFinishedDay(7)).toEqual({ daily: 30, bonus: 50, total: 80 });
        expect(rewardForFinishedDay(14).bonus).toBe(50);
        expect(rewardForFinishedDay(8).bonus).toBe(0);
    });
});
