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

    // Supabase config
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    const TABLE_NAME = 'warranty_data';

    // Diagnostics mode
    if (url.searchParams.get('diag') === '1') {
        const hasUrl = !!SUPABASE_URL;
        const hasKey = !!SUPABASE_ANON_KEY;
        let testResult = null;
        
        if (hasUrl && hasKey) {
            try {
                // Test Supabase connection
                const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&limit=1`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                testResult = { 
                    status: testResponse.status, 
                    statusText: testResponse.statusText 
                };
                if (!testResponse.ok) {
                    const errorText = await testResponse.text();
                    testResult.errorBody = errorText.substring(0, 200);
                }
            } catch (e) {
                testResult = { error: e.message };
            }
        }
        
        return new Response(JSON.stringify({
            ok: true,
            hasUrl,
            hasKey,
            testResult,
            time: Date.now()
        }), { 
            status: 200, 
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
        });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // Return empty array fallback
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }

    try {
        if (request.method === 'GET') {
            // Get warranty data
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc&limit=1`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Supabase GET error: ${response.status} ${response.statusText}`);
                // Return empty array on error
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
                });
            }

            const data = await response.json();
            const records = data && data[0] ? data[0].data : [];
            
            return new Response(JSON.stringify(records), {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
            });
        }

        if (request.method === 'PUT') {
            const body = await request.text();
            const warrantyData = JSON.parse(body);
            
            // Upsert warranty data
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    data: warrantyData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.error(`Supabase PUT error: ${response.status} ${response.statusText}`);
                return new Response(JSON.stringify({
                    error: 'Failed to update warranty data',
                    message: `Supabase returned ${response.status}: ${response.statusText}`
                }), {
                    status: response.status,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
                });
            }

            const data = await response.json();
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
        console.error('Supabase warranty-data error:', error);
        return new Response(JSON.stringify({ 
            error: 'Network error', 
            message: error.message 
        }), {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
    }
}
