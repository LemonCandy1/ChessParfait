import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { credential } = await request.json();

        if (!credential) {
            return new Response(JSON.stringify({ message: 'Missing Google credential.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }
        
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

        // Authenticate with Supabase using the Google ID Token
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
        });

        if (error) {
            return new Response(JSON.stringify({ message: error.message }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const session = data.session;
        if (!session) {
            return new Response(JSON.stringify({ message: 'Authentication failed. Session could not be created.' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const headers = new Headers();
        for (const [key, val] of Object.entries(CORS_HEADERS)) {
            headers.set(key, val);
        }
        headers.set('Content-Type', 'application/json');

        // Set the secure, HttpOnly cookies containing the access and refresh tokens
        headers.append('Set-Cookie', `auth_token=${session.access_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
        if (session.refresh_token) {
            headers.append('Set-Cookie', `refresh_token=${session.refresh_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
        }

        const username = data.user.user_metadata?.username;
        const needsProfileSetup = !username;

        return new Response(JSON.stringify({
            message: 'Logged in successfully.',
            needsProfileSetup,
            user: {
                username: username || '',
                email: data.user.email
            }
        }), {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error('Google auth error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred during Google login.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
