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
            allowQueryKeys: env.ALLOW_QUERY_KEYS === 'true',
            time: Date.now()
          }), { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }});
        }

        // Lấy config từ ENV hoặc (tùy chọn) query string nếu được cho phép
        const allowQuery = env.ALLOW_QUERY_KEYS === 'true';
        let binId = env.JSONBIN_ID;
        let masterKey = env.JSONBIN_KEY;
        let accessKey = env.JSONBIN_ACCESS_KEY;

        if ((!binId || !masterKey) && allowQuery) {
          binId = url.searchParams.get('id') || binId;
          masterKey = url.searchParams.get('key') || masterKey;
          accessKey = url.searchParams.get('access') || accessKey;
        }

        if (!binId || !masterKey) {
          console.error('Missing JSONBin environment variables');
          // Dev fallback: trả về mảng rỗng để client vẫn chạy được
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
          });
        }

        const buildHeaders = (mk, ak) => {
          const h = { 'X-Master-Key': mk, 'X-Bin-Meta': 'false' };
          h['X-Access-Key'] = ak || mk; // mirror nếu không có access riêng
          return h;
        };

        let response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: buildHeaders(masterKey, accessKey) });
        // Nếu lỗi 401/403 và cho phép, thử lại với key từ query (nếu khác)
        if (!response.ok && allowQuery) {
          const qId = url.searchParams.get('id');
          const qKey = url.searchParams.get('key');
          const qAccess = url.searchParams.get('access');
          if ((qId && qKey) && (qId !== binId || qKey !== masterKey || qAccess !== accessKey)) {
            binId = qId; masterKey = qKey; accessKey = qAccess;
            response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: buildHeaders(masterKey, accessKey) });
          }
        }

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
      // PUT: cũng hỗ trợ query khi ALLOW_QUERY_KEYS=true
      const allowQuery = env.ALLOW_QUERY_KEYS === 'true';
      let binId = env.JSONBIN_ID;
      let masterKey = env.JSONBIN_KEY;
      let accessKey = env.JSONBIN_ACCESS_KEY;
      if ((!binId || !masterKey) && allowQuery) {
        binId = url.searchParams.get('id') || binId;
        masterKey = url.searchParams.get('key') || masterKey;
        accessKey = url.searchParams.get('access') || accessKey;
      }

      const putHeaders = { 'X-Master-Key': masterKey, 'Content-Type': 'application/json' };
      putHeaders['X-Access-Key'] = accessKey || masterKey;
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
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