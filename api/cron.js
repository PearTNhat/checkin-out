export default async function handler(req, res) {
  // Xác định thời gian hiện tại ở Việt Nam (UTC+7)
  const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const hour = vnTime.getHours();

  let message = "⏰ Đã đến giờ!";
  if (hour === 8) {
    message = "🚨 Xin chào! Đã 8h05, hãy nhớ CHECK-IN nhé!";
  } else if (hour === 18) {
    message = "🚨 Chào buổi tối! Đã 18h15, hãy nhớ CHECK-OUT nhé!";
  } else {
    message = "🧪 Tin nhắn Test Cron từ Vercel (Mỗi 1 phút) - Vui lòng test thử nút bấm!";
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramToken || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.");
    return res.status(500).json({ error: "Missing Telegram configuration" });
  }

  try {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const tgResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: hour === 8 ? "🚀 Tiến hành Check-In" : "🚀 Tiến hành Check-Out", 
                callback_data: hour === 8 ? "action_checkin" : "action_checkout" 
              }
            ]
          ]
        }
      }),
    });

    if (!tgResponse.ok) {
      const tgError = await tgResponse.text();
      throw new Error(`Telegram API Error: ${tgResponse.status} ${tgError}`);
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return res.status(500).json({ error: error.message });
  }
}
