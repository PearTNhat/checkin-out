// Bỏ qua kiểm tra chứng chỉ SSL nếu có chuyển tiếp HTTPS nội bộ
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  // Cấu hình CORS chuẩn W3C: phản hồi theo Origin của client để tránh lỗi khi dùng Credentials
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, ngrok-skip-browser-warning'
  );

  // Xử lý preflight request từ browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lấy URL RPC từ biến môi trường VITE_RPC_URL, báo lỗi nếu chưa cấu hình
  const TARGET_RPC_URL = process.env.VITE_RPC_URL;
  if (!TARGET_RPC_URL) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: 'Lỗi: Chưa cấu hình biến môi trường VITE_RPC_URL',
      },
    });
  }

  try {
    let payload;
    if (typeof req.body === 'string') {
      payload = req.body;
    } else if (req.body && typeof req.body === 'object') {
      payload = JSON.stringify(req.body);
    } else {
      // Đọc từ stream nếu Vercel chưa tự parse req.body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      payload = Buffer.concat(chunks).toString('utf8');
    }

    const rpcResponse = await fetch(TARGET_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Bắt buộc với ngrok free để tránh trang cảnh báo HTML làm hỏng JSON response
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'Vercel-RPC-Proxy/1.0',
      },
      body: payload,
    });

    const rawText = await rpcResponse.text();

    try {
      const data = JSON.parse(rawText);
      return res.status(rpcResponse.status).json(data);
    } catch {
      // Bắt trường hợp ngrok trả về trang HTML (ngrok offline 502, warning page, lỗi mạng)
      console.error(`[RPC Proxy] Non-JSON response from ${TARGET_RPC_URL} (status ${rpcResponse.status}):`, rawText);
      return res.status(502).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: `Ngrok/RPC trả về mã HTTP ${rpcResponse.status} (không phải JSON): ${rawText.slice(0, 200)}`
        }
      });
    }
  } catch (error) {
    console.error('RPC Proxy Error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: `Proxy error: ${error.message}` }
    });
  }
}
