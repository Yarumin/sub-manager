import { PANEL_PATH } from "../constants.js";
import { getDashboardClientScript } from "./dashboardClient.js";

export function getDashboardHTML(baseUrl) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzgxOGNmOCIvPgo8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3ZGQzZmMiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHJ4PSI2IiBmaWxsPSIjMGIwZjFhIi8+CjxyZWN0IHg9IjQuMiIgeT0iNS4zIiB3aWR0aD0iMTMuNSIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiLz4KPHJlY3QgeD0iNC4yIiB5PSIxMC4yIiB3aWR0aD0iMTUuNiIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNzIiLz4KPHJlY3QgeD0iNC4yIiB5PSIxNS4xIiB3aWR0aD0iMTAuNCIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNDYiLz4KPC9zdmc+Cg==">
    <title>پنل مدیریت سابسکریپشن</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        .glass-panel { background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(55, 65, 81, 0.5); }
    </style>
</head>
<body class="bg-gray-950 text-gray-200 min-h-screen">
    <div class="max-w-6xl mx-auto p-6">
        <div class="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-6">
            <div>
                <h1 class="text-2xl font-black tracking-tight bg-gradient-to-l from-indigo-300 via-purple-300 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(129,140,248,0.25)]">پنل مدیریت سابسکریپشن</h1>
                <p class="text-xs text-gray-500 mt-0.5">مدیریت منابع، لیست‌های آی‌پی تمیز، و اتصال کلودفلر</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="syncAll()" class="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-4 py-2 rounded-lg transition border border-indigo-500/20 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    همگام‌سازی همه
                </button>
                <a href="${PANEL_PATH}/logout" class="text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg transition border border-red-500/20 flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    خروج
                </a>
            </div>
        </div>

        <div id="password-warning" class="hidden bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm">
            ⚠️ شما هنوز از رمز پیش‌فرض ناامن استفاده می‌کنید. حتماً یک ADMIN_PASSWORD قوی (از نوع Secret) تنظیم کنید.
        </div>
        <div class="flex flex-col lg:flex-row gap-6"><div class="contents lg:flex lg:flex-col lg:gap-6 lg:w-2/3 lg:order-1"><div class="order-2 lg:order-none glass-panel p-6 rounded-2xl relative overflow-hidden">
<h2 class="text-lg font-bold mb-4 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        ایجاد سابسکریپشن جدید

                    </h2>
<p class="text-xs text-gray-500 mb-4">یک سابسکریپشن می‌تواند شامل چند لینک منبع، چند کانفیگ مستقیم، یا ترکیبی از هر دو باشد - هر لینک/بلوک، یک «بخش» کاملاً مستقل با تنظیمات خودش می‌شود.</p>
<div class="space-y-4">
<div>
<label class="block text-sm mb-2 text-gray-400">نام نمایشی</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm" id="sourceName" placeholder="مثلاً: سرور آلمان ۱" type="text"/>
</div>
<div>
<label class="block text-sm mb-2 text-gray-400">لینک‌های منبع (اختیاری - هر خط یک لینک)</label>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm font-mono" dir="ltr" id="sourceUrls" placeholder="https://...&#10;https://..." rows="3"></textarea>
</div>
<div>
<label class="block text-sm mb-2 text-gray-400">کانفیگ‌های مستقیم (اختیاری - هر خط یک کانفیگ)</label>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-purple-500 text-sm font-mono" dir="ltr" id="sourceManual" placeholder="vless://..." rows="4"></textarea>
<div class="flex flex-wrap items-center gap-1.5 mt-2" dir="ltr">
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">VLESS</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">Trojan</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">Shadowsocks</span>
<span class="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">VMess</span>
</div>
</div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">نوع کانفیگ‌ها</label>
<div class="grid grid-cols-2 gap-2">
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input checked="" class="text-indigo-600" id="catCloudflare" name="sourceCategory" type="radio" value="cloudflare"/>
<span class="text-xs text-gray-300">کانفیگ ورکر</span>
</label>
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input class="text-indigo-600" id="catIndependent" name="sourceCategory" type="radio" value="independent"/>
<span class="text-xs text-gray-300">کانفیگ مستقل</span>
</label>
</div>
</div>
<div class="flex items-center gap-2">
<input checked="" class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600" id="sourceUseCleanIp" type="checkbox"/>
<label class="text-xs text-gray-400" for="sourceUseCleanIp">استفاده از آی‌پی تمیز جایگزین</label>
</div>
<p class="text-[11px] text-gray-500">این‌ها فقط مقدار اولیه‌اند؛ بعداً از «ویرایش» می‌توانید هر بخش را جداگانه تنظیم کنید (پورت‌ها، لیست آی‌پی، نحوه‌ی توزیع، به‌روزرسانی خودکار و ...).</p>
</div>
<button class="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-white shadow-lg shadow-purple-600/20" onclick="addSource()">
                            ساخت سابسکریپشن جدید
                        </button>
