// Cloudflare Worker cho bảo mật dữ liệu
// Deploy lên Cloudflare Workers với 2 biến môi trường:
// - JSONBIN_ID: 68b9c242ae596e708fe27f7b
// - JSONBIN_KEY: (master key của bạn)

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '*';
    
    // CORS headers
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin'
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // API endpoint cho admin state (2FA, password, etc.)
    if (url.pathname === '/api/admin-state') {
      if (req.method === 'GET') {
        try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}/latest`, {
            headers: { 
              'X-Master-Key': env.JSONBIN_KEY,
              'X-Bin-Meta': 'false'
            }
          });
          
          if (!response.ok) {
            throw new Error(`JSONBin error: ${response.status}`);
          }
          
          const data = await response.json();
          return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Failed to fetch admin state' }), { 
            status: 500, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        }
      }
      
      if (req.method === 'PUT') {
        try {
          const body = await req.text();
          const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}`, {
            method: 'PUT',
            headers: { 
              'X-Master-Key': env.JSONBIN_KEY, 
              'Content-Type': 'application/json' 
            },
            body
          });
          
          if (!response.ok) {
            throw new Error(`JSONBin error: ${response.status}`);
          }
          
          const data = await response.json();
          return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Failed to update admin state' }), { 
            status: 500, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        }
      }
    }

    // API endpoint cho warranty data (dữ liệu khách hàng)
    if (url.pathname === '/api/warranty-data') {
      if (req.method === 'GET') {
        try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}/latest`, {
            headers: { 
              'X-Master-Key': env.JSONBIN_KEY,
              'X-Bin-Meta': 'false'
            }
          });
          
          if (!response.ok) {
            throw new Error(`JSONBin error: ${response.status}`);
          }
          
          const data = await response.json();
          return new Response(JSON.stringify(data), { 
            status: 200, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Failed to fetch warranty data' }), { 
            status: 500, 
            headers: { 
              ...cors, 
              'Content-Type': 'application/json' 
            } 
          });
        }
      }
    }

    // 404 for unknown endpoints
    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404, 
      headers: { 
        ...cors, 
        'Content-Type': 'application/json' 
      } 
    });
  }
}
