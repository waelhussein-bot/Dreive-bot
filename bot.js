// bot.js
import express from "express";
import bodyParser from "body-parser";
import WebSocket from "ws";

const app = express();
app.use(bodyParser.json());

const DERIV_TOKEN = process.env.DERIV_TOKEN || "PUT_YOUR_TOKEN_IF_LOCAL";
const PORT = process.env.PORT || 3000;
const APP_ID = "1089"; // ثابت يمكن تغييره

function placeTrade(signal) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);

    ws.on("open", () => {
      // نرسل طلب التفويض (authorize)
      ws.send(JSON.stringify({ authorize: DERIV_TOKEN }));
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        // عند التفويض الناجح - نرسل أمر الشراء/البيع
        if (data.authorize && data.authorize.oauth) {
          // ننتظر رسالة التفويض الأولى ثم نرسل أمر الشراء/البيع
          // نحدد التفاصيل: price (stake) و duration 1 minute و symbol
          const contract = {
            buy: 1,
            price: 1, // قيمة الستيك - غيّرها حسب ما تريد
            parameters: {
              contract_type: signal === "buy" ? "CALL" : "PUT",
              basis: "stake",
              duration: 1,
              duration_unit: "m",
              symbol: "R_100" // غيّر الأصل إذا احتجت
            }
          };
          ws.send(JSON.stringify(contract));
        }

        // استجابة عملية الشراء
        if (data.buy && (data.buy.contract_id || data.buy.transaction_id || data.error)) {
          // نغلق الاتصال بعد الحصول على النتيجة
          resolve(data);
          ws.close();
        }

        // في حالة الخطأ من السيرفر
        if (data.error) {
          resolve(data);
          ws.close();
        }
      } catch (err) {
        // إذا رسالة ليست JSON أو مشكلة
        // نواصل الاستماع
      }
    });

    ws.on("error", (err) => {
      reject(err);
    });

    // وقت انتهاء الانتظار عامودي
    setTimeout(() => {
      try { ws.close(); } catch(e) {}
      reject(new Error("Timeout - no answer from Deriv"));
    }, 10000);
  });
}

app.post("/webhook", async (req, res) => {
  try {
    // نفترض أن TradingView ترسل JSON مثل { "signal": "buy" }
    const payload = req.body || {};
    const signal = (payload.signal || "").toString().toLowerCase();

    if (!["buy","sell"].includes(signal)) {
      return res.status(400).json({ ok: false, error: "invalid signal" });
    }

    const result = await placeTrade(signal);
    return res.json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || err });
  }
});

app.get("/", (req, res) => res.send("Deriv Bridge Bot is running"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
