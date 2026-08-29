# Sub Manager

Clean-IP Subscription Manager — Cloudflare Worker

A self-hosted panel for managing proxy subscriptions and configs (VLESS, Trojan, Shadowsocks, VMess): merge multiple sources into one link, apply per-config settings (clean-IP substitution, port filtering, upload-boost, and more), and deliver a single unified subscription output that keeps itself up to date.

Everything runs on a single Cloudflare Worker with a KV namespace for storage — no server, no database, no monthly cost on Cloudflare's free tier for typical personal use.

پنل مدیریت سابسکریپشن با قابلیت آی‌پی تمیز — روی Cloudflare Worker

یک پنل مدیریتیِ شخصی برای مدیریت سابسکریپشن‌ها و کانفیگ‌های پروکسی (VLESS، Trojan، Shadowsocks، VMess): چند منبع را در یک لینک ادغام کن، روی هر کانفیگ تنظیمات جداگانه اعمال کن (جایگزینی آی‌پی تمیز، فیلتر پورت، افزایش سرعت آپلود و موارد دیگر)، و در نهایت یک خروجی یکپارچه بگیر که خودش هم به‌روز می‌ماند.

همه‌چیز روی یک Cloudflare Worker به همراه یک KV namespace برای ذخیره‌سازی اجرا می‌شود — بدون سرور، بدون دیتابیس جداگانه، و برای استفاده‌ی شخصی معمولی معمولاً در پلن رایگان کلودفلر جا می‌شود.

---

## Features / امکانات

- Merge multiple subscription URLs and manually-added configs into one output
- Per-part settings: clean-IP substitution, distribution mode (multiply/random), port filtering, one-config-per-port
- Auto-refresh per source, with self-healing on request (no Cron Trigger required)
- Multiple clean-IP lists, switchable per source
- Optional Cloudflare API connection to show Worker usage stats in the panel
- Full backup/restore (JSON export/import, merge or replace)
- Upload-boost (TLS fingerprint / fragment settings) for VLESS and Trojan configs

<br>

- ادغام چند لینک سابسکریپشن و کانفیگ‌های دستی در یک خروجی واحد
- تنظیمات مستقل برای هر بخش: جایگزینی آی‌پی تمیز، نحوه‌ی توزیع (تکثیر/تصادفی)، فیلتر پورت، یک کانفیگ برای هر پورت
- به‌روزرسانی خودکار هر منبع، با ترمیم خودکار در لحظه‌ی درخواست (بدون نیاز به Cron Trigger)
- امکان ساخت چند لیست آی‌پی تمیز و انتخاب جداگانه برای هر منبع
- اتصال اختیاری به API کلودفلر برای نمایش آمار مصرف ورکر در پنل
- پشتیبان‌گیری و بازیابی کامل (خروجی/ورودی JSON، با حالت افزودن یا جایگزینی)
- رفع محدودیت آپلود (تنظیمات فینگرپرینت TLS / فرگمنت) برای کانفیگ‌های VLESS و Trojan

---

## Deploy / راه‌اندازی

You only need a free Cloudflare account. No coding knowledge required for this method.

فقط به یک اکانت رایگان کلودفلر نیاز داری. برای این روش نیازی به دانش برنامه‌نویسی نیست.

1. **Create a KV namespace** — Cloudflare dashboard → **Workers & Pages** → **KV** → **Create namespace**. Name it anything (e.g. `sub-manager-db`).

   یک KV namespace بساز — از داشبورد کلودفلر → **Workers & Pages** → **KV** → **Create namespace**. اسمش هرچی می‌خوای باشه (مثلاً `sub-manager-db`).

