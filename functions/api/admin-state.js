export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

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
    const ACCESS_KEY = env.JSONBIN_ADMIN_ACCESS_KEY || env.JSONBIN_ACCESS_KEY;

    // Diagnostics mode (no secrets leaked)
    if (url.searchParams.get('diag') === '1') {
        const hasBinId = !!BIN_ID;
        const hasKey = !!MASTER_KEY;
        const hasAccess = !!ACCESS_KEY;
        let remoteOk = null;
        if (hasBinId && hasKey) {
            try {
                const ping = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                    method: 'GET',
                    headers: { 'X-Master-Key': MASTER_KEY, ...(hasAccess?{'X-Access-Key':ACCESS_KEY}:{}) , 'X-Bin-Meta': 'false' }
                });
                remoteOk = ping.status;
            } catch (e) {
                remoteOk = 'network_error';
            }
        }
        return new Response(JSON.stringify({
            ok: true,
            hasBinId,
            hasKey,
            hasAccess,
            remoteOk,
            time: Date.now()
        }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }

    if (!BIN_ID || !MASTER_KEY) {
        // Development fallback: return fixed admin skeleton so client can self-heal
        const fallback = {
            secretKey: typeof btoa === 'function' ? btoa('admin_access_2024_global_fixed') : 'YWRtaW5fYWNjZXNzXzIwMjRfZ2xvYmFsX2ZpeGVk',
            challenge: 'fixed_challenge_2024',
            twoFactorEnabled: false,
            twoFactorSecret: null,
            version: 1,
            lastUpdated: Date.now(),
            note: 'dev_fallback_no_credentials'
        };
        return new Response(JSON.stringify(fallback), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }

    try {
        if (request.method === 'GET') {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': MASTER_KEY,
                    ...(ACCESS_KEY ? { 'X-Access-Key': ACCESS_KEY } : {}),
                    'X-Bin-Meta': 'false'
                }
            });
            if (!res.ok) {
                // If unauthorized/forbidden, return dev fallback instead of propagating error
                if (res.status === 401 || res.status === 403) {
                    const fallback = {
                        secretKey: typeof btoa === 'function' ? btoa('admin_access_2024_global_fixed') : 'YWRtaW5fYWNjZXNzXzIwMjRfZ2xvYmFsX2ZpeGVk',
                        challenge: 'fixed_challenge_2024',
                        twoFactorEnabled: false,
                        twoFactorSecret: null,
                        version: 1,
                        lastUpdated: Date.now(),
                        note: `dev_fallback_${res.status}`
                    };
                    return new Response(JSON.stringify(fallback), {
                        status: 200,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
                    });
                }
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
                    ...(ACCESS_KEY ? { 'X-Access-Key': ACCESS_KEY } : {}),
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


