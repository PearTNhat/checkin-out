const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!telegramToken || !chatId) {
  console.error("❌ Lỗi: Chưa có TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong file .env");
  process.exit(1);
}

console.log("🚀 Bắt đầu gửi tin nhắn test mỗi 30 giây...");

const sendMessage = async () => {
  const message = "🧪 ĐÂY LÀ TIN NHẮN TEST (Gửi mỗi 30 giây) - Hãy nhớ CHECK-IN / CHECK-OUT nhé!";
  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Tiến hành Check-In", callback_data: "action_checkin" },
              { text: "🚀 Tiến hành Check-Out", callback_data: "action_checkout" }
            ]
          ]
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lỗi gửi tin nhắn: ${response.status} - ${errorText}`);
    } else {
      console.log(`✅ Đã gửi tin nhắn lúc ${new Date().toLocaleTimeString("vi-VN")}`);
    }
  } catch (error) {
    console.error("❌ Lỗi kết nối:", error.message);
  }
};

// Gửi ngay lập tức lần đầu tiên
sendMessage();

// Thiết lập gửi mỗi 30 giây
setInterval(sendMessage, 30 * 1000);
