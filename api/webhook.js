import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { defineChain } from 'viem'

// Bỏ qua lỗi chứng chỉ SSL của server Blockchain
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Khai báo cấu hình mạng lưới tùy chỉnh
const customChain = defineChain({
  id: 991,
  name: 'Custom Network 991',
  network: 'custom991',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['https://rpc-proxy-sequoia.iqnb.com:8446'] },
  },
})

// Khởi tạo Account từ Private Key (Có thể lưu vào .env sau này để bảo mật hơn)
const rawPrivateKey = process.env.PRIVATE_KEY || "72aa91a272ca13df75f51127145ca538fed2b9c0a2157c7a751d4c1f79edf5ad";
const formattedPrivateKey = rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
const account = privateKeyToAccount(formattedPrivateKey);

// Tạo WalletClient
const walletClient = createWalletClient({
  account,
  chain: customChain,
  transport: http()
})

const contractAddress = "0xedc125a9e586e67008d4d95cf472f8d54047e37f";
const checkinData = "0x5fdec8a2000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000";
const checkoutData = "0xdcdbf380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002531302e3737383639323036363234353236352d3130362e3735313433313838333839383332000000000000000000000000000000000000000000000000000000";

export default async function handler(req, res) {
  // Telegram gửi webhook dưới dạng POST
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  
  try {
    const body = req.body;
    let chatId = null;
    let action = null;

    // 1. Nếu người dùng bấm vào nút (Inline Keyboard)
    if (body.callback_query) {
      chatId = body.callback_query.message.chat.id;
      action = body.callback_query.data; // "action_checkin" hoặc "action_checkout"
      
      console.log(`[Vercel Webhook] 👤 Người dùng vừa bấm nút: ${action}`);

      // Trả lời callback để bot ngừng hiện icon loading trên nút
      await fetch(`https://api.telegram.org/bot${telegramToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: body.callback_query.id })
      });
    } 
    // 2. Nếu người dùng nhắn tin trực tiếp (Ví dụ: "check in", "/checkin")
    else if (body.message && body.message.text) {
      chatId = body.message.chat.id;
      const text = body.message.text.toLowerCase();
      console.log(`[Vercel Webhook] 💬 Nhận được tin nhắn: "${text}"`);
      if (text.includes('check in') || text.includes('checkin')) action = 'action_checkin';
      if (text.includes('check out') || text.includes('checkout')) action = 'action_checkout';
    }

    // Nếu không khớp hành động nào thì bỏ qua
    if (!action) {
      console.log("[Vercel Webhook] ⚠️ Tín hiệu không hợp lệ, bỏ qua.");
      return res.status(200).send('OK');
    }

    console.log(`[Vercel Webhook] 🚀 Bắt đầu xử lý giao dịch: ${action}`);

    // Gửi tin nhắn thông báo đang xử lý
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: "⏳ Đang gửi giao dịch lên mạng lưới..." })
    });

    // Thực thi giao dịch qua Viem
    const data = action === 'action_checkin' ? checkinData : checkoutData;
    const actionName = action === 'action_checkin' ? "Check-In" : "Check-Out";
    
    const hash = await walletClient.sendTransaction({
      to: contractAddress,
      data: data
    });

    // Thông báo thành công
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `✅ Giao dịch ${actionName} thành công!\nHash: ${hash}` })
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    const chatId = req.body?.callback_query?.message?.chat?.id || req.body?.message?.chat?.id;
    if (chatId) {
       await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `❌ Lỗi: ${error.shortMessage || error.message}` })
      });
    }
    return res.status(200).send('Error handled');
  }
}
