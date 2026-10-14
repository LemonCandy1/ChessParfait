import { getAdminClient, json, type SupabaseEnv } from '../../_lib/community';

// Public leaderboard: the top 50 players by points, read from the indexed public.leaderboard view
// (see the 20261010 migration), so it costs the same with 50 players or 500,000.
export async function onRequestGet(context: { env: SupabaseEnv }) {
    const { env } = context;

    try {
        const admin = getAdminClient(env);
        const { data, error } = await admin.from('leaderboard').select('id, username, has_avatar, points, puzzles_solved');
        if (error) throw error;

        const entries = (data ?? []).map((row: { id: string; username: string; has_avatar: boolean; points: number; puzzles_solved: number }) => ({
            id: row.id,
            username: row.username,
            avatarUrl: row.has_avatar ? `/api/community/avatar/${row.id}` : null,
            points: row.points,
            puzzlesSolved: row.puzzles_solved,
        }));

        return json(
            { leaderboard: entries },
            200,
            { 'Cache-Control': 'public, max-age=60' }
        );
    } catch (err) {
        console.error('Leaderboard API error:', err);
        return json({ message: 'Could not load the leaderboard.' }, 500);
    }
}
