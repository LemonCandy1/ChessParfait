import { createClient } from '@supabase/supabase-js';
import { awardPoints, solvedPuzzlesFor } from '../../_lib/profiles';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

const DIFFICULTY_POINTS: Record<string, number> = {
    'Piece of Cake': 25,
    'Hard Tart': 50,
    'Cherry Bomb': 100,
    'Challenge': 100,
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { week, difficulty, title, answer } = body;

        if (!week || !difficulty) {
            return new Response(JSON.stringify({ message: 'Missing week or difficulty in request.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Only this week's puzzles pay (±1 for time zones; weeks start Monday 2 March 2026, as in TrainingPuzzles.tsx),
        // otherwise any week number could be claimed for unlimited points.
        const serverWeek = Math.floor((Date.now() - Date.parse('2026-03-02T00:00:00Z')) / (7 * 24 * 60 * 60 * 1000)) + 1;
        if (!Number.isInteger(week) || Math.abs(week - serverWeek) > 1 || !(difficulty in DIFFICULTY_POINTS) || (title != null && (typeof title !== 'string' || title.length > 120))) {
            return new Response(JSON.stringify({ message: 'Invalid puzzle.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Parse cookies from Request Headers
        const cookieHeader = request.headers.get('Cookie') || '';
        let token: string | undefined;
        let refreshToken: string | undefined;

        cookieHeader.split(';').forEach((cookie: string) => {
            const parts = cookie.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                if (key === 'auth_token') token = value;
                if (key === 'refresh_token') refreshToken = value;
            }
        });

        if (!token) {
            return new Response(JSON.stringify({ message: 'Unauthorized. Please sign in to earn points.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }

        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken || token
        });

        const user = sessionData?.user;

        if (sessionError || !user) {
            return new Response(JSON.stringify({ message: 'Invalid or expired session. Please log in again.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const currentMetadata = user.user_metadata || {};
        const puzzleId = `week-${week}-${difficulty}`;

        const username = currentMetadata.username || user.email?.split('@')[0] || 'User';

        // Also record the submission in ChallengeAnswers if answer is provided
        if (answer) {
            try {
                await supabaseAdmin.from('ChallengeAnswers').insert([
                    {
                        user_name: username,
                        difficulty: difficulty,
                        answer: answer,
                        week: week,
                        created_at: new Date().toISOString()
                    }
                ]);
            } catch (tableErr) {
                console.error('Failed to insert into ChallengeAnswers:', tableErr);
            }
        }

        // Pays once per puzzle: the ledger refuses a second claim for the same week and difficulty.
        const pointsToAward = DIFFICULTY_POINTS[difficulty] || 25;
        const { awarded, totalPoints } = await awardPoints(supabaseAdmin, user.id, 'puzzle', puzzleId, pointsToAward, {
            week: Number(week),
            difficulty,
            title: title || `${difficulty} (Week ${week})`
        });
        const solvedPuzzles = await solvedPuzzlesFor(supabaseAdmin, user.id);

        if (!awarded) {
            return new Response(JSON.stringify({
                success: true,
                alreadySolved: true,
                pointsAwarded: 0,
                totalPoints,
                solvedPuzzles,
                message: 'Puzzle already solved this week! Points previously claimed.'
            }), {
                status: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            alreadySolved: false,
            pointsAwarded: pointsToAward,
            totalPoints,
            solvedPuzzles,
            message: `+${pointsToAward} Points earned!`
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Solve puzzle API error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred while processing solve.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
