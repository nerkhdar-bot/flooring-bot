const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

// ذخیره‌سازی مرحله‌ای برای هر کاربر
const sessions = {};

bot.start((ctx) => {
  sessions[ctx.from.id] = { step: "name" };
  ctx.reply("👋 سلام، به فرم استعلام قیمت خوش آمدید.\n\nلطفاً نام و نام خانوادگی خود را وارد کنید:");
});

bot.on("text", async (ctx) => {
  const id = ctx.from.id;
  const text = ctx.message.text;

  if (!sessions[id]) {
    sessions[id] = { step: "name" };
    return ctx.reply("برای شروع دوباره، لطفاً نام و نام خانوادگی خود را وارد کنید:");
  }

  const s = sessions[id];

  switch (s.step) {
    case "name":
      s.name = text;
      s.step = "phone";
      return ctx.reply("📱 شماره تماس / واتساپ خود را وارد کنید:");

    case "phone":
      if (!/^09\d{9}$/.test(text) && !/^989\d{9}$/.test(text)) {
        return ctx.reply("❌ شماره معتبر نیست. باید با 09 یا 989 شروع شود.");
      }
      s.phone = text;
      s.step = "email";
      return ctx.reply("✉ ایمیل (اختیاری) را وارد کنید یا بزنید - برای رد کردن:");

    case "email":
      s.email = text === "-" ? "" : text;
      s.step = "city";
      return ctx.reply("🌆 محل تحویل / شهر مقصد:");

    case "city":
      s.city = text;
      s.step = "product";
      return ctx.reply("🏗 محصول موردنظر را انتخاب کنید:\n- بلوک\n- کفپوش بتنی");

    case "product":
      if (text.includes("بلوک")) {
        s.product = "بلوک";
        s.step = "block_thickness";
        return ctx.reply("ضخامت بلوک (سانتی‌متر):");
      } else if (text.includes("کفپوش")) {
        s.product = "کفپوش بتنی";
        s.step = "paver_type";
        return ctx.reply("نوع کفپوش (اینترلاک، پرسی، واش بتن و ...):");
      } else {
        return ctx.reply("لطفاً فقط یکی از گزینه‌ها را وارد کنید: بلوک یا کفپوش بتنی");
      }

    // 🔹 مراحل اختصاصی بلوک
    case "block_thickness":
      s.block_thickness = text;
      s.step = "walls";
      return ctx.reply("تعداد جداره (تک جداره / دو جداره / سه جداره):");

    case "walls":
      s.walls = text;
      s.step = "block_length";
      return ctx.reply("طول بلوک (سانتی‌متر):");

    case "block_length":
      s.block_length = text;
      s.step = "block_height";
      return ctx.reply("ارتفاع بلوک (سانتی‌متر):");

    case "block_height":
      s.block_height = text;
      s.step = "material";
      return ctx.reply("جنس بلوک (سیمانی / پوکه / لیکا / ...):");

    case "material":
      s.material = text;
      s.step = "block_color";
      return ctx.reply("رنگ بلوک (ساده، سفید، مشکی، سفارشی):");

    case "block_color":
      s.block_color = text;
      s.step = "quantity";
      return ctx.reply("📦 تعداد / متراژ موردنیاز:");

    // 🔹 مراحل اختصاصی کفپوش
    case "paver_type":
      s.paver_type = text;
      s.step = "paver_color";
      return ctx.reply("رنگ کفپوش:");

    case "paver_color":
      s.paver_color = text;
      s.step = "paver_length";
      return ctx.reply("طول (سانتی‌متر):");

    case "paver_length":
      s.paver_length = text;
      s.step = "paver_width";
      return ctx.reply("عرض (سانتی‌متر):");

    case "paver_width":
      s.paver_width = text;
      s.step = "paver_thickness";
      return ctx.reply("ضخامت (سانتی‌متر):");

    case "paver_thickness":
      s.paver_thickness = text;
      s.step = "surface_finish";
      return ctx.reply("نوع سطح (صاف / زبری‌دار / طرح‌دار):");

    case "surface_finish":
      s.surface_finish = text;
      s.step = "quantity";
      return ctx.reply("📦 تعداد / متراژ موردنیاز:");

    // 🔹 مراحل پایانی (مشترک)
    case "quantity":
      s.quantity = text;
      s.step = "message";
      return ctx.reply("📝 توضیحات اضافی:");

    case "message":
      s.message = text;

      // ساخت پیام نهایی
      let summary = `✅ استعلام جدید:

👤 نام: ${s.name}
📱 موبایل: ${s.phone}
✉️ ایمیل: ${s.email}
🌆 شهر: ${s.city}
🏗️ محصول: ${s.product}
`;

      if (s.product === "بلوک") {
        summary += `🔸 ضخامت: ${s.block_thickness}
🔸 جداره: ${s.walls}
🔸 طول: ${s.block_length}
🔸 ارتفاع: ${s.block_height}
🔸 جنس: ${s.material}
🔸 رنگ: ${s.block_color}
`;
      } else {
        summary += `🔸 نوع کفپوش: ${s.paver_type}
🔸 رنگ: ${s.paver_color}
🔸 طول: ${s.paver_length}
🔸 عرض: ${s.paver_width}
🔸 ضخامت: ${s.paver_thickness}
🔸 سطح: ${s.surface_finish}
`;
      }

      summary += `📦 مقدار: ${s.quantity}
📝 توضیحات: ${s.message}`;

      await ctx.reply(summary);

      // ارسال برای ادمین
      if (process.env.ADMIN_CHAT_ID) {
        await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, summary);
      }

      console.log("📨 New enquiry received:", summary);

      delete sessions[id]; // پاک‌کردن بعد از تکمیل
      return;
  }
});

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("✅ Bot with full enquiry form started...");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, () => {
console.log("✅ Server is running on port " + PORT);
});