2. **Create a Worker** — **Workers & Pages** → **Create** → **Workers** → give it a name → **Deploy** (the default "Hello World" code is fine for now, you'll replace it next).

   یک Worker بساز — **Workers & Pages** → **Create** → **Workers** → یک اسم بذار → **Deploy** (کد پیش‌فرض "Hello World" فعلاً مهم نیست، در مرحله‌ی بعد جایگزینش می‌کنی).

3. **Bind the KV namespace to the Worker** — open the Worker → **Settings** → **Bindings** → **Add binding** → **KV namespace** → set **Variable name** to exactly `SUB_DB` → select the namespace you created in step 1 → **Save**.

   KV namespace را به Worker متصل کن — وارد Worker شو → **Settings** → **Bindings** → **Add binding** → **KV namespace** → مقدار **Variable name** را دقیقاً `SUB_DB` بگذار → namespace ساخته‌شده در مرحله‌ی ۱ را انتخاب کن → **Save**.

4. **Paste the code** — download `worker.js` from the latest release → open the Worker → **Edit code** → select all, delete, paste the file's content → **Deploy**.

   کد را پیست کن — فایل `worker.js` را از آخرین ریلیز دانلود کن → وارد Worker شو → **Edit code** → همه‌ی کد قبلی را پاک کن، محتوای فایل را پیست کن → **Deploy**.

5. **Set your admin password** — Worker → **Settings** → **Variables and Secrets** → **Add** → type: **Secret**, name: `ADMIN_PASSWORD`, value: a strong password of your choice → **Save and deploy**.

   رمز عبور ادمین را تنظیم کن — Worker → **Settings** → **Variables and Secrets** → **Add** → نوع: **Secret**، نام: `ADMIN_PASSWORD`، مقدار: یک رمز قوی دلخواه → **Save and deploy**.

   > If you skip this step, the panel falls back to the default password `admin123` and shows a warning banner until you set a real one. Don't leave it on the default.
   >
   > اگه این مرحله را رد کنی، پنل با رمز پیش‌فرض `admin123` کار می‌کند و تا وقتی رمز واقعی تنظیم نکنی یک هشدار نشان می‌دهد. رمز پیش‌فرض را برای استفاده‌ی واقعی نگه ندار.

6. Open `https://<your-worker>.<your-subdomain>.workers.dev/app`, log in, and start adding sources.

   آدرس `https://<your-worker>.<your-subdomain>.workers.dev/app` را باز کن، وارد شو، و شروع کن به اضافه کردن منبع.

That's it — no other setup is required. A Cron Trigger is optional (see below).

همین — هیچ تنظیم دیگری لازم نیست. تنظیم Cron Trigger اختیاری است (پایین‌تر توضیح داده شده).

### Optional: Cron Trigger / اختیاری: زمان‌بند Cron

Subscriptions already refresh themselves the moment a client requests them, if the cached output is older than that part's own auto-refresh interval. Adding a Cron Trigger just means they also refresh proactively in the background, even when nobody has opened a client for a while:

Worker → **Settings** → **Triggers** → **Cron Triggers** → **Add Cron Trigger** → e.g. `0 * * * *` (every hour).

سابسکریپشن‌ها همین الان هم خودشان در لحظه‌ی درخواست کلاینت، اگر خروجی کش‌شده از بازه‌ی رفرش تعیین‌شده برای آن بخش قدیمی‌تر باشد، به‌روز می‌شوند. اضافه کردن Cron Trigger فقط باعث می‌شود این به‌روزرسانی حتی وقتی مدتی هیچ کلاینتی درخواست نزده هم پیش‌دستانه در پس‌زمینه انجام شود:

Worker → **Settings** → **Triggers** → **Cron Triggers** → **Add Cron Trigger** → مثلاً `0 * * * *` (هر ساعت).

---

## Running from source / اجرا از روی سورس

If you'd rather build the Worker file yourself, or deploy straight from the modular source with [Wrangler](https://developers.cloudflare.com/workers/wrangler/), you have two options. Both need [Node.js](https://nodejs.org) installed.

اگه ترجیح می‌دی خودت فایل ورکر را بسازی، یا مستقیماً از روی سورس ماژولار با [Wrangler](https://developers.cloudflare.com/workers/wrangler/) دیپلوی کنی، دو گزینه داری. هر دو به [Node.js](https://nodejs.org) نصب‌شده نیاز دارند.

```bash
git clone https://github.com/Yarumin/sub-manager.git
cd sub-manager
npm install
```

**Option A — build a single `worker.js` and paste it manually (same result as the release file):**

**گزینه‌ی الف — ساخت یک فایل `worker.js` تکی و پیست دستی آن (نتیجه‌ای دقیقاً مثل فایل ریلیز):**

```bash
npm run build
```

The output is written to `dist/worker.js`. Paste its content into the Worker editor as in step 4 above.

خروجی در `dist/worker.js` ساخته می‌شود. محتوایش را مثل مرحله‌ی ۴ بالا در ویرایشگر Worker پیست کن.

**Option B — deploy straight from source with Wrangler (no manual copy/paste):**

**گزینه‌ی ب — دیپلوی مستقیم از روی سورس با Wrangler (بدون کپی/پیست دستی):**

```bash
npx wrangler login
```

Edit `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with your KV namespace's ID (Cloudflare dashboard → Workers & Pages → KV → your namespace), then:

فایل `wrangler.jsonc` را ویرایش کن و `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` را با آیدی KV namespace خودت جایگزین کن (داشبورد کلودفلر → Workers & Pages → KV → روی namespace خودت)، سپس:

```bash
npx wrangler deploy
npx wrangler secret put ADMIN_PASSWORD
```

Both options produce the exact same Worker behavior — pick whichever is more comfortable.

هر دو گزینه دقیقاً یک رفتار یکسان از ورکر تولید می‌کنند — هرکدام راحت‌تر بود را انتخاب کن.

---

## Project structure / ساختار پروژه

```
src/
  index.js          entry point (fetch / scheduled)
  constants.js
  utils/            small stateless helpers
  authz/            session, password check, login rate-limit
  configEngine/     config parsing, fingerprinting, output generation
  storage/          KV read/write, backup import/export
  sync/             subscription fetching and auto-refresh
  api/              /api/* route handlers
  publicApi/        /sub/{slug} public endpoint
  panel/            admin panel HTML + client-side script
scripts/
  build.mjs         bundles src/ into dist/worker.js
wrangler.jsonc      config for `wrangler dev` / `wrangler deploy`
```

---

## License / لایسنس

MIT — see [LICENSE](./LICENSE).
