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

    const kv = env.WARRANTY_KV; // Bind this in Cloudflare Pages → Settings → Functions → KV namespaces
    const KEY = 'admin_state';

    // Diagnostics
    if (url.searchParams.get('diag') === '1') {
        let exists = false;
        let sample = null;
        try {
            if (kv) {
                sample = await kv.get(KEY, { type: 'json' });
                exists = true;
            }
        } catch (e) {
            sample = { error: e.message };
        }
        return new Response(JSON.stringify({ ok: true, hasKV: !!kv, exists, sample }), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }

    if (!kv) {
        const fallback = {
            secretKey: typeof btoa === 'function' ? btoa('admin_access_2024_global_fixed') : 'YWRtaW5fYWNjZXNzXzIwMjRfZ2xvYmFsX2ZpeGVk',
            challenge: 'fixed_challenge_2024',
            twoFactorEnabled: false,
            twoFactorSecret: null,
            version: 1,
            lastUpdated: Date.now(),
            note: 'dev_fallback_no_kv_binding'
        };
        return new Response(JSON.stringify(fallback), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }

    try {
        if (request.method === 'GET') {
            const value = await kv.get(KEY, { type: 'json' });
            return new Response(JSON.stringify(value || {}), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
        }

        if (request.method === 'PUT') {
            const body = await request.text();
            const json = body ? JSON.parse(body) : {};
            await kv.put(KEY, JSON.stringify(json));
            return new Response(JSON.stringify({ ok: true, saved: true }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 405, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'KV error', message: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }
}


