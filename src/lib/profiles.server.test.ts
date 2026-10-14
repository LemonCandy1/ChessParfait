import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
    awardPoints,
    clientUser,
    findProfileByUsername,
    solvedPuzzlesFor,
    visibleEmail,
    type ProfileRow
} from '../../functions/_lib/profiles';

/** A chainable stand-in for the Supabase query builder that resolves to `result`. */
function fakeClient(result: { data: unknown; error: unknown }) {
    const calls: { method: string; args: unknown[] }[] = [];
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'select', 'eq', 'order', 'limit', 'maybeSingle', 'rpc']) {
        chain[method] = vi.fn((...args: unknown[]) => {
            calls.push({ method, args });
            return chain;
        });
    }
    chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
    return { client: chain as unknown as SupabaseClient, calls };
}

const profile: ProfileRow = {
    id: 'u1',
    username: 'Magnus',
    email: 'magnus@chessparfait.com',
    real_email: null,
    avatar_url: '/a.png',
    points: 95,
    pawn_stats: { whiteWins: 3, whiteLosses: 1, blackWins: 0, blackLosses: 2 },
    training_plan: 'club',
    created_at: '2026-01-01T00:00:00Z'
};

describe('profiles helpers', () => {
    it('hides the virtual email used by username accounts', () => {
        expect(visibleEmail('magnus@chessparfait.com')).toBeUndefined();
        expect(visibleEmail('magnus@example.com')).toBe('magnus@example.com');
    });

    it('builds the user object the site expects from the profile', () => {
        const user = { id: 'u1', created_at: '2026-01-01', user_metadata: { username: 'old-name', points: 1 } } as unknown as User;
        const result = clientUser(user, profile, [], undefined);
        expect(result).toMatchObject({ id: 'u1', username: 'Magnus', points: 95, avatarUrl: '/a.png', pawnStats: profile.pawn_stats });
    });

    it('pays points through the award_points database function', async () => {
        const { client, calls } = fakeClient({ data: [{ awarded: true, total_points: 115 }], error: null });
        await expect(awardPoints(client, 'u1', 'endgame', 'lucena-position', 20, { title: 'Lucena' }))
            .resolves.toEqual({ awarded: true, totalPoints: 115 });
        expect(calls[0]).toEqual({
            method: 'rpc',
            args: ['award_points', { p_user: 'u1', p_source: 'endgame', p_source_id: 'lucena-position', p_points: 20, p_details: { title: 'Lucena' } }]
        });
    });

    it('reports a repeat claim as not awarded', async () => {
        const { client } = fakeClient({ data: [{ awarded: false, total_points: 95 }], error: null });
        await expect(awardPoints(client, 'u1', 'puzzle', 'week-40-Hard Tart', 50)).resolves.toEqual({ awarded: false, totalPoints: 95 });
    });

    it('looks usernames up through the exact-match database function', async () => {
        const { client, calls } = fakeClient({ data: [profile], error: null });
        await expect(findProfileByUsername(client, '  magnus ')).resolves.toEqual(profile);
        expect(calls[0]).toEqual({ method: 'rpc', args: ['find_profile_by_username', { p_username: 'magnus' }] });
    });

    it('turns ledger rows back into the solved-puzzle list the site uses', async () => {
        const { client } = fakeClient({
            data: [{ source_id: 'week-40-Hard Tart', points: 50, details: { week: 40, difficulty: 'Hard Tart', title: 'Rook lift' }, created_at: '2026-10-02T00:00:00Z' }],
            error: null
        });
        await expect(solvedPuzzlesFor(client, 'u1')).resolves.toEqual([
            { id: 'week-40-Hard Tart', week: 40, difficulty: 'Hard Tart', title: 'Rook lift', points: 50, solvedAt: '2026-10-02T00:00:00Z' }
        ]);
    });

    it('surfaces database errors instead of hiding them', async () => {
        const { client } = fakeClient({ data: null, error: new Error('boom') });
        await expect(awardPoints(client, 'u1', 'puzzle', 'x', 1)).rejects.toThrow('boom');
    });
});
