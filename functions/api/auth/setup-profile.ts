import { createClient } from '@supabase/supabase-js';
import { UNIQUE_VIOLATION, findProfileByUsername, getProfile, loadClientUser, updateProfile } from '../../_lib/profiles';

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
        const { username } = await request.json();

        if (!username || typeof username !== 'string' || username.trim().length < 3) {
            return new Response(JSON.stringify({ message: 'Username must be at least 3 characters long.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const trimmedUser = username.trim();
        const cookieHeader = request.headers.get('Cookie');
        
        let token = undefined;
        if (cookieHeader) {
            cookieHeader.split(';').forEach((cookie: string) => {
                const parts = cookie.split('=');
                if (parts.length >= 2 && parts[0].trim() === 'auth_token') {
                    token = parts.slice(1).join('=').trim();
                }
            });
        }

        if (!token) {
            return new Response(JSON.stringify({ message: 'Unauthorized. Please sign in again.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }

        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(JSON.stringify({ message: 'Invalid session.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // Usernames are unique regardless of case, across every account (profiles has them all).
        const owner = await findProfileByUsername(supabaseAdmin, trimmedUser);
        const taken = () => new Response(JSON.stringify({ message: 'Username is already taken.' }), {
            status: 409,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
        if (owner && owner.id !== user.id) return taken();

        await getProfile(supabaseAdmin, user);
        try {
            await updateProfile(supabaseAdmin, user.id, { username: trimmedUser });
        } catch (err) {
            // Someone claimed it between the check and the update; the unique index catches that.
            if ((err as { code?: string }).code === UNIQUE_VIOLATION) return taken();
            throw err;
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                username: trimmedUser,
                display_name: trimmedUser,
                name: trimmedUser
            }
        });

        if (updateError) {
            return new Response(JSON.stringify({ message: updateError.message }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const { user: payload } = await loadClientUser(supabaseAdmin, user, user.email);

        return new Response(JSON.stringify({
            message: 'Profile updated successfully!',
            user: { ...payload, username: trimmedUser }
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Setup profile error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
