import { createClient } from '@supabase/supabase-js';
import endgames from '../../../src/data/endgames.json';
import { pointsForDifficulty } from '../../../src/lib/endgameRewards';
import { awardPoints } from '../../_lib/profiles';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

interface Env {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
}

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

function parseAuthCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.get('Cookie') || '';
    let token: string | undefined;
    cookieHeader.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        if (parts.length >= 2 && parts[0].trim() === 'auth_token') {
            token = parts.slice(1).join('=').trim();
        }
    });
    return token;
}

/**
 * Records the first completion of an endgame drill and awards its points once per account.
 * The reward is looked up from the endgame's difficulty on the server, never taken from the client.
 */
export async function onRequestPost(context: { request: Request; env: Env }) {
    const { request, env } = context;

    try {
        const token = parseAuthCookie(request);
        if (!token) return json({ message: 'Unauthorized. Please sign in to earn points.' }, 401);

        const { endgameId } = await request.json();
        const endgame = (endgames as { id: string; title: string; difficulty: string }[]).find(e => e.id === endgameId);
        if (!endgame) return json({ message: 'Unknown endgame.' }, 400);

        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configuration in environment.');
        }

        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return json({ message: 'Invalid or expired session. Please log in again.' }, 401);

        // Pays once per endgame: the ledger refuses a second claim for the same endgame.
        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const pointsAwarded = pointsForDifficulty(endgame.difficulty);
        const { awarded, totalPoints } = await awardPoints(supabaseAdmin, user.id, 'endgame', endgame.id, pointsAwarded, {
            title: endgame.title,
            difficulty: endgame.difficulty
        });

        if (!awarded) {
            return json({
                success: true,
                alreadyCompleted: true,
                pointsAwarded: 0,
                totalPoints,
                message: 'Endgame already completed. Points were awarded the first time.'
            });
        }

        return json({
            success: true,
            alreadyCompleted: false,
            pointsAwarded,
            totalPoints,
            message: `+${pointsAwarded} points earned!`
        });
    } catch (err) {
        console.error('Complete endgame API error:', err);
        return json({ message: 'An unexpected error occurred while recording the endgame.' }, 500);
    }
}
