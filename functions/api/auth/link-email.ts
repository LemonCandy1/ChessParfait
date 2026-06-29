import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

function parseCookies(cookieHeader: string): Record<string, string> {
    return Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const parts = c.trim().split('=');
            return [parts[0], parts.slice(1).join('=')];
        })
    );
}

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { email: newEmail } = await request.json();

        // Validate the email format
        if (!newEmail || typeof newEmail !== 'string') {
            return new Response(JSON.stringify({ message: 'Email address is required.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            return new Response(JSON.stringify({ message: 'Please enter a valid email address.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
        if (newEmail.trim().endsWith('@chessparfait.com')) {
            return new Response(JSON.stringify({ message: 'Please use a real email address.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Extract auth token and refresh token from cookies
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = parseCookies(cookieHeader);
        const token = cookies['auth_token'];
        const refreshToken = cookies['refresh_token'];

        if (!token) {
            return new Response(JSON.stringify({ message: 'You must be logged in to link an email.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }

        // Verify the logged-in user via their session token using the Supabase SDK
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        // Set session using the real refresh token
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken || token
        });

        const user = sessionData?.user;
        const finalSession = sessionData?.session;

        if (sessionError || !user) {
            return new Response(JSON.stringify({ message: 'Invalid or expired session.' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Call the official SDK updateUser method to trigger the confirmation email.
        const redirectTo = env.SITE_URL
            ? `${env.SITE_URL}`
            : 'http://localhost:5173';

        const { data: updateData, error: updateError } = await supabase.auth.updateUser(
            { email: newEmail.trim() },
            { emailRedirectTo: redirectTo }
        );

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

        if (updateError) {
            return new Response(JSON.stringify({ message: updateError.message }), {
                status: 400,
                headers
            });
        }

        const updatedUser = updateData.user;

        // Also store the pending email in user metadata for password reset lookups
        if (env.SUPABASE_SERVICE_ROLE_KEY && updatedUser?.id) {
            const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            await supabaseAdmin.auth.admin.updateUserById(updatedUser.id, {
                user_metadata: {
                    ...updatedUser.user_metadata,
                    real_email: newEmail.trim()
                }
            });
        }

        return new Response(JSON.stringify({
            message: `A confirmation email has been sent to ${newEmail.trim()}. Please click the link in that email to confirm and activate it.`
        }), {
            status: 200,
            headers
        });

    } catch (err: any) {
        console.error('Link email error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
