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
    const KEY = 'warranty_data';

    // Diagnostics
    if (url.searchParams.get('diag') === '1') {
        let exists = false;
        let count = 0;
        try {
            if (kv) {
                const arr = await kv.get(KEY, { type: 'json' });
                exists = true;
                count = Array.isArray(arr) ? arr.length : 0;
            }
        } catch (e) {}
        return new Response(JSON.stringify({ ok: true, hasKV: !!kv, exists, count }), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }

    if (!kv) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }

    try {
        if (request.method === 'GET') {
            const value = await kv.get(KEY, { type: 'json' });
            return new Response(JSON.stringify(value || []), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
        }

        if (request.method === 'PUT') {
            const body = await request.text();
            const json = body ? JSON.parse(body) : [];
            await kv.put(KEY, JSON.stringify(json));
            return new Response(JSON.stringify({ ok: true, saved: true, count: Array.isArray(json) ? json.length : 0 }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Not allowed' }), { status: 405, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'KV error', message: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }
}


