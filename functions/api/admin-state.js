export async function onRequest(context) {
    const { request, env } = context;

    // CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    // Prefer dedicated admin bin vars, fallback to general ones if missing
    const BIN_ID = env.JSONBIN_ADMIN_ID || env.JSONBIN_ID;
    const MASTER_KEY = env.JSONBIN_ADMIN_KEY || env.JSONBIN_KEY;

    if (!BIN_ID || !MASTER_KEY) {
        return new Response(JSON.stringify({
            error: 'Server configuration error',
            message: 'Missing JSONBin admin credentials'
        }), {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }

    try {
        if (request.method === 'GET') {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': MASTER_KEY,
                    'X-Bin-Meta': 'false'
                }
            });
            if (!res.ok) {
                return new Response(JSON.stringify({
                    error: 'Data service unavailable',
                    message: `API returned ${res.status}: ${res.statusText}`
                }), {
                    status: res.status,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
                });
            }
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
            });
        }

        if (request.method === 'PUT') {
            const body = await request.text();
            const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': MASTER_KEY,
                    'Content-Type': 'application/json'
                },
                body
            });
            if (!res.ok) {
                return new Response(JSON.stringify({
                    error: 'Failed to update admin state',
                    message: `API returned ${res.status}: ${res.statusText}`
                }), {
                    status: res.status,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
                });
            }
            const data = await res.json();
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Not allowed' }), {
            status: 405,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Network error', message: error.message }), {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }
}


