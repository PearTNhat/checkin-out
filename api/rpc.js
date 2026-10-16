export default async function handler(req, res) {
  // Cấu hình CORS để cho phép frontend gọi an toàn
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Xử lý preflight request từ browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Khi chạy remote (Vercel Serverless Function), gọi vào IP WAN để truy cập từ ngoài Internet
  const TARGET_RPC_URL = process.env.REMOTE_RPC_URL || 'https://giant-legroom-predator.ngrok-free.dev';

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const rpcResponse = await fetch(TARGET_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    const data = await rpcResponse.json();
    return res.status(rpcResponse.status).json(data);
  } catch (error) {
    console.error('RPC Proxy Error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: `Proxy error: ${error.message}` }
    });
  }
}