</div>
</div><div class="order-3 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-4 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.5 1.5" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        سابسکریپشن‌ها
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-normal" id="sourcesCountBadge"></span>
</h2>
<div class="space-y-3" id="subsList"></div>
</div><div class="order-3 lg:order-none hidden glass-panel p-6 rounded-2xl" id="configEditorPanel">
<div class="flex justify-between items-center mb-4">
<h2 class="text-lg font-bold text-white" id="editorTitle">تنظیمات سابسکریپشن</h2>
<button class="text-gray-400 hover:text-white text-sm" onclick="closeConfigEditor()">بستن ✕</button>
</div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 mb-4">
<label class="block text-xs text-gray-400 mb-1.5">آدرس سابسکریپشن</label>
<div class="text-[11px] text-gray-500 truncate mb-1.5" id="editorLinkOrigin" dir="ltr"></div>
<div class="flex items-center gap-2" dir="ltr">
<input class="flex-1 min-w-0 bg-gray-950 border border-gray-700 rounded-lg p-1.5 text-xs font-mono" id="editorSlugInput" type="text"/>
<button class="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition shrink-0" onclick="saveSourceSlug()" dir="rtl">ذخیره</button>
</div>
<p class="text-[11px] text-gray-500 mt-1.5">فقط حروف و عدد انگلیسی، خط تیره و زیرخط؛ بین ۴ تا ۳۲ کاراکتر.</p>
</div>
<p class="text-xs text-gray-500 mb-4">هر لینک/بخش کاملاً مستقل است و تنظیمات خودش را دارد؛ به‌روزرسانی خودکار هم برای هرکدام جداگانه تنظیم می‌شود. فهرست کانفیگ‌های هرکدام همیشه کامل و بدون فیلتر نمایش داده می‌شود؛ فیلترها فقط روی خروجی نهایی اثر می‌گذارند.</p>
<div class="space-y-5" id="editorPartsContainer"></div>
</div><div class="order-5 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    اتصال به API کلودفلر
                </h2>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 mb-4 text-[11px] text-gray-400 leading-relaxed space-y-1">
<strong class="block text-gray-300 mb-1">این بخش کاملاً اختیاری است و فقط برای دیدن آمار مصرف Workers است:</strong>
<p>۱) روی دکمه‌ی «ساخت خودکار توکن در کلودفلر» بزنید.</p>
<p>۲) در صفحه باز شده دکمه‌ی <b>Continue to summary</b> و بعد <b>Create Token</b> را بزنید و توکن را کپی کنید.</p>
<p>۳) در داشبورد کلودفلر از بخش Workers &amp; Pages آیدی اکانت را پیدا و کپی کنید.</p>
<p>۴) نام دلخواه، آیدی و توکن را در قسمت پایین وارد کرده و «افزودن و بررسی» را بزنید.</p>
</div>
<a class="w-full flex items-center justify-center gap-2 text-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 py-2.5 rounded-xl text-xs font-bold transition mb-4" href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&amp;accountId=*&amp;name=SubManager-Stats-Token" target="_blank">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    ساخت خودکار توکن در کلودفلر
                </a>
<div class="space-y-2 mb-4" id="cfConnectionsList"></div>
<div class="space-y-3 mb-2 bg-gray-900/50 border border-gray-800 rounded-xl p-3">
<div>
<label class="block text-xs mb-1 text-gray-400">نام نمایشی اکانت در پنل</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm" id="newCf-label" type="text"/>
</div>
<div>
<label class="block text-xs mb-1 text-gray-400">Account ID</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm font-mono text-center" dir="ltr" id="newCf-account" type="text"/>
</div>
<div>
<label class="block text-xs mb-1 text-gray-400">API Token</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-orange-500 text-sm font-mono text-center" dir="ltr" id="newCf-token" type="password"/>
</div>
<button class="w-full flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 py-2.5 rounded-xl text-sm font-bold transition" onclick="addCfConnection()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    افزودن و بررسی اعتبار
                </button>
</div>
</div></div><div class="contents lg:flex lg:flex-col lg:gap-6 lg:w-1/3 lg:order-2"><div class="order-1 lg:order-none glass-panel p-6 rounded-2xl relative overflow-hidden group">
<div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition duration-700"></div>
<div class="flex justify-between items-start mb-6 relative">
<h2 class="text-lg font-bold flex items-center gap-2 text-white">
<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                        وضعیت مصرف ورکر
                    </h2>
<button class="text-xs text-indigo-400 hover:text-indigo-300" onclick="fetchAllStats()">بارگذاری مجدد</button>
</div>
<p class="text-xs text-gray-500 mb-4 -mt-4">هر اکانت کلودفلری که در بخش «اتصال به API کلودفلر» اضافه کرده باشید، اینجا جداگانه نمایش داده می‌شود.</p>
<div class="grid grid-cols-1 gap-4 relative" id="cf-stats-cards"></div>
<div class="hidden mt-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-lg text-sm flex items-start gap-2" id="cf-no-connections">
<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
<div>
<strong class="block mb-1">هیچ اتصال API ثبت نشده است</strong>
                        برای مشاهده میزان مصرف، در بخش «اتصال به API کلودفلر» یک اکانت اضافه کنید. اگر اصلاً به این آمار نیاز ندارید، همین‌طور که هست هم پنل کاملاً کار می‌کند.
                    </div>
