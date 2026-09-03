import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
        const { avatarUrl } = body;

        if (!avatarUrl || typeof avatarUrl !== 'string') {
            return new Response(JSON.stringify({ message: 'Invalid avatar image data.' }), {
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

        const updatedMetadata = {
            ...user.user_metadata,
            avatar_url: avatarUrl,
            picture: avatarUrl
        };

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: updatedMetadata
        });

        if (updateError) {
            console.error('Failed to update avatar in metadata:', updateError);
            return new Response(JSON.stringify({ message: 'Failed to save profile picture.' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Profile picture updated successfully!',
            avatarUrl
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Avatar upload error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context: any) {
    const { request, env } = context;

    try {
        const token = parseAuthCookie(request);
        if (!token) {
            return new Response(JSON.stringify({ message: 'Unauthorized. Please log in.' }), {
                status: 401,
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

        const updatedMetadata = {
            ...user.user_metadata,
            avatar_url: null,
            picture: null
        };

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: updatedMetadata
        });

        if (updateError) {
            console.error('Failed to remove avatar from metadata:', updateError);
            return new Response(JSON.stringify({ message: 'Failed to remove profile picture.' }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Profile picture removed successfully!'
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Avatar delete error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
