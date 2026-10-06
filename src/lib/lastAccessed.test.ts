import { beforeEach, describe, expect, it } from 'vitest';
import { readLastAccessed, timeAgo, writeLastAccessed } from './lastAccessed';

describe('last accessed storage', () => {
    beforeEach(() => localStorage.clear());

    it('keeps a separate record for each user', () => {
        writeLastAccessed('practice', 'alice', { endgameId: 'lucena-position', at: 1 });
        writeLastAccessed('practice', 'bob', { endgameId: 'philidor-defense', at: 2 });

        expect(readLastAccessed('practice', 'alice')?.endgameId).toBe('lucena-position');
        expect(readLastAccessed('practice', 'bob')?.endgameId).toBe('philidor-defense');
        expect(readLastAccessed('practice', null)).toBeNull();
    });

    it('stores practice and strategy separately', () => {
        writeLastAccessed('strategy', 'alice', { topicId: 'vancura-defense', title: 'The Vancura Defense', step: 3, totalSteps: 12, at: 1 });

        expect(readLastAccessed('practice', 'alice')).toBeNull();
        expect(readLastAccessed('strategy', 'alice')?.step).toBe(3);
    });

    it('ignores corrupt data', () => {
        localStorage.setItem('chessparfait_last_practice_alice', '{not json');
        expect(readLastAccessed('practice', 'alice')).toBeNull();
    });
});

describe('timeAgo', () => {
    const now = 1_000_000_000_000;
    it('formats recent and older times', () => {
        expect(timeAgo(now - 10_000, now)).toBe('just now');
        expect(timeAgo(now - 60_000, now)).toBe('1 minute ago');
        expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 hours ago');
        expect(timeAgo(now - 30 * 3_600_000, now)).toBe('yesterday');
        expect(timeAgo(now - 5 * 86_400_000, now)).toBe('5 days ago');
    });
});
