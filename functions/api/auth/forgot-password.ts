import { createClient } from '@supabase/supabase-js';
import { VIRTUAL_EMAIL_DOMAIN, findProfileByEmail, findProfileByUsername } from '../../_lib/profiles';

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const { username, email } = await request.json();

        if (!username && !email) {
            return new Response(JSON.stringify({ message: 'Please provide a username or email address.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase configurations in env.');
        }

        const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        let resetEmail: string | null = null;

        if (email) {
            // User provided their real linked email directly — use it
            resetEmail = email.trim();
        } else if (username) {
            // Look up by username: find user whose virtual email starts with the username
            // Also matches the username itself (accounts created with Google have a different email)
            const trimmedUser = username.trim().toLowerCase();
            const virtualEmail = `${trimmedUser}@chessparfait.com`;

            // Profiles hold every account's username and email, so this is an indexed lookup.
            const match = (await findProfileByUsername(supabaseAdmin, trimmedUser)) ?? (await findProfileByEmail(supabaseAdmin, virtualEmail));

            if (!match) {
                // Return generic message to prevent username enumeration
                return new Response(JSON.stringify({
                    message: 'If a matching account with a linked email was found, a reset link has been sent.'
                }), {
                    status: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            // Check if user has a real linked email or only the virtual one
            const realEmail = match.real_email || match.email;
            if (!realEmail || realEmail.endsWith(VIRTUAL_EMAIL_DOMAIN)) {
                // Return generic message to prevent username enumeration and email status leakage
                return new Response(JSON.stringify({
                    message: 'If a matching account with a linked email was found, a reset link has been sent.'
                }), {
                    status: 200,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            resetEmail = realEmail;
        }

        if (!resetEmail) {
            return new Response(JSON.stringify({ message: 'Could not determine the email address for this account.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Send the official Supabase password reset email
        const redirectTo = env.SITE_URL
            ? `${env.SITE_URL}/reset-password`
            : 'http://localhost:5173/reset-password';

        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(resetEmail, {
            redirectTo
        });

        if (error) {
            return new Response(JSON.stringify({ message: error.message }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: 'If a matching account was found, a password reset link has been sent to your email.'
        }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Forgot password error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
