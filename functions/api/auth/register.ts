import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { username, password } = await request.json();

        // Input validation
        if (!username || typeof username !== 'string' || username.trim().length < 3) {
            return new Response(JSON.stringify({ message: 'Username must be at least 3 characters long.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
        if (!password || typeof password !== 'string' || password.length < 4) {
            return new Response(JSON.stringify({ message: 'Password must be at least 4 characters long.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const trimmedUser = username.trim();

        if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }

        // Use Admin API with service role key to bypass email confirmation rate limit
        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const email = `${trimmedUser.toLowerCase()}@chessparfait.com`;

        // Use admin createUser to auto-confirm and skip email entirely
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { 
                username: trimmedUser,
                display_name: trimmedUser,
                name: trimmedUser
            }
        });

        if (error) {
            // Handle duplicate username gracefully
            if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('duplicate')) {
                return new Response(JSON.stringify({ message: 'Username is already taken.' }), {
                    status: 409,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({ message: error.message }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ message: 'Account registered successfully!' }), {
            status: 201,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ message: err.message || 'An unexpected error occurred during registration.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
