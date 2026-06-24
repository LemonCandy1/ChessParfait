const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions() {
    return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost() {
    const headers = new Headers();
    for (const [key, val] of Object.entries(CORS_HEADERS)) {
        headers.set(key, val);
    }
    headers.set('Content-Type', 'application/json');

    // Clear both secure cookies by setting Max-Age=0
    headers.append('Set-Cookie', `auth_token=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`);
    headers.append('Set-Cookie', `refresh_token=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`);

    return new Response(JSON.stringify({ message: 'Logged out successfully.' }), {
        status: 200,
        headers
    });
}
