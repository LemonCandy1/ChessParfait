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

        let session = data?.session;
        let authUser = data?.user;

        // If signInWithIdToken failed (e.g. Supabase dashboard provider config error), fallback to direct Google verification
        if (error || !session || !authUser) {
            console.warn('Supabase signInWithIdToken failed, attempting server-side Google token verification fallback:', error?.message);

            if (!env.SUPABASE_SERVICE_ROLE_KEY) {
                return new Response(JSON.stringify({ 
                    message: error?.message || 'Google authentication failed. Please check Supabase Google provider configuration.' 
                }), {
                    status: 401,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            // Verify Google ID Token directly with Google's tokeninfo endpoint
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
            if (!googleRes.ok) {
                const errText = await googleRes.text();
                console.error('Google token verification failed:', errText);
                return new Response(JSON.stringify({ message: 'Invalid or expired Google credential.' }), {
                    status: 401,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            const googleUser = await googleRes.json() as {
                email?: string;
                email_verified?: string | boolean;
                name?: string;
                picture?: string;
                sub?: string;
            };

            if (!googleUser.email || (googleUser.email_verified !== 'true' && googleUser.email_verified !== true)) {
                return new Response(JSON.stringify({ message: 'Google account email is unverified.' }), {
                    status: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

            // Find or create user in Supabase
            const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
            let targetUser = usersList?.users.find((u) => u.email?.toLowerCase() === googleUser.email!.toLowerCase());

            if (!targetUser) {
                const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: googleUser.email,
                    email_confirm: true,
                    user_metadata: {
                        name: googleUser.name,
                        full_name: googleUser.name,
                        avatar_url: googleUser.picture,
                        google_id: googleUser.sub
                    }
                });

                if (createError || !createdUser.user) {
                    console.error('Failed to create Supabase user:', createError);
                    return new Response(JSON.stringify({ message: createError?.message || 'Failed to initialize account.' }), {
                        status: 500,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                    });
                }
                targetUser = createdUser.user;
            }

            // Generate authentication token / link for session
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: googleUser.email
            });

            if (linkError || !linkData?.properties?.hashed_token) {
                console.error('Failed to generate auth token link:', linkError);
                return new Response(JSON.stringify({ message: 'Failed to create session.' }), {
                    status: 500,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                });
            }

            // Verify the hashed token to obtain full valid session cookies
            const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
                token_hash: linkData.properties.hashed_token,
                type: 'magiclink'
            });

            if (otpError || !otpData?.session) {
                // Try type: 'email' as alternative
                const { data: emailOtpData, error: emailOtpError } = await supabase.auth.verifyOtp({
                    token_hash: linkData.properties.hashed_token,
                    type: 'email'
                });

                if (emailOtpError || !emailOtpData?.session) {
                    console.error('OTP verification failed:', otpError || emailOtpError);
                    return new Response(JSON.stringify({ message: 'Session initialization failed.' }), {
                        status: 500,
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
                    });
                }
                session = emailOtpData.session;
                authUser = emailOtpData.user || targetUser;
            } else {
                session = otpData.session;
                authUser = otpData.user || targetUser;
            }
        }

        if (!session || !authUser) {
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

        const username = authUser.user_metadata?.username;
        const needsProfileSetup = !username;
        const points = typeof authUser.user_metadata?.points === 'number' ? authUser.user_metadata.points : 0;
        const solvedPuzzles = Array.isArray(authUser.user_metadata?.solved_puzzles) ? authUser.user_metadata.solved_puzzles : [];

        return new Response(JSON.stringify({
            message: 'Logged in successfully.',
            needsProfileSetup,
            user: {
                id: authUser.id,
                username: username || '',
                email: authUser.email,
                createdAt: authUser.created_at,
                points,
                solvedPuzzles
            }
        }), {
            status: 200,
            headers
        });
    } catch (err: unknown) {
        console.error('Google auth error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred during Google login.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
