import { avatarPath, getAdminClient, json } from '../../_lib/community';

const LEADERBOARD_SIZE = 50;

// Public leaderboard of users ranked by points. Points live in auth user_metadata,
// so this reads users with the service-role key and returns only public fields.
export async function onRequestGet(context: any) {
    const { env } = context;

    try {
        const admin = getAdminClient(env);
        const entries: { id: string; username: string; avatarUrl: string | null; points: number; puzzlesSolved: number }[] = [];

        const perPage = 1000;
        for (let page = 1; ; page++) {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
            if (error) throw error;

            for (const user of data.users) {
                const meta = user.user_metadata || {};
                const points = typeof meta.points === 'number' ? meta.points : 0;
                if (points <= 0 || !meta.username) continue;
                entries.push({
                    id: user.id,
                    username: meta.username,
                    avatarUrl: avatarPath(user),
                    points,
                    puzzlesSolved: Array.isArray(meta.solved_puzzles) ? meta.solved_puzzles.length : 0,
                });
            }

            if (data.users.length < perPage) break;
        }

        entries.sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));

        return json(
            { leaderboard: entries.slice(0, LEADERBOARD_SIZE) },
            200,
            { 'Cache-Control': 'public, max-age=60' }
        );
    } catch (err) {
        console.error('Leaderboard API error:', err);
        return json({ message: 'Could not load the leaderboard.' }, 500);
    }
}
