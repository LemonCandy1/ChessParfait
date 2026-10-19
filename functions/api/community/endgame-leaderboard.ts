import { getAdminClient, json, type SupabaseEnv } from '../../_lib/community';

// Public endgame rating leaderboard: the top 50 by endgame trainer rating among players with at least
// 20 positions, read from the public.endgame_leaderboard view (see the 20261021 migration).
export async function onRequestGet(context: { env: SupabaseEnv }) {
    const { env } = context;
    try {
        const { data, error } = await getAdminClient(env).from('endgame_leaderboard').select('id, username, has_avatar, endgame_rating, endgame_played');
        if (error) throw error;

        const entries = (data ?? []).map((row: { id: string; username: string; has_avatar: boolean; endgame_rating: number; endgame_played: number }) => ({
            id: row.id,
            username: row.username,
            avatarUrl: row.has_avatar ? `/api/community/avatar/${row.id}` : null,
            rating: row.endgame_rating,
            played: row.endgame_played,
        }));

        return json({ leaderboard: entries }, 200, { 'Cache-Control': 'public, max-age=60' });
    } catch (err) {
        console.error('Endgame leaderboard API error:', err);
        return json({ message: 'Could not load the endgame leaderboard.' }, 500);
    }
}
