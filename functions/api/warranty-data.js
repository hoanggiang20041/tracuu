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
      const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}/latest`, {
        headers: { 
          'X-Master-Key': env.JSONBIN_KEY,
          'X-Bin-Meta': 'false'
        }
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
    }
  
    if (request.method === 'PUT') {
      const body = await request.text();
      const response = await fetch(`https://api.jsonbin.io/v3/b/${env.JSONBIN_ID}`, {
        method: 'PUT',
        headers: { 
          'X-Master-Key': env.JSONBIN_KEY, 
          'Content-Type': 'application/json' 
        },
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