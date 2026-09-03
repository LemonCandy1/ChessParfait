import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

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

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const token = parseAuthCookie(request);
        if (!token) {
            return new Response(JSON.stringify({ message: 'Unauthorized. Please log in.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const body = await request.json();
        const { color, result } = body; // color: 'white' | 'black', result: 'win' | 'loss'

        if ((color !== 'white' && color !== 'black') || (result !== 'win' && result !== 'loss')) {
            return new Response(JSON.stringify({ message: 'Invalid color or result parameter.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configuration in environment.');
        }

        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(JSON.stringify({ message: 'Invalid or expired session.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const currentPawnStats = user.user_metadata?.pawn_stats || {
            whiteWins: 0,
            whiteLosses: 0,
            blackWins: 0,
            blackLosses: 0
        };

        const updatedStats = {
            whiteWins: typeof currentPawnStats.whiteWins === 'number' ? currentPawnStats.whiteWins : 0,
            whiteLosses: typeof currentPawnStats.whiteLosses === 'number' ? currentPawnStats.whiteLosses : 0,
            blackWins: typeof currentPawnStats.blackWins === 'number' ? currentPawnStats.blackWins : 0,
            blackLosses: typeof currentPawnStats.blackLosses === 'number' ? currentPawnStats.blackLosses : 0
        };

        if (color === 'white') {
            if (result === 'win') updatedStats.whiteWins += 1;
            else updatedStats.whiteLosses += 1;
        } else {
            if (result === 'win') updatedStats.blackWins += 1;
            else updatedStats.blackLosses += 1;
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                pawn_stats: updatedStats
            }
        });

        if (updateError) {
            console.error('Failed to update pawn stats in metadata:', updateError);
            return new Response(JSON.stringify({ message: 'Failed to record pawn game stats.' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Pawn game record updated!',
            pawnStats: updatedStats
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Pawn game record error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
