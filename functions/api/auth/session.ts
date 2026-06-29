const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
    const { request } = context;

    try {
        const { accessToken, refreshToken } = await request.json();

        if (!accessToken) {
            return new Response(JSON.stringify({ message: 'Access token is required.' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        const headers = new Headers();
        for (const [key, val] of Object.entries(CORS_HEADERS)) {
            headers.set(key, val);
        }
        headers.set('Content-Type', 'application/json');

        // Set the secure, HttpOnly cookies for both access and refresh tokens
        headers.append('Set-Cookie', `auth_token=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
        if (refreshToken) {
            headers.append('Set-Cookie', `refresh_token=${refreshToken}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=86400`);
        }

        return new Response(JSON.stringify({ message: 'Session updated successfully.' }), {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error('Session update error:', err);
        return new Response(JSON.stringify({ message: 'An unexpected error occurred.' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
}
