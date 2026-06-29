export async function onRequest(context: any) {
    const { request, env, next } = context;
    const origin = request.headers.get('Origin') || '';
    
    // Allowed origins (production domain and local dev server)
    const allowedOrigins = [
        env.SITE_URL, 
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8788'
    ].filter(Boolean);

    // Default to the first allowed origin if no match (or if it's a same-origin request without an Origin header)
    const allowOrigin = allowedOrigins.includes(origin) ? origin : (env.SITE_URL || 'http://localhost:5173');

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Continue to the actual endpoint
        const response = await next();

        // Append CORS headers to the response
        const newHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
            newHeaders.set(key, value);
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
        });
    } catch (err) {
        // Global error handler for unhandled backend exceptions
        console.error('Unhandled API Error:', err);
        return new Response(JSON.stringify({ message: 'An internal server error occurred.' }), {
            status: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
};
