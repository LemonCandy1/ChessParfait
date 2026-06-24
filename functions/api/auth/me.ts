import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context: any) {
    const { request, env } = context;

    try {
        // Parse cookies from Request Headers
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
                const parts = c.trim().split('=');
                return [parts[0], parts.slice(1).join('=')];
            })
        );
        const token = cookies['auth_token'];
        const refreshToken = cookies['refresh_token'];

        if (!token) {
            return new Response(JSON.stringify({ message: 'No session token found.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Initialize Supabase Client
        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        // Set session in client internal memory using setSession.
        // If the access token is expired but we have the refreshToken, Supabase will auto-refresh it.
        const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken || token
        });

        const user = data?.user;
        const finalSession = data?.session;

        if (sessionError || !user) {
            return new Response(JSON.stringify({ message: 'Invalid or expired session token.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
        const userEmail = user.email && !user.email.endsWith('@chessparfait.com') ? user.email : undefined;

        const headers = new Headers();
        for (const [key, val] of Object.entries(CORS_HEADERS)) {
            headers.set(key, val);
        }
        headers.set('Content-Type', 'application/json');

        // If the token was refreshed, update the cookies in the response
        if (finalSession && finalSession.access_token !== token) {
            headers.append('Set-Cookie', `auth_token=${finalSession.access_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
            if (finalSession.refresh_token) {
                headers.append('Set-Cookie', `refresh_token=${finalSession.refresh_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
            }
        }

        return new Response(JSON.stringify({
            user: {
                username,
                email: userEmail
            }
        }), {
            status: 200,
            headers
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ message: err.message || 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