</div>
</div>
<div class="order-4 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    لیست‌های آی‌پی تمیز
                </h2>
<p class="text-xs text-gray-400 mb-4 leading-relaxed">می‌توانید چند لیست جدا بسازید و موقع تنظیم هر لینک/بخش از داخل «ویرایش»، انتخاب کنید کدام لیست استفاده شود. لیست پیش‌فرض پنل قابل ویرایش است ولی حذف نمی‌شود.</p>
<div class="space-y-3 mb-4" id="cleanIpListsContainer"></div>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-2">
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm" id="newListName" placeholder="نام لیست جدید" type="text"/>
<textarea class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 font-mono text-xs" dir="ltr" id="newListIps" placeholder="یک آی‌پی در هر خط" rows="4"></textarea>
<button class="w-full flex items-center justify-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 py-2.5 rounded-xl text-xs font-bold transition" onclick="addCleanIpList()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    ساخت لیست جدید
                </button>
</div>
</div>
<div class="order-6 lg:order-none glass-panel p-6 rounded-2xl">
<h2 class="text-lg font-bold mb-2 text-white flex items-center gap-2">
<svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    پشتیبان‌گیری و انتقال
                </h2>
<p class="text-xs text-gray-400 mb-4 leading-relaxed">یک فایل JSON دانلود یا بازیابی می‌کنید - همان فایلی که برای بازگرداندن پنل بعد از یک اشتباه، کوچ کردن به یک ورکر دیگر، یا فرستادن یک نسخه‌ی آماده برای شخص دیگری لازم دارید.</p>
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">بخش‌های موردنظر (هم برای دانلود، هم برای بازیابی)</label>
<div class="flex flex-col sm:flex-row gap-2 mb-4">
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecSources" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">سابسکریپشن‌ها</span>
</label>
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecLists" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">لیست‌های آی‌پی</span>
</label>
<label class="flex-1 flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer min-w-0">
<input checked class="text-rose-600 shrink-0" id="backupSecCf" type="checkbox"/>
<span class="text-[11px] text-gray-300 truncate">اتصال‌های API</span>
</label>
</div>
</div>
<button class="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 py-2.5 rounded-xl text-sm font-bold transition mb-4 flex items-center justify-center gap-2" onclick="exportBackup()">
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewbox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2-8.485A5 5 0 1118 18H7a5 5 0 01-1-9.9V8a5 5 0 019-3.9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                    دانلود فایل پشتیبان
                </button>
<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-3 space-y-3">
<div>
<label class="block text-xs mb-2 text-gray-400 font-bold">بازیابی از فایل پشتیبان</label>
<input class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs" id="importFileInput" type="file" accept="application/json"/>
</div>
<div class="grid grid-cols-2 gap-2">
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input checked="" class="text-rose-600" id="importModeMerge" name="importMode" type="radio" value="merge"/>
<span class="text-[11px] text-gray-300">افزودن به موجود</span>
</label>
<label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer">
<input class="text-rose-600" id="importModeReplace" name="importMode" type="radio" value="replace"/>
<span class="text-[11px] text-gray-300">جایگزینی کامل</span>
</label>
</div>
<p class="text-[11px] text-gray-500">«افزودن به موجود» فقط موارد جدید را از بخش‌های تیک‌خورده‌ی بالا اضافه می‌کند. «جایگزینی کامل» فقط همان بخش‌های تیک‌خورده را با محتوای فایل عوض می‌کند (بخش‌های تیک‌نخورده دست‌نخورده می‌مانند) و قابل بازگشت نیست.</p>
<button class="w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-xs font-bold transition border border-gray-700" onclick="importBackup()">بازیابی از فایل</button>
</div>
</div>
</div></div><p class="text-center text-[11px] text-gray-600 mt-8">
            ساخته شده توسط <bdi><a href="https://github.com/Yarumin" target="_blank" class="text-gray-500 hover:text-gray-300 transition">Yasin</a></bdi> &amp; <bdi><a href="https://claude.ai" target="_blank" class="text-gray-500 hover:text-gray-300 transition">Claude</a></bdi>
            <span class="text-gray-700 mx-1">&middot;</span>
            <bdi class="text-gray-600">v1.0.0</bdi>
        </p>
    </div>

    <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-24 opacity-0 transition-all duration-300 z-50">
        <div class="flex items-center gap-3">
            <span id="toast-icon"></span>
            <span id="toast-msg"></span>
        </div>
    </div>

    <script>${getDashboardClientScript(baseUrl)}</script>
</body>
</html>`;
}
