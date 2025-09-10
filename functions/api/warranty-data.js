export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
  
    // Chỉ cho phép các method GET, PUT
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
  
    if (request.method === 'GET') {
      try {
        // Kiểm tra environment variables
        if (url.searchParams.get('diag') === '1') {
          return new Response(JSON.stringify({
            ok: true,
            hasBinId: !!env.JSONBIN_ID,
            hasKey: !!env.JSONBIN_KEY,
            hasAccess: !!env.JSONBIN_ACCESS_KEY,
            time: Date.now()
          }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }});
        }

        if (!env.JSONBIN_ID || !env.JSONBIN_KEY) {
          console.error('Missing JSONBin environment variables');
          // Dev fallback: trả về mảng rỗng để client vẫn chạy được
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
          });
        }

        const headers = { 'X-Master-Key': env.JSONBIN_KEY, 'X-Bin-Meta': 'false' };
        // If no access key supplied by env, mirror master key into X-Access-Key per user setup
        headers['X-Access-Key'] = env.JSONBIN_ACCESS_KEY || env.JSONBIN_KEY;
        const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}/latest`, { headers });

        if (!response.ok) {
          console.error(`JSONBin API error: ${response.status} ${response.statusText}`);
          // Nếu 401/403, trả về fallback 200 rỗng để UI không bị kẹt
          if (response.status === 401 || response.status === 403) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({ 
            error: 'Data service unavailable',
            message: `API returned ${response.status}: ${response.statusText}`
          }), {
            status: response.status,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
          });
        }

        const data = await response.json();
        console.log('Successfully fetched data from JSONBin:', data?.length || 0, 'records');
        
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error fetching warranty data:', error);
        return new Response(JSON.stringify({ 
          error: 'Network error',
          message: error.message || 'Failed to connect to data service'
        }), {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
        });
      }
    }
  
    if (request.method === 'PUT') {
      const body = await request.text();
      const putHeaders = { 'X-Master-Key': env.JSONBIN_KEY, 'Content-Type': 'application/json' };
      putHeaders['X-Access-Key'] = env.JSONBIN_ACCESS_KEY || env.JSONBIN_KEY;
      const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}`, {
        method: 'PUT',
        headers: putHeaders,
        body
      });
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
  }