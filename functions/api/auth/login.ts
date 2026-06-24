import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
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
        const { username, password } = await request.json();

        if (!username || !password) {
            return new Response(JSON.stringify({ message: 'Username and password are required.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const trimmedUser = username.trim();

        // Initialize Supabase Client
        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

        // Map to virtual email domain
        const email = `${trimmedUser.toLowerCase()}@chessparfait.com`;

        // Authenticate with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Defend against user enumeration by returning generic error message
            return new Response(JSON.stringify({ message: 'Invalid username or password.' }), {
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

        // Auto-heal metadata for older users to ensure display_name shows up in Supabase dashboard
        if (env.SUPABASE_SERVICE_ROLE_KEY && data.user && (!data.user.user_metadata?.display_name || !data.user.user_metadata?.name)) {
            try {
                const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
                await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
                    user_metadata: {
                        ...data.user.user_metadata,
                        display_name: data.user.user_metadata?.username || trimmedUser,
                        name: data.user.user_metadata?.username || trimmedUser
                    }
                });
            } catch (metadataErr) {
                console.error('Failed to update metadata during login:', metadataErr);
            }
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

        const userEmail = data.user.email && !data.user.email.endsWith('@chessparfait.com') ? data.user.email : undefined;

        return new Response(JSON.stringify({
            message: 'Logged in successfully.',
            user: {
                username: data.user.user_metadata?.username || trimmedUser,
                email: userEmail
            }
        }), {
            status: 200,
            headers
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ message: err.message || 'An unexpected error occurred during login.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
