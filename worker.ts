/**
 * Cloudflare Worker entry point for ChessParfait.
 *
 * Handles `/api/puzzles` by fetching from Google Sheets using a service
 * account JWT. All other requests are forwarded to the static SPA assets.
 *
 * Required secrets (set via `wrangler secret put` or in the CF dashboard):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  – service account client_email
 *   GOOGLE_PRIVATE_KEY            – service account private_key (PEM)
 *   GOOGLE_SHEET_ID               – the spreadsheet ID from the sheet URL
 */

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_SHEET_ID: string;
}

interface Puzzle {
  title: string;
  fen: string;
  question: string;
}

// ─── JWT / Auth helpers ───────────────────────────────────────────────────────

function base64url(data: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Google's JSON key escapes newlines as \n; restore them if present
  const normalised = pem.replace(/\\n/g, '\n');
  const pemBody = normalised
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function getAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(env.GOOGLE_PRIVATE_KEY);
  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64url(sigBytes)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const { access_token } = (await res.json()) as { access_token: string };
  return access_token;
}

// ─── Sheets fetcher ───────────────────────────────────────────────────────────

async function fetchTab(
  sheetId: string,
  tabName: string,
  token: string,
): Promise<Puzzle[]> {
  // Columns: A = title, B = fen, C = question. Row 1 is the header.
  const range = encodeURIComponent(`${tabName}!A2:C`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API error for tab "${tabName}" (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { values?: string[][] };

  if (!data.values) return [];

  return (data.values as string[][])
    .filter((row: string[]) => row.length >= 3 && row[0] && row[1] && row[2])
    .map(([title, fen, question]: string[]) => ({ title, fen, question }));
}

// ─── Request handler ──────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handlePuzzles(env: Env): Promise<Response> {
  const token = await getAccessToken(env);

  const [pieceOfCake, hardTart, challenge] = await Promise.all([
    fetchTab(env.GOOGLE_SHEET_ID, 'Piece of Cake', token),
    fetchTab(env.GOOGLE_SHEET_ID, 'Hard Tart', token),
    fetchTab(env.GOOGLE_SHEET_ID, 'Challenge', token),
  ]);

  return new Response(
    JSON.stringify({
      'Piece of Cake': pieceOfCake,
      'Hard Tart': hardTart,
      Challenge: challenge,
    }),
    {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    },
  );
}

// ─── Worker export ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (pathname === '/api/puzzles') {
      try {
        return await handlePuzzles(env);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Static SPA assets — fall back to index.html on 404 so deep-links work
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url).toString()));
    }
    return assetResponse;
  },
};
