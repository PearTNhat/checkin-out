export default async function handler(req, res) {
  // Xác định thời gian hiện tại ở Việt Nam (UTC+7)
  const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const hour = vnTime.getHours();
  const minute = vnTime.getMinutes();
  const timeString = `${hour}h${minute < 10 ? '0' + minute : minute}`;

  let message = "⏰ Đã đến giờ!";
  let isCheckIn = true;

  if (hour === 7 || hour === 8) {
    message = `🚨 Xin chào! Bây giờ là ${timeString}, hãy nhớ CHECK-IN nhé!`;
    isCheckIn = true;
  } else if (hour === 17 || hour === 18) {
    message = `🚨 Chào buổi tối! Bây giờ là ${timeString}, hãy nhớ CHECK-OUT nhé!`;
    isCheckIn = false;
  } else {
    message = `🧪 Tin nhắn Test Cron (Bây giờ là ${timeString}) - Vui lòng test thử nút bấm!`;
    isCheckIn = true;
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
                text: isCheckIn ? "🚀 Tiến hành Check-In" : "🚀 Tiến hành Check-Out", 
                callback_data: isCheckIn ? "action_checkin" : "action_checkout" 
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
