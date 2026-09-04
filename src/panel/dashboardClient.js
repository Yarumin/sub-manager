export function getDashboardClientScript(baseUrl) {
  return `
var baseUrl = "${baseUrl}";
// --- i18n ---------------------------------------------------------------
// currentLang is initialized from the same logic dashboardShell.js runs
// before first paint (saved choice, else Persian if the browser is set to
// Persian, else English), kept in sync via toggleLanguage() below.
var currentLang = document.documentElement.lang === "fa" ? "fa" : "en";
var UI_TEXT = {
  fa: {
    appTitle: "پنل مدیریت سابسکریپشن",
    appSubtitle: "مدیریت منابع، لیست‌های آی‌پی تمیز، و اتصال کلودفلر",
    syncAllBtn: "همگام‌سازی همه",
    logoutBtn: "خروج",
    passwordWarning: "⚠️ شما هنوز از رمز پیش‌فرض ناامن استفاده می‌کنید. حتماً یک ADMIN_PASSWORD قوی (از نوع Secret) تنظیم کنید.",
    newSourceTitle: "ایجاد سابسکریپشن جدید",
    newSourceDesc: "یک سابسکریپشن می‌تواند شامل چند لینک منبع، چند کانفیگ مستقیم، یا ترکیبی از هر دو باشد - هر لینک/بلوک، یک «بخش» کاملاً مستقل با تنظیمات خودش می‌شود.",
    sourceNameLabel: "نام نمایشی",
    sourceNamePlaceholder: "مثلاً: سرور آلمان ۱",
    sourceUrlsLabel: "لینک‌های منبع (اختیاری - هر خط یک لینک)",
    keepOriginalNamesLabel: "به‌جای نام‌گذاری خودکار توسط پنل، نام اصلی کانفیگ‌ها حفظ شود",
    sourceManualLabel: "کانفیگ‌های مستقیم (اختیاری - هر خط یک کانفیگ)",
    categoryLabel: "نوع کانفیگ‌ها",
    categoryWorker: "کانفیگ ورکر",
    categoryIndependent: "کانفیگ مستقل",
    useCleanIpLabel: "استفاده از آی‌پی تمیز جایگزین",
    newSourceHint: "این‌ها فقط مقدار اولیه‌اند؛ بعداً از «ویرایش» می‌توانید هر بخش را جداگانه تنظیم کنید (پورت‌ها، لیست آی‌پی، نحوه‌ی توزیع، به‌روزرسانی خودکار و ...).",
    createSourceBtn: "ساخت سابسکریپشن جدید",
    sourcesListTitle: "سابسکریپشن‌ها",
    editorDefaultTitle: "تنظیمات سابسکریپشن",
    closeBtn: "بستن",
    subscriptionAddressLabel: "آدرس سابسکریپشن",
    saveBtn: "ذخیره",
    slugHint: "فقط حروف و عدد انگلیسی، خط تیره و زیرخط؛ بین ۴ تا ۳۲ کاراکتر.",
    editorPartsDesc: "هر لینک/بخش کاملاً مستقل است و تنظیمات خودش را دارد؛ به‌روزرسانی خودکار هم برای هرکدام جداگانه تنظیم می‌شود. فهرست کانفیگ‌های هرکدام همیشه کامل و بدون فیلتر نمایش داده می‌شود؛ فیلترها فقط روی خروجی نهایی اثر می‌گذارند.",
    cfConnectionTitle: "اتصال به API کلودفلر",
    cfConnectionGuide: '<strong class="block text-gray-300 mb-1">این بخش کاملاً اختیاری است - برای آمار مصرف Workers، درصد مصرف کنار نام کانفیگ‌ها، و تنظیم Placement:</strong><p>۱) روی دکمه‌ی «ساخت خودکار توکن در کلودفلر» بزنید. یک صفحه با اکانت و مجوزهای از‌پیش‌انتخاب‌شده (شامل <b>Account Settings: Read</b>، <b>Account Analytics: Read</b>، <b>Workers Scripts: Write</b>) باز می‌شود.</p><p>۲) روی <b>Review token</b> بزنید تا خلاصه‌ی توکن (Token Summary) را ببینید، سپس <b>Create Token</b> را بزنید.</p><p>۳) در صفحه‌ی نهایی، هم <b>Account ID</b> و هم <b>API Token</b> نمایش داده می‌شوند - چون این توکن فقط همان لحظه نمایش داده می‌شود، هر دو را همان‌جا کپی و در قسمت پایین وارد کنید.</p><p class="text-gray-500">در بیشتر موارد مجوز <b>Workers Scripts</b> به‌صورت خودکار اضافه می‌شود؛ اگر نشد، از بخش Custom Token آن را با سطح <b>Write</b> اضافه کنید تا لیست ورکرها و تغییر Placement کار کند (آمار کلی مصرف بدون آن هم کار می‌کند).</p>',
    cfAutoTokenBtn: "ساخت خودکار توکن در کلودفلر",
    cfLabelLabel: "نام نمایشی اکانت در پنل",
    cfAddBtn: "افزودن و بررسی اعتبار",
    cfStatsTitle: "وضعیت مصرف ورکر",
    reloadBtn: "بارگذاری مجدد",
    cfStatsDesc: "هر اکانت کلودفلری که در بخش «اتصال به API کلودفلر» اضافه کرده باشید، اینجا جداگانه نمایش داده می‌شود.",
    cfNoConnTitle: "هیچ اتصال API ثبت نشده است",
    cfNoConnDesc: "برای مشاهده میزان مصرف، در بخش «اتصال به API کلودفلر» یک اکانت اضافه کنید. اگر اصلاً به این آمار نیاز ندارید، همین‌طور که هست هم پنل کاملاً کار می‌کند.",
    cleanIpTitle: "لیست‌های آی‌پی تمیز",
    cleanIpDesc: "می‌توانید چند لیست جدا بسازید و موقع تنظیم هر لینک/بخش از داخل «ویرایش»، انتخاب کنید کدام لیست استفاده شود. لیست پیش‌فرض پنل قابل ویرایش است ولی حذف نمی‌شود.",
    newListNamePlaceholder: "نام لیست جدید",
    newListIpsPlaceholder: "یک آی‌پی در هر خط",
    newListBtn: "ساخت لیست جدید",
    backupTitle: "پشتیبان‌گیری و انتقال",
    backupDesc: "یک فایل JSON دانلود یا بازیابی می‌کنید - همان فایلی که برای بازگرداندن پنل بعد از یک اشتباه، کوچ کردن به یک ورکر دیگر، یا فرستادن یک نسخه‌ی آماده برای شخص دیگری لازم دارید.",
    backupSectionsLabel: "بخش‌های موردنظر (هم برای دانلود، هم برای بازیابی)",
    backupSecSources: "سابسکریپشن‌ها",
    backupSecLists: "لیست‌های آی‌پی",
    backupSecCf: "اتصال‌های API",
    downloadBackupBtn: "دانلود فایل پشتیبان",
    restoreLabel: "بازیابی از فایل پشتیبان",
    importModeMerge: "افزودن به موجود",
    importModeReplace: "جایگزینی کامل",
    importHint: "«افزودن به موجود» فقط موارد جدید را از بخش‌های تیک‌خورده‌ی بالا اضافه می‌کند. «جایگزینی کامل» فقط همان بخش‌های تیک‌خورده را با محتوای فایل عوض می‌کند (بخش‌های تیک‌نخورده دست‌نخورده می‌مانند) و قابل بازگشت نیست.",
    restoreBtn: "بازیابی از فایل",
    madeBy: "ساخته شده توسط",
    newSourceFallbackName: "منبع جدید",
    noSourceYet: "هنوز منبعی ساخته نشده - از فرم بالا شروع کنید.",
    itemsSuffix: "مورد",
    updatedAtLabel: "آپدیت:",
    partsSuffix: "بخش",
    catIndependentLabel: "سرور مستقل",
    catMixedLabel: "ترکیبی",
    catCloudflareLabel: "کلودفلر",
    builtinLabel: "پیش‌فرض",
    truncatedWarning: "⚠️ حداقل یکی از بخش‌های این منبع به سقف تعداد قالب‌ها رسیده.",
    copyLinkBtn: "کپی لینک",
    syncBtn: "سینک",
    editBtn: "ویرایش",
    deleteBtn: "حذف",
    linkCopied: "لینک کپی شد!",
    copyFailed: "کپی خودکار ممکن نشد - لینک:",
    noName: "بدون نام",
    confirmDeleteList: "این لیست حذف شود؟",
    confirmDeleteSource: "آیا این منبع حذف شود؟",
    confirmDeleteSourceCfg: "این منبع حذف شود؟",
    confirmDeletePart: "این بخش به‌طور کامل حذف شود؟ این کار قابل بازگشت نیست.",
    confirmReplaceImport: "این کار بخش‌های تیک‌خورده را با محتوای فایل پشتیبان جایگزین می‌کند و قابل بازگشت نیست. ادامه می‌دهید؟",
    networkError: "خطای شبکه",
    genericError: "خطای شبکه هنگام بررسی اعتبار",
    listSaved: "لیست ذخیره شد",
    listDeleted: "حذف شد",
    listCreated: "لیست ساخته شد",
    listNameIpRequired: "نام و حداقل یک آی‌پی لازم است",
    cfCredsRequired: "وارد کردن Account ID و API Token لازم است",
    cfChecking: "در حال بررسی اعتبار نزد کلودفلر...",
    cfAdded: "اتصال API با موفقیت تأیید و اضافه شد!",
    confirmDeleteCf: "این اتصال API حذف شود؟",
    cfDeleted: "حذف شد",
    cfDeleteFailed: "خطا در حذف",
    fetchingScripts: "در حال دریافت فهرست ورکرها...",
    scriptsFetchFailed: "دریافت فهرست ورکرها ناموفق بود - توکن باید مجوز Workers Scripts داشته باشد.",
    noScriptsFound: "هیچ ورکری در این اکانت یافت نشد.",
    smartPlacementBtn: "Smart Placement",
    defaultPlacementBtn: "پیش‌فرض",
    placementCustomRegionPlaceholder: "-- Region سفارشی/آماده --",
    placementCustomRegionInputPlaceholder: "یا provider:region دلخواه، مثل azure:israelcentral",
    placementCustomRegionHint: "اگر Region سفارشی پر باشد به‌جای گزینه‌ی بالا استفاده می‌شود.",
    placementApplyBtn: "اعمال",
    regionRequired: "یک Region انتخاب یا وارد کنید",
    applying: "در حال اعمال...",
    placementApplied: "Placement اعمال شد.",
    stateLoadFailed: "خطا در دریافت اطلاعات",
    noUrlOrManual: "لطفاً حداقل یک لینک سابسکریپشن یا یک کانفیگ دستی وارد کنید",
    creatingConfigs: "در حال استخراج قالب‌ها و ساخت کانفیگ‌های جدید...",
    sourceAdded: "منبع با موفقیت اضافه شد!",
    syncingOne: "در حال همگام‌سازی این منبع...",
    syncedOne: "همگام‌سازی شد",
    syncingAll: "در حال همگام‌سازی همه‌ی منابع...",
    syncedAll: "با موفقیت همگام‌سازی شد!",
    selectOneSection: "حداقل یک بخش را انتخاب کنید",
    exportingBackup: "در حال ساخت فایل پشتیبان...",
    backupDownloaded: "فایل پشتیبان دانلود شد",
    selectBackupFile: "یک فایل پشتیبان انتخاب کنید",
    invalidJsonFile: "فایل انتخاب‌شده یک JSON معتبر نیست",
    restoringBackup: "در حال بازیابی از فایل پشتیبان...",
    fileReadFailed: "خواندن فایل ناموفق بود",
    importedSourcesLabel: "سابسکریپشن",
    importedListsLabel: "لیست آی‌پی",
    importedCfLabel: "اتصال API",
    importedSuffix: "بازیابی شد",
    configsFetchFailed: "خطا در دریافت کانفیگ‌ها",
    noPartsYet: "این منبع هنوز هیچ بخشی ندارد.",
    slugUpdated: "آدرس سابسکریپشن به‌روزرسانی شد",
    noConfigYet: "هنوز کانفیگی در این بخش نیست.",
    selectAllToggleLabel: "انتخاب/لغو",
    onlyKnownRangesLabel: "فقط جایگزینی هاست‌های کلودفلر",
    onlyKnownRangesHint: "روشن: فقط هاست‌هایی که همین الان یک آی‌پی کلودفلر هستند جایگزین می‌شوند. خاموش: هاست همه‌ی کانفیگ‌های این بخش جایگزین می‌شود.",
    autoRefreshLabel: "به‌روزرسانی خودکار این لینک",
    everyLabel: "هر",
    minutesLabel: "دقیقه",
    distributionLabel: "نحوه‌ی توزیع آی‌پی",
    multiplyLabel: "تکثیر",
    randomLabel: "تصادفی",
    portsLabel: "پورت‌های مورد نیاز (خالی = همه)",
    oneConfigPerPortLabel: "یک کانفیگ برای هر مقصد",
    oneConfigPerPortHint: "از بین کانفیگ‌هایی که سرور و پورت مقصدشان یکسان است، هر بار فقط یکی (به‌صورت ثابت) در خروجی نهایی استفاده می‌شود.",
    partTruncatedWarning: "⚠️ این بخش به سقف تعداد قالب‌ها رسیده.",
    savePartBtn: "ذخیره تنظیمات این بخش",
    addConfigPlaceholder: "vless://...",
    addBtn: "افزودن",
    autoNumberLabel: "شماره‌گذاری خودکار",
    cleanIpListLabel: "لیست آی‌پی تمیز",
    manualConfigsTitle: "کانفیگ‌های دستی",
    sourcePrefixLabel: "منبع",
    noManualPartYet: "این منبع هنوز بخش «کانفیگ‌های دستی» ندارد.",
    displaySettingsSummary: "تنظیمات نمایش نام کانفیگ",
    emojiToggleLabel: "افزودن ایموجی قبل از نام کانفیگ‌ها",
    usagePercentToggleLabel: "نمایش درصد مصرف ورکر جلوی نام",
    usagePercentHint: "فقط برای کانفیگ‌های VLESS/Trojan/Shadowsocks کار می‌کند؛ کانفیگ‌های VMess به‌دلیل ساختار base64 پشتیبانی نمی‌شوند.",
    selectCfConnPlaceholder: "-- انتخاب اتصال API --",
    selectFirstConnHint: "-- ابتدا اتصال را انتخاب کنید --",
    fetchingEllipsis: "-- در حال دریافت... --",
    noScriptsOptionLabel: "-- ورکری یافت نشد --",
    fetchErrorOptionLabel: "-- خطا در دریافت --",
    needConnAndScript: "یک اتصال API و یک ورکر انتخاب کنید",
    noCfConnYetHint: "ابتدا از بخش «اتصال به API کلودفلر» یک اکانت اضافه کنید.",
    uploadLimitFixTitle: "رفع محدودیت آپلود / دور زدن فیلتر دامنه",
    tlsOnlyBadge: "فقط کانفیگ‌های TLS",
    uploadBoostDesc: "با روش پترنیها، اثر انگشت TLS و تنظیمات فرگمنت را روی کانفیگ‌های TLS تغییر می‌دهد تا شناسایی و محدودسازی توسط فیلترینگ سخت‌تر شود. کلاینت پیشنهادی سازگار با این روش :",
    uploadBoostEmptyHint: "هر کدام از سه فیلد زیر (fp/cs/fm) را خالی بگذارید و ذخیره کنید تا همان لایه اصلاً در کانفیگ اعمال نشود.",
    protocolsApplyLabel: "این تنظیمات روی کدام پروتکل‌ها اعمال شود؟",
    advancedSettingsSummary: "تنظیمات پیشرفته (هر پارامتر جدا قابل تنظیم است)",
    fpLabel: "اثر انگشت TLS (fp)",
    csLabel: "لیست رمزنگارها (cs) - فقط برای security=tls",
    fmLabel: "تنظیمات فرگمنت (fm) - فقط برای security=tls",
    resetToDefaultBtn: "بازنشانی به پیش‌فرض",
    fpPresetPlaceholderCustom: "-- سفارشی (مقدار وارد شده با هیچ پیش‌فرضی مطابقت ندارد) --",
    fpPresetPlaceholderPick: "-- انتخاب سریع از پیش‌فرض‌ها --",
    randomFmLabel: "تصادفی (هر بار همگام‌سازی، پنل خودش با الگوریتم داخلی مقادیر عددی جدید تولید می‌کند)",
    randomOtherLabel: "تصادفی (هر بار همگام‌سازی، یکی از مقادیر پیشنهادی بالا به‌صورت شانسی انتخاب می‌شود)",
    uploadBoostResetDone: "تنظیمات به مقادیر پیش‌فرض پترنیها برگشت",
    autoRefreshMinInvalid: "حداقل فاصله‌ی به‌روزرسانی ۱۵ دقیقه است",
    partSettingsSaveFailed: "ذخیره تغییرات ناموفق بود",
    partSettingsSaved: "تنظیمات این بخش ذخیره شد",
    blockedConfigsCapped: "برخی کانفیگ‌ها به سقف تعداد بلاک رسیدند و اعمال نشدند",
    configRequired: "یک کانفیگ وارد کنید",
    configAdded: "کانفیگ اضافه شد",
    deleteEntirePart: "حذف این بخش",
    editNameTitle: "برای تغییر نام این کانفیگ کلیک کنید",
    includeInOutputTitle: "استفاده در خروجی نهایی",
    dragHandleTitle: "برای جابه‌جایی نگه دارید و بکشید",
    undoTitle: "بازگردانی",
    deleteTitle: "حذف",
    fetchOkTitle: "آخرین واکشی موفق",
    fetchFailTitle: "آخرین واکشی ناموفق - نسخه‌ی قبلی حفظ شد",
    partDeleted: "بخش حذف شد"
  },
  en: {
    appTitle: "Subscription Manager Panel",
    appSubtitle: "Manage sources, clean IP lists, and Cloudflare connections",
    syncAllBtn: "Sync All",
    logoutBtn: "Logout",
    passwordWarning: "⚠️ You're still using the insecure default password. Set a strong ADMIN_PASSWORD (as a Secret).",
    newSourceTitle: "Create New Subscription",
    newSourceDesc: "A subscription can include several source links, several direct configs, or a mix of both - each link/block becomes a fully independent “part” with its own settings.",
    sourceNameLabel: "Display name",
    sourceNamePlaceholder: "e.g. Germany Server 1",
    sourceUrlsLabel: "Source links (optional - one per line)",
    keepOriginalNamesLabel: "Keep configs' original names instead of the panel's automatic naming",
    sourceManualLabel: "Direct configs (optional - one per line)",
    categoryLabel: "Config type",
    categoryWorker: "Worker config",
    categoryIndependent: "Independent config",
    useCleanIpLabel: "Use a clean IP replacement",
    newSourceHint: "These are just the starting values; later, from “Edit”, you can configure each part separately (ports, IP list, distribution, auto-refresh, etc.).",
    createSourceBtn: "Create Subscription",
    sourcesListTitle: "Subscriptions",
    editorDefaultTitle: "Subscription settings",
    closeBtn: "Close",
    subscriptionAddressLabel: "Subscription address",
    saveBtn: "Save",
    slugHint: "Latin letters and digits, dashes and underscores only; 4 to 32 characters.",
    editorPartsDesc: "Each link/part is fully independent and has its own settings; auto-refresh is also set separately for each. Each part's config list is always shown complete and unfiltered; filters only affect the final output.",
    cfConnectionTitle: "Cloudflare API Connection",
    cfConnectionGuide: '<strong class="block text-gray-300 mb-1">This section is entirely optional - it powers Workers usage stats, live usage % next to config names, and Placement control:</strong><p>1) Click \u201cAuto-create a Cloudflare token\u201d. A page opens with the account and permissions pre-selected (including <b>Account Settings: Read</b>, <b>Account Analytics: Read</b>, <b>Workers Scripts: Write</b>).</p><p>2) Click <b>Review token</b> to see the Token Summary, then click <b>Create Token</b>.</p><p>3) On the final page, both the <b>Account ID</b> and the <b>API Token</b> are shown - since the token is only ever shown that one time, copy both right there and paste them in below.</p><p class="text-gray-500">In most cases the <b>Workers Scripts</b> permission gets added automatically; if it doesn\u2019t, add it with <b>Write</b> access from the Custom Token section so the worker list and Placement changes work (overall usage stats work fine without it).</p>',
    cfAutoTokenBtn: "Auto-create a Cloudflare token",
    cfLabelLabel: "Display name for this account in the panel",
    cfAddBtn: "Add and verify",
    cfStatsTitle: "Worker Usage Status",
    reloadBtn: "Reload",
    cfStatsDesc: "Every Cloudflare account you've added under “Cloudflare API Connection” is shown here separately.",
    cfNoConnTitle: "No API connection added yet",
    cfNoConnDesc: "To see usage, add an account under “Cloudflare API Connection”. If you don't need this at all, the panel works fine without it.",
    cleanIpTitle: "Clean IP Lists",
    cleanIpDesc: "You can create several separate lists and pick which one to use per link/part from “Edit”. The panel's default list can be edited but not deleted.",
    newListNamePlaceholder: "New list name",
    newListIpsPlaceholder: "One IP per line",
    newListBtn: "Create New List",
    backupTitle: "Backup & Transfer",
    backupDesc: "Download or restore a JSON file - the same file you'll need to recover the panel after a mistake, migrate to another Worker, or send a ready-made copy to someone else.",
    backupSectionsLabel: "Sections to include (for both download and restore)",
    backupSecSources: "Subscriptions",
    backupSecLists: "IP lists",
    backupSecCf: "API connections",
    downloadBackupBtn: "Download Backup File",
    restoreLabel: "Restore from backup file",
    importModeMerge: "Add to existing",
    importModeReplace: "Full replace",
    importHint: "“Add to existing” only adds new items from the checked sections above. “Full replace” swaps only the checked sections with the file's content (unchecked sections stay untouched) and cannot be undone.",
    restoreBtn: "Restore from file",
    madeBy: "Made by",
    newSourceFallbackName: "New source",
    noSourceYet: "No source created yet - start with the form above.",
    itemsSuffix: "items",
    updatedAtLabel: "Updated:",
    partsSuffix: "parts",
    catIndependentLabel: "Independent server",
    catMixedLabel: "Mixed",
    catCloudflareLabel: "Cloudflare",
    builtinLabel: "Default",
    truncatedWarning: "⚠️ At least one part of this source has hit the template count limit.",
    copyLinkBtn: "Copy Link",
    syncBtn: "Sync",
    editBtn: "Edit",
    deleteBtn: "Delete",
    linkCopied: "Link copied!",
    copyFailed: "Couldn't copy automatically - link:",
    noName: "Unnamed",
    confirmDeleteList: "Delete this list?",
    confirmDeleteSource: "Delete this source?",
    confirmDeleteSourceCfg: "Delete this source?",
    confirmDeletePart: "Completely delete this part? This can't be undone.",
    confirmReplaceImport: "This will replace the checked sections with the backup file's content and can't be undone. Continue?",
    networkError: "Network error",
    genericError: "Network error while verifying",
    listSaved: "List saved",
    listDeleted: "Deleted",
    listCreated: "List created",
    listNameIpRequired: "A name and at least one IP are required",
    cfCredsRequired: "Account ID and API Token are required",
    cfChecking: "Verifying with Cloudflare...",
    cfAdded: "API connection verified and added successfully!",
    confirmDeleteCf: "Delete this API connection?",
    cfDeleted: "Deleted",
    cfDeleteFailed: "Failed to delete",
    fetchingScripts: "Fetching worker list...",
    scriptsFetchFailed: "Failed to fetch worker list - the token needs Workers Scripts permission.",
    noScriptsFound: "No workers found in this account.",
    smartPlacementBtn: "Smart Placement",
    defaultPlacementBtn: "Default",
    placementCustomRegionPlaceholder: "-- Custom/preset region --",
    placementCustomRegionInputPlaceholder: "or a custom provider:region, e.g. azure:israelcentral",
    placementCustomRegionHint: "If the custom region field is filled, it's used instead of the option above.",
    placementApplyBtn: "Apply",
    regionRequired: "Select or enter a region",
    applying: "Applying...",
    placementApplied: "Placement applied.",
    stateLoadFailed: "Error loading data",
    noUrlOrManual: "Please enter at least one subscription link or one manual config",
    creatingConfigs: "Extracting templates and creating new configs...",
    sourceAdded: "Source added successfully!",
    syncingOne: "Syncing this source...",
    syncedOne: "Synced",
    syncingAll: "Syncing all sources...",
    syncedAll: "Synced successfully!",
    selectOneSection: "Select at least one section",
    exportingBackup: "Creating backup file...",
    backupDownloaded: "Backup file downloaded",
    selectBackupFile: "Select a backup file",
    invalidJsonFile: "The selected file is not valid JSON",
    restoringBackup: "Restoring from backup file...",
    fileReadFailed: "Failed to read file",
    importedSourcesLabel: "subscription(s)",
    importedListsLabel: "IP list(s)",
    importedCfLabel: "API connection(s)",
    importedSuffix: "restored",
    configsFetchFailed: "Error fetching configs",
    noPartsYet: "This source has no parts yet.",
    slugUpdated: "Subscription address updated",
    noConfigYet: "No configs in this part yet.",
    selectAllToggleLabel: "Select/deselect all",
    onlyKnownRangesLabel: "Only replace Cloudflare hosts",
    onlyKnownRangesHint: "On: only hosts that are currently a Cloudflare IP get replaced. Off: the host of every config in this part gets replaced.",
    autoRefreshLabel: "Auto-refresh this link",
    everyLabel: "Every",
    minutesLabel: "minutes",
    distributionLabel: "IP distribution method",
    multiplyLabel: "Multiply",
    randomLabel: "Random",
    portsLabel: "Required ports (empty = all)",
    oneConfigPerPortLabel: "One config per destination",
    oneConfigPerPortHint: "Among configs that share the same destination server and port, only one (chosen consistently) is used in the final output at a time.",
    partTruncatedWarning: "⚠️ This part has hit the template count limit.",
    savePartBtn: "Save this part's settings",
    addConfigPlaceholder: "vless://...",
    addBtn: "Add",
    autoNumberLabel: "Auto-numbering",
    cleanIpListLabel: "Clean IP list",
    manualConfigsTitle: "Manual Configs",
    sourcePrefixLabel: "Source",
    noManualPartYet: "This source doesn't have a “manual configs” part yet.",
    displaySettingsSummary: "Config name display settings",
    emojiToggleLabel: "Add an emoji before config names",
    usagePercentToggleLabel: "Show live worker usage % in the name",
    usagePercentHint: "Only works for VLESS/Trojan/Shadowsocks configs; VMess configs aren't supported due to their base64 structure.",
    selectCfConnPlaceholder: "-- Select an API connection --",
    selectFirstConnHint: "-- Select a connection first --",
    fetchingEllipsis: "-- Loading... --",
    noScriptsOptionLabel: "-- No workers found --",
    fetchErrorOptionLabel: "-- Fetch error --",
    needConnAndScript: "Select an API connection and a worker",
    noCfConnYetHint: "First add an account under “Cloudflare API Connection”.",
    uploadLimitFixTitle: "Upload limit bypass / domain filtering bypass",
    tlsOnlyBadge: "TLS configs only",
    uploadBoostDesc: "Using the Patternia method, changes the TLS fingerprint and fragment settings on TLS configs to make detection and throttling by filtering harder. Recommended compatible client:",
    uploadBoostEmptyHint: "Leave any of the three fields below (fp/cs/fm) empty and save to skip applying that layer to the config at all.",
    protocolsApplyLabel: "Which protocols should this apply to?",
    advancedSettingsSummary: "Advanced settings (each parameter is separately adjustable)",
    fpLabel: "TLS fingerprint (fp)",
    csLabel: "Cipher suites (cs) - only for security=tls",
    fmLabel: "Fragment settings (fm) - only for security=tls",
    resetToDefaultBtn: "Reset to defaults",
    fpPresetPlaceholderCustom: "-- Custom (value doesn't match any preset) --",
    fpPresetPlaceholderPick: "-- Quick pick from presets --",
    randomFmLabel: "Random (on every sync, the panel generates new numeric values itself using an internal algorithm)",
    randomOtherLabel: "Random (on every sync, one of the presets above is picked at random)",
    uploadBoostResetDone: "Settings reset to Patternia defaults",
    autoRefreshMinInvalid: "The minimum refresh interval is 15 minutes",
    partSettingsSaveFailed: "Failed to save changes",
    partSettingsSaved: "This part's settings were saved",
    blockedConfigsCapped: "Some configs hit the block-count limit and weren't applied",
    configRequired: "Enter a config",
    configAdded: "Config added",
    deleteEntirePart: "Delete this part",
    editNameTitle: "Click to rename this config",
    includeInOutputTitle: "Include in final output",
    dragHandleTitle: "Hold and drag to reorder",
    undoTitle: "Undo",
    deleteTitle: "Delete",
    fetchOkTitle: "Last fetch succeeded",
    fetchFailTitle: "Last fetch failed - the previous version was kept",
    partDeleted: "Part deleted"
  }
};
function t(key) {
  var dict = UI_TEXT[currentLang] || UI_TEXT.en;
  return dict.hasOwnProperty(key) ? dict[key] : (UI_TEXT.en[key] || key);
}
function applyStaticTranslations() {
  document.title = t("appTitle");
  var pageTitleEl = document.getElementById("pageTitle");
  if (pageTitleEl) pageTitleEl.textContent = t("appTitle");
  Array.prototype.slice.call(document.querySelectorAll("[data-i18n]")).forEach(function(el) {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  Array.prototype.slice.call(document.querySelectorAll("[data-i18n-placeholder]")).forEach(function(el) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  Array.prototype.slice.call(document.querySelectorAll("[data-i18n-html]")).forEach(function(el) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  var langLabel = document.getElementById("langToggleLabel");
  if (langLabel) langLabel.textContent = currentLang === "fa" ? "EN" : "FA";
}
function toggleLanguage() {
  currentLang = currentLang === "fa" ? "en" : "fa";
  try {
    localStorage.setItem("subManagerLang", currentLang);
  } catch (e) {}
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "fa" ? "rtl" : "ltr";
  document.documentElement.classList.toggle("lang-en", currentLang === "en");
  applyStaticTranslations();
  loadData();
  if (editorSourceId) refreshConfigEditor();
}
applyStaticTranslations();
var cleanIpListsCache = [];
var sourceItemsCache = [];
var editorSourceId = null;
var pendingNameEdits = {};
var pendingDeletes = {};
var pendingIncluded = {};
var pendingOrder = {};
var editorPartsCache = {};
var editorPartsOrder = [];
var editorListsCache = [];
var editorCfConnectionsCache = [];
function uploadBoostFpPresets() {
  return currentLang === "fa" ? [
    { value: "unsafe", label: "پترنیها - unsafe (پیشنهادی)" },
    { value: "chrome", label: "Chrome" },
    { value: "firefox", label: "Firefox" },
    { value: "safari", label: "Safari" },
    { value: "ios", label: "iOS Safari" },
    { value: "android", label: "Android Chrome" },
    { value: "edge", label: "Edge" },
    { value: "none", label: "None (بدون اثر انگشت)" }
  ] : [
    { value: "unsafe", label: "Patternia - unsafe (recommended)" },
    { value: "chrome", label: "Chrome" },
    { value: "firefox", label: "Firefox" },
    { value: "safari", label: "Safari" },
    { value: "ios", label: "iOS Safari" },
    { value: "android", label: "Android Chrome" },
    { value: "edge", label: "Edge" },
    { value: "none", label: "None (no fingerprint)" }
  ];
}
function uploadBoostCsPresets() {
  var labels = currentLang === "fa"
    ? { patternia: "پترنیها (پیشنهادی)", chrome_mobile: "Chrome موبایل", firefox: "Firefox", chrome_desktop: "Chrome دسکتاپ", safari: "Safari", tls13_only: "فقط TLS 1.3", mixed: "ترکیبی (مدرن اول)" }
    : { patternia: "Patternia (recommended)", chrome_mobile: "Chrome Mobile", firefox: "Firefox", chrome_desktop: "Chrome Desktop", safari: "Safari", tls13_only: "TLS 1.3 only", mixed: "Mixed (modern first)" };
  return [
    { key: "patternia", label: labels.patternia, value: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256" },
    { key: "chrome_mobile", label: labels.chrome_mobile, value: "TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384" },
    { key: "firefox", label: labels.firefox, value: "TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA" },
    { key: "chrome_desktop", label: labels.chrome_desktop, value: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA" },
    { key: "safari", label: labels.safari, value: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA" },
    { key: "tls13_only", label: labels.tls13_only, value: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256" },
    { key: "mixed", label: labels.mixed, value: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA" }
  ];
}
function uploadBoostFmPresets() {
  var labels = currentLang === "fa"
    ? { patternia: "پترنیها (پیشنهادی)", aggressive: "تهاجمی (تکه‌های خیلی کوچک)", balanced: "متعادل", fast: "سریع (تکه‌های بزرگ‌تر)" }
    : { patternia: "Patternia (recommended)", aggressive: "Aggressive (very small chunks)", balanced: "Balanced", fast: "Fast (larger chunks)" };
  return [
    { key: "patternia", label: labels.patternia, value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}' },
    { key: "aggressive", label: labels.aggressive, value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["1","50","2"],"delays":["1"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["40","1"],"delays":["2"],"maxSplit":"500"}}]}' },
    { key: "balanced", label: labels.balanced, value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["3","120","2"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["80","2"],"delays":["1"],"maxSplit":"300"}}]}' },
    { key: "fast", label: labels.fast, value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["8","180","3"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["150","2"],"delays":["0"],"maxSplit":"200"}}]}' }
  ];
}
function placementRegionPresets() {
  return [
    { value: "azure:israelcentral", label: "Azure - Israel Central" },
    { value: "gcp:me-west1", label: "GCP - Tel Aviv (me-west1)" },
    { value: "aws:me-south1", label: "AWS - Bahrain (me-south1)" },
    { value: "azure:uaenorth", label: "Azure - UAE North" },
    { value: "aws:eu-central-1", label: "AWS - Frankfurt (eu-central-1)" },
    { value: "gcp:europe-west1", label: "GCP - Belgium (europe-west1)" },
    { value: "azure:westeurope", label: "Azure - West Europe" },
    { value: "aws:us-east-1", label: "AWS - N. Virginia (us-east-1)" },
    { value: "aws:us-west-1", label: "AWS - N. California (us-west-1)" },
    { value: "gcp:us-central1", label: "GCP - Iowa (us-central1)" },
    { value: "azure:eastus", label: "Azure - East US" },
    { value: "aws:ap-southeast-1", label: "AWS - Singapore (ap-southeast-1)" },
    { value: "gcp:asia-east1", label: "GCP - Taiwan (asia-east1)" },
    { value: "azure:southeastasia", label: "Azure - Southeast Asia" },
    { value: "aws:ap-northeast-1", label: "AWS - Tokyo (ap-northeast-1)" },
    { value: "gcp:australia-southeast1", label: "GCP - Sydney (australia-southeast1)" }
  ];
}
// Renders one upload-boost field (fp/cs/fm): a preset dropdown that just
// fills the paired text field on selection (it does not stay "bound" to the
// current value - the text field is the single source of truth), the text
// field itself (editable by hand, empty means "off" for this layer), and a
// "random" checkbox that - when checked - disables both and means the
// value is regenerated fresh on every subscription sync (see backend
// configEngine/part.js resolveUploadBoostFieldForGeneration).
function uploadBoostFieldHtml(field, partId, currentValue, labelText) {
  var isRandom = (currentValue || "").trim().toLowerCase() === "random";
  var textValue = isRandom ? "" : currentValue || "";
  var presets = field === "fp" ? uploadBoostFpPresets() : field === "cs" ? uploadBoostCsPresets() : uploadBoostFmPresets();
  var matchedPreset = presets.find(function(p) {
    return (p.value !== undefined ? p.value : p.key) === textValue;
  });
  var placeholderLabel = matchedPreset ? t("fpPresetPlaceholderCustom") : t("fpPresetPlaceholderPick");
  // The placeholder option is re-labeled "custom" once a non-preset value is
  // present, and re-selected, so the dropdown always reflects reality
  // instead of silently reverting to "-- quick pick --" after a preset (or
  // a hand-typed value) is already in the text field.
  var optionsHtml = '<option value=""' + (matchedPreset ? "" : " selected") + ">" + placeholderLabel + "</option>" + presets.map(function(p) {
    var value = p.value !== undefined ? p.value : p.key;
    return '<option value="' + escapeHtml(value) + '"' + (matchedPreset && value === textValue ? " selected" : "") + ">" + escapeHtml(p.label) + "</option>";
  }).join("");
  var fieldId = "uploadBoost" + field.toUpperCase() + "-" + partId;
  var selectId = "uploadBoost" + field.toUpperCase() + "Select-" + partId;
  var randomId = "uploadBoost" + field.toUpperCase() + "Random-" + partId;
  var textFieldHtml = field === "fp"
    ? '<input id="' + fieldId + '" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs mt-1.5" dir="ltr" value="' + escapeHtml(textValue) + '"' + (isRandom ? " disabled" : "") + ">"
    : '<textarea id="' + fieldId + '" class="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[10px] mt-1.5" dir="ltr" rows="' + (field === "fm" ? 3 : 2) + '"' + (isRandom ? " disabled" : "") + ">" + escapeHtml(textValue) + "</textarea>";
  // fp/cs randomize by picking one of a fixed list of valid presets on
  // every sync; fm randomize by generating a fresh set of numeric
  // parameters (within vetted ranges) on every sync instead - these are
  // genuinely different mechanisms, so the checkbox label says which one.
  var randomLabel = field === "fm" ? t("randomFmLabel") : t("randomOtherLabel");
  return (
    '<div><label class="block text-[10px] mb-1 text-gray-400">' + labelText + "</label>" +
    '<select class="upload-boost-preset-select w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs" dir="ltr" data-field="' + fieldId + '"' + (isRandom ? " disabled" : "") + ' id="' + selectId + '">' + optionsHtml + "</select>" +
    textFieldHtml +
    '<label class="flex items-center gap-2 cursor-pointer mt-1.5"><input type="checkbox" class="upload-boost-random-cb h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600" data-select="' + selectId + '" data-field="' + fieldId + '" id="' + randomId + '"' + (isRandom ? " checked" : "") + '><span class="text-[10px] text-gray-500">' + randomLabel + "</span></label>" +
    '</div>'
  );
}
function markUploadBoostSelectAsCustom(selectEl) {
  var placeholderOption = selectEl.querySelector('option[value=""]');
  if (placeholderOption) placeholderOption.textContent = t("fpPresetPlaceholderCustom");
  selectEl.value = "";
}
document.body.addEventListener("change", function(e) {
  var presetSelect = e.target.closest(".upload-boost-preset-select");
  if (presetSelect) {
    if (!presetSelect.value) return; // user picked the placeholder itself - nothing to do
    var fieldEl = document.getElementById(presetSelect.getAttribute("data-field"));
    if (fieldEl) fieldEl.value = presetSelect.value;
    // Leave the select showing the preset just picked (do NOT reset it back
    // to the placeholder) - it now correctly reflects what's in the field.
    return;
  }
  var randomCb = e.target.closest(".upload-boost-random-cb");
  if (randomCb) {
    var targetField = document.getElementById(randomCb.getAttribute("data-field"));
    var targetSelect = document.getElementById(randomCb.getAttribute("data-select"));
    if (targetField) targetField.disabled = randomCb.checked;
    if (targetSelect) targetSelect.disabled = randomCb.checked;
    return;
  }
});
// Keeps the preset <select> in sync when the user hand-edits the paired
// text field directly (rather than through the dropdown): if the typed
// value now matches a known preset, that preset is auto-selected; if not,
// the placeholder relabels itself to "custom" so the dropdown never shows a
// stale/misleading preset name.
document.body.addEventListener("input", function(e) {
  var fieldEl = e.target;
  if (!fieldEl.id || fieldEl.tagName !== "INPUT" && fieldEl.tagName !== "TEXTAREA") return;
  if (fieldEl.id.indexOf("uploadBoostFP-") !== 0 && fieldEl.id.indexOf("uploadBoostCS-") !== 0 && fieldEl.id.indexOf("uploadBoostFM-") !== 0) return;
  var selectId = fieldEl.id.replace(/^uploadBoost([A-Z]+)-/, "uploadBoost$1Select-");
  var selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  var matchingOption = Array.prototype.slice.call(selectEl.options).find(function(opt) {
    return opt.value && opt.value === fieldEl.value;
  });
  if (matchingOption) {
    selectEl.value = matchingOption.value;
  } else {
    markUploadBoostSelectAsCustom(selectEl);
  }
});
function readUploadBoostField(field, partId) {
  var randomCb = document.getElementById("uploadBoost" + field.toUpperCase() + "Random-" + partId);
  if (randomCb && randomCb.checked) return "random";
  var fieldEl = document.getElementById("uploadBoost" + field.toUpperCase() + "-" + partId);
  return fieldEl ? fieldEl.value.trim() : "";
}
function resetUploadBoostDefaults(partId) {
  var fpField = document.getElementById("uploadBoostFP-" + partId);
  var csField = document.getElementById("uploadBoostCS-" + partId);
  var fmField = document.getElementById("uploadBoostFM-" + partId);
  var fpRandom = document.getElementById("uploadBoostFPRandom-" + partId);
  var csRandom = document.getElementById("uploadBoostCSRandom-" + partId);
  var fmRandom = document.getElementById("uploadBoostFMRandom-" + partId);
  var vlessEl = document.getElementById("uploadBoostProtoVless-" + partId);
  var trojanEl = document.getElementById("uploadBoostProtoTrojan-" + partId);
  if (fpField) { fpField.value = "unsafe"; fpField.disabled = false; }
  if (csField) { csField.value = uploadBoostCsPresets()[0].value; csField.disabled = false; }
  if (fmField) { fmField.value = uploadBoostFmPresets()[0].value; fmField.disabled = false; }
  if (fpRandom) fpRandom.checked = false;
  if (csRandom) csRandom.checked = false;
  if (fmRandom) fmRandom.checked = false;
  // Also point each preset <select> at the value just restored - otherwise
  // the dropdown is left showing whatever it displayed before the reset
  // (often the blank/custom placeholder) instead of the Patternia preset
  // that was actually just applied to the field.
  ["FP", "CS", "FM"].forEach(function(field) {
    var sel = document.getElementById("uploadBoost" + field + "Select-" + partId);
    var fieldEl = document.getElementById("uploadBoost" + field + "-" + partId);
    if (sel) {
      sel.disabled = false;
      if (fieldEl) sel.value = fieldEl.value;
    }
  });
  if (vlessEl) vlessEl.checked = true;
  if (trojanEl) trojanEl.checked = true;
  showToast(t("uploadBoostResetDone"), "success");
}
function escapeHtml(s) {
  var str = s === null || s === void 0 ? "" : String(s);
  return str.replace(/[&<>"']/g, function(c) {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}
function showToast(msg, type) {
  type = type || "success";
  var toast = document.getElementById("toast");
  var msgEl = document.getElementById("toast-msg");
  var iconEl = document.getElementById("toast-icon");
  msgEl.textContent = msg;
  if (type === "success") {
    toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white px-6 py-3 rounded-full shadow-2xl border border-emerald-400 flex items-center gap-3 transform translate-y-0 opacity-100 transition-all duration-300 z-50";
    iconEl.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
  } else {
    toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-2xl border border-red-400 flex items-center gap-3 transform translate-y-0 opacity-100 transition-all duration-300 z-50";
    iconEl.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  }
  setTimeout(function() {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-24", "opacity-0");
  }, 3e3);
}
var ERROR_MESSAGES_FA = {
  EXPORT_FAILED: "ساخت فایل پشتیبان ناموفق بود",
  IMPORT_INVALID_BACKUP: "فایل پشتیبان نامعتبر است یا خراب شده",
  LIST_NAME_REQUIRED: "یک نام برای این لیست وارد کنید",
  LIST_NEEDS_ONE_IP: "حداقل یک آی‌پی در لیست لازم است",
  LIST_ADD_FAILED: "افزودن لیست ناموفق بود",
  LIST_NOT_FOUND: "لیست یافت نشد",
  LIST_UPDATE_FAILED: "ویرایش لیست ناموفق بود",
  LIST_DEFAULT_UNDELETABLE: "لیست پیش‌فرض پنل قابل حذف نیست",
  LIST_DELETE_FAILED: "حذف لیست ناموفق بود",
  LIST_MAX_IPS: "حداکثر {limit} آی‌پی در هر لیست مجاز است.",
  LIST_MAX_LISTS: "حداکثر {limit} لیست مجاز است.",
  SOURCE_NOT_FOUND: "منبع یافت نشد",
  SOURCE_NEEDS_URL_OR_MANUAL: "حداقل یک لینک سابسکریپشن یا یک کانفیگ دستی وارد کنید",
  SOURCE_NO_VALID_CONFIGS: "هیچ کانفیگ معتبری استخراج نشد",
  SOURCE_ADD_FAILED: "افزودن منبع ناموفق بود",
  SOURCE_DELETE_FAILED: "حذف ناموفق بود",
  SOURCE_MAX_URLS: "حداکثر {limit} لینک مجاز است.",
  SOURCE_MAX_MANUAL_LINES: "حداکثر {limit} خط دستی مجاز است.",
  SLUG_TAKEN: "این لینک قبلاً برای یک سابسکریپشن دیگر استفاده شده است.",
  SLUG_UPDATE_FAILED: "تغییر لینک ناموفق بود",
  SLUG_INVALID_FORMAT: "لینک باید بین {min} تا {max} کاراکتر انگلیسی، عدد، خط تیره یا زیرخط باشد.",
  PART_NOT_FOUND: "این بخش یافت نشد",
  PART_UPDATE_FAILED: "به‌روزرسانی ناموفق بود",
  PART_DELETE_FAILED: "حذف این بخش ناموفق بود",
  CONFIG_BATCH_UPDATE_FAILED: "ذخیره تغییرات ناموفق بود",
  PART_MAX_CONFIGS: "این بخش به سقف {limit} قالب رسیده است.",
  PART_MAX_BLOCKED: "حداکثر {limit} کانفیگ بلاک‌شده در هر بخش مجاز است.",
  PART_MAX_CUSTOM_NAMES: "سقف تعداد نام‌های سفارشی این بخش ({limit}) پر شده است.",
  PART_OUTPUT_TRUNCATED: "تعداد کانفیگ نهایی این بخش از سقف مجاز ({limit}) بیشتر بود؛ فقط {kept} کانفیگ از {total} به‌صورت تصادفی در خروجی قرار گرفت.",
  SYNC_FAILED: "همگام‌سازی ناموفق بود",
  CONFIG_EMPTY: "کانفیگ خالی است",
  CONFIG_INVALID_FORMAT: "فرمت کانفیگ نامعتبر است",
  CONFIG_DUPLICATE: "این کانفیگ از قبل وجود دارد",
  CONFIG_ADD_FAILED: "افزودن کانفیگ ناموفق بود",
  CONFIG_NOT_FOUND: "کانفیگ یافت نشد",
  CONFIG_DELETE_FAILED: "حذف ناموفق بود",
  CONFIG_TOGGLE_FAILED: "تغییر وضعیت بلاک ناموفق بود",
  CONFIG_BULK_TOGGLE_FAILED: "تغییر وضعیت گروهی ناموفق بود",
  CONFIG_RENAME_FAILED: "تغییر نام ناموفق بود",
  CONFIG_REORDER_FAILED: "تغییر ترتیب ناموفق بود",
  CF_CONNECTION_ADD_FAILED: "افزودن اتصال API ناموفق بود",
  CF_CONNECTION_DELETE_FAILED: "حذف اتصال API ناموفق بود",
  CF_CONNECTION_NOT_FOUND: "این اتصال API یافت نشد",
  CF_CREDENTIALS_REQUIRED: "وارد کردن Account ID و API Token لازم است",
  CF_TOKEN_INVALID: "Account ID یا API Token نادرست است، یا توکن به این اکانت دسترسی ندارد",
  CF_VALIDATION_FAILED: "اتصال به کلودفلر برای اعتبارسنجی ناموفق بود",
  CF_ACCOUNT_ID_INVALID: "Account ID این اتصال نامعتبر است",
  CF_STATS_FETCH_FAILED: "دریافت آمار از کلودفلر ناموفق بود",
  CF_STATS_NO_ACCESS: "این توکن به اطلاعات آماری این اکانت دسترسی ندارد",
  CF_SCRIPTS_LIST_FAILED: "دریافت فهرست ورکرها ناموفق بود",
  CF_REGIONS_LIST_FAILED: "دریافت فهرست ریجن‌ها ناموفق بود",
  CF_SCRIPT_NAME_REQUIRED: "انتخاب یک ورکر لازم است",
  CF_PLACEMENT_INVALID: "حالت Placement نامعتبر است",
  CF_PLACEMENT_UPDATE_FAILED: "اعمال Placement ناموفق بود",
  SOURCE_DISPLAY_SETTINGS_FAILED: "ذخیره تنظیمات نمایش ناموفق بود",
  USAGE_PERCENT_NEEDS_TARGET: "برای نمایش درصد مصرف، یک اتصال API و یک ورکر انتخاب کنید",
  CLEAN_IP_LIST_EMPTY: "لیست آی‌پی تمیز انتخاب‌شده خالی است؛ کانفیگ‌های این بخش بدون جایگزینی عبور داده شدند.",
  UNAUTHORIZED: "نشست شما منقضی شده است. در حال انتقال به صفحه ورود..."
};
var ERROR_MESSAGES_EN = {
  EXPORT_FAILED: "Failed to create backup file",
  IMPORT_INVALID_BACKUP: "The backup file is invalid or corrupted",
  LIST_NAME_REQUIRED: "Enter a name for this list",
  LIST_NEEDS_ONE_IP: "At least one IP is required in the list",
  LIST_ADD_FAILED: "Failed to add list",
  LIST_NOT_FOUND: "List not found",
  LIST_UPDATE_FAILED: "Failed to update list",
  LIST_DEFAULT_UNDELETABLE: "The panel's default list can't be deleted",
  LIST_DELETE_FAILED: "Failed to delete list",
  LIST_MAX_IPS: "A maximum of {limit} IPs per list is allowed.",
  LIST_MAX_LISTS: "A maximum of {limit} lists is allowed.",
  SOURCE_NOT_FOUND: "Source not found",
  SOURCE_NEEDS_URL_OR_MANUAL: "Enter at least one subscription link or one manual config",
  SOURCE_NO_VALID_CONFIGS: "No valid configs were extracted",
  SOURCE_ADD_FAILED: "Failed to add source",
  SOURCE_DELETE_FAILED: "Failed to delete",
  SOURCE_MAX_URLS: "A maximum of {limit} links is allowed.",
  SOURCE_MAX_MANUAL_LINES: "A maximum of {limit} manual lines is allowed.",
  SLUG_TAKEN: "This link is already used by another subscription.",
  SLUG_UPDATE_FAILED: "Failed to change the link",
  SLUG_INVALID_FORMAT: "The link must be {min} to {max} Latin letters, digits, dashes or underscores.",
  PART_NOT_FOUND: "This part was not found",
  PART_UPDATE_FAILED: "Failed to save",
  PART_DELETE_FAILED: "Failed to delete this part",
  CONFIG_BATCH_UPDATE_FAILED: "Failed to save changes",
  PART_MAX_CONFIGS: "This part has hit the {limit}-template limit.",
  PART_MAX_BLOCKED: "A maximum of {limit} blocked configs per part is allowed.",
  PART_MAX_CUSTOM_NAMES: "This part's custom-name limit ({limit}) is full.",
  PART_OUTPUT_TRUNCATED: "This part's final config count exceeded the {limit} limit; only {kept} of {total} configs were randomly kept in the output.",
  SYNC_FAILED: "Sync failed",
  CONFIG_EMPTY: "The config is empty",
  CONFIG_INVALID_FORMAT: "Invalid config format",
  CONFIG_DUPLICATE: "This config already exists",
  CONFIG_ADD_FAILED: "Failed to add config",
  CONFIG_NOT_FOUND: "Config not found",
  CONFIG_DELETE_FAILED: "Failed to delete",
  CONFIG_TOGGLE_FAILED: "Failed to change block state",
  CONFIG_BULK_TOGGLE_FAILED: "Failed to change state in bulk",
  CONFIG_RENAME_FAILED: "Failed to rename",
  CONFIG_REORDER_FAILED: "Failed to reorder",
  CF_CONNECTION_ADD_FAILED: "Failed to add API connection",
  CF_CONNECTION_DELETE_FAILED: "Failed to delete API connection",
  CF_CONNECTION_NOT_FOUND: "This API connection was not found",
  CF_CREDENTIALS_REQUIRED: "Account ID and API Token are required",
  CF_TOKEN_INVALID: "Account ID or API Token is incorrect, or the token doesn't have access to this account",
  CF_VALIDATION_FAILED: "Failed to connect to Cloudflare to verify",
  CF_ACCOUNT_ID_INVALID: "This connection's Account ID is invalid",
  CF_STATS_FETCH_FAILED: "Failed to fetch stats from Cloudflare",
  CF_STATS_NO_ACCESS: "This token doesn't have access to this account's stats",
  CF_SCRIPTS_LIST_FAILED: "Failed to fetch the worker list",
  CF_REGIONS_LIST_FAILED: "Failed to fetch the region list",
  CF_SCRIPT_NAME_REQUIRED: "Select a worker",
  CF_PLACEMENT_INVALID: "Invalid Placement mode",
  CF_PLACEMENT_UPDATE_FAILED: "Failed to apply Placement",
  SOURCE_DISPLAY_SETTINGS_FAILED: "Failed to save display settings",
  USAGE_PERCENT_NEEDS_TARGET: "Select an API connection and a worker to show usage %",
  CLEAN_IP_LIST_EMPTY: "The selected clean IP list is empty; this part's configs were passed through without replacement.",
  UNAUTHORIZED: "Your session has expired. Redirecting to the login page..."
};
function translateApiError(result, fallback) {
  var dict = currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN;
  if (result && typeof result.error === "string" && dict[result.error]) {
    var text = dict[result.error];
    var params = result.errorParams || {};
    Object.keys(params).forEach(function(k) {
      text = text.split("{" + k + "}").join(params[k]);
    });
    return text;
  }
  return fallback;
}
// One silent retry on a genuine network failure (DNS hiccup, dropped
// connection, etc. - not an HTTP error status, which still resolves
// normally) before the caller's .catch() surfaces a "network error" toast.
// Low-risk, low-complexity: doesn't change any success-path behavior.
function fetchWithRetry(url, opts) {
  return fetch(url, opts).catch(function(err) {
    return new Promise(function(resolve) {
      setTimeout(resolve, 600);
    }).then(function() {
      return fetch(url, opts);
    });
  });
}
function jsonFetch(url, opts) {
  return fetchWithRetry(url, opts).then(function(res) {
    if (res.status === 401) {
      showToast((currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).UNAUTHORIZED, "error");
      setTimeout(function() {
        window.location.reload();
      }, 1200);
      return res.json().then(function(result) {
        return { ok: false, result };
      }).catch(function() {
        return { ok: false, result: { success: false, error: "UNAUTHORIZED" } };
      });
    }
    return res.json().then(function(result) {
      return { ok: res.ok, result };
    });
  });
}
function applyCategoryDefault() {
  document.getElementById("sourceUseCleanIp").checked = document.getElementById("catCloudflare").checked;
}
document.getElementById("catCloudflare").addEventListener("change", applyCategoryDefault);
document.getElementById("catIndependent").addEventListener("change", applyCategoryDefault);
function renderPortCheckboxesInto(container, allPorts, selectedPorts, cssClass) {
  if (!allPorts || allPorts.length === 0) {
    container.innerHTML = '<span class="text-[11px] text-gray-500">' + t("noConfigYet") + '</span>';
    return;
  }
  var out = [];
  for (var i = 0; i < allPorts.length; i++) {
    var p = allPorts[i];
    var isChecked = selectedPorts.indexOf(p) !== -1;
    out.push(
      '<label class="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition"><input type="checkbox" value="' + escapeHtml(p) + '" class="' + cssClass + ' form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-700 bg-gray-900"' + (isChecked ? " checked" : "") + '><span class="text-xs text-gray-300">' + escapeHtml(p) + "</span></label>"
    );
  }
  container.innerHTML = out.join("");
}
function renderItemCard(item) {
  var updatedStr = item.updatedAt ? new Date(item.updatedAt).toLocaleString(currentLang === "fa" ? "fa-IR" : "en-US") : "\u2014";
  var subLink = baseUrl + "/sub/" + (item.slug || item.id);
  var safeName = escapeHtml(item.name || t("noName"));
  var categoryLabel = item.category === "independent" ? t("catIndependentLabel") : item.category === "mixed" ? t("catMixedLabel") : t("catCloudflareLabel");
  var categoryClass = item.category === "independent" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : item.category === "mixed" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20";
  var partsLabel = (item.partsCount || 0) + " " + t("partsSuffix");
  var warningsHtml = "";
  if (item.truncated) warningsHtml += '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] p-2 rounded-lg mt-2">' + t("truncatedWarning") + "</div>";
  (item.partWarnings || []).forEach(function(w) {
    var msg = translateApiError({ error: w.message, errorParams: w.params }, w.message);
    warningsHtml += '<div class="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-2 rounded-lg mt-2">\u26A0\uFE0F ' + escapeHtml(msg) + "</div>";
  });
  return '<div class="bg-gray-900/80 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition"><div class="flex justify-between items-start mb-2"><div><h3 class="font-bold text-sm text-gray-200">' + safeName + '</h3><div class="flex flex-wrap gap-1 mt-1"><span class="text-[10px] px-2 py-0.5 rounded border ' + categoryClass + '">' + categoryLabel + '</span><span class="text-[10px] px-2 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-700">' + partsLabel + '</span></div><span class="text-[11px] text-gray-500 block mt-1">' + t("updatedAtLabel") + " " + updatedStr + '</span></div><span class="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-1 rounded border border-indigo-500/20">' + item.baseCount + " &larr; " + item.finalCount + "</span></div>" + warningsHtml + '<div class="flex flex-wrap gap-2 mt-4"><button class="copy-link-btn flex-1 bg-white text-gray-900 hover:bg-gray-200 text-xs font-bold py-2 rounded-lg transition shadow-md" data-link="' + escapeHtml(subLink) + '">' + t("copyLinkBtn") + '</button><button class="sync-one-btn bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-2 rounded-lg border border-emerald-500/20 transition text-xs font-bold" data-id="' + item.id + '">' + t("syncBtn") + '</button><button class="edit-configs-btn bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-2 rounded-lg border border-purple-500/20 transition text-xs font-bold" data-id="' + item.id + '" data-name="' + safeName + '">' + t("editBtn") + '</button><button class="delete-source-btn bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg border border-red-500/20 transition" data-id="' + item.id + '">' + t("deleteBtn") + "</button></div></div>";
}
function copyLink(link) {
  navigator.clipboard.writeText(link).then(function() {
    showToast(t("linkCopied"));
  }).catch(function() {
    showToast(t("copyFailed") + " " + link, "error");
  });
}
function renderCleanIpListsContainer(lists) {
  var wrap = document.getElementById("cleanIpListsContainer");
  if (!lists || lists.length === 0) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = lists.map(function(l) {
    var delBtn = l.builtin ? '<span class="text-[10px] text-gray-600">' + t("builtinLabel") + '</span>' : '<button class="del-list-btn text-red-400 hover:text-red-300 text-xs" data-id="' + l.id + '">' + t("deleteBtn") + '</button>';
    return '<div class="bg-gray-900/60 border border-gray-800 rounded-lg p-3"><div class="flex items-center justify-between mb-2"><input type="text" class="list-name-input bg-transparent text-sm font-bold text-gray-200 border-b border-transparent focus:border-sky-500 focus:outline-none w-2/3" data-id="' + l.id + '" value="' + escapeHtml(l.name) + '">' + delBtn + '</div><textarea class="list-ips-input w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[11px]" dir="ltr" rows="3" data-id="' + l.id + '">' + escapeHtml((l.ips || []).join("\\n")) + '</textarea><button class="save-list-btn w-full mt-2 bg-gray-800 hover:bg-gray-700 py-1.5 rounded-lg text-[11px] font-bold transition border border-gray-700" data-id="' + l.id + '">' + t("saveBtn") + " (" + (l.ips || []).length + " " + (currentLang === "fa" ? "آی‌پی" : "IPs") + ")</button></div>";
  }).join("");
}
function addCleanIpList() {
  var name = document.getElementById("newListName").value.trim();
  var ips = document.getElementById("newListIps").value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  if (!name || ips.length === 0) {
    showToast(t("listNameIpRequired"), "error");
    return;
  }
  jsonFetch("/api/clean-ip-lists", { method: "POST", body: JSON.stringify({ name, ips }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("newListName").value = "";
      document.getElementById("newListIps").value = "";
      showToast(t("listCreated"));
      loadData();
    } else showToast(translateApiError(r.result, t("networkError")), "error");
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function saveCleanIpList(listId) {
  var name = document.querySelector('.list-name-input[data-id="' + listId + '"]').value.trim();
  var ips = document.querySelector('.list-ips-input[data-id="' + listId + '"]').value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  jsonFetch("/api/clean-ip-lists/" + listId, { method: "PUT", body: JSON.stringify({ name, ips }) }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast(t("listSaved"));
      loadData();
    } else showToast(translateApiError(r.result, t("networkError")), "error");
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function deleteCleanIpList(listId) {
  if (!confirm(t("confirmDeleteList"))) return;
  jsonFetch("/api/clean-ip-lists/" + listId, { method: "DELETE" }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast(t("listDeleted"));
      loadData();
    } else showToast(translateApiError(r.result, t("networkError")), "error");
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
document.getElementById("cleanIpListsContainer").addEventListener("click", function(e) {
  var saveBtn = e.target.closest(".save-list-btn");
  if (saveBtn) {
    saveCleanIpList(saveBtn.getAttribute("data-id"));
    return;
  }
  var delBtn = e.target.closest(".del-list-btn");
  if (delBtn) deleteCleanIpList(delBtn.getAttribute("data-id"));
});
function renderCfConnectionsList(connections) {
  var wrap = document.getElementById("cfConnectionsList");
  if (!connections || connections.length === 0) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = connections.map(function(c) {
    var accountLabel = c.accountName ? escapeHtml(c.accountName) : escapeHtml(c.accountId);
    return '<div class="bg-gray-900/60 border border-gray-800 rounded-lg p-2 text-xs"><div class="flex items-center justify-between gap-2"><div class="text-gray-300 min-w-0 truncate"><b>' + escapeHtml(c.label) + '</b> <span class="text-gray-500" dir="ltr">(' + accountLabel + ", " + escapeHtml(c.tokenPreview) + ')</span></div><div class="flex items-center gap-2 shrink-0"><button class="cf-placement-btn text-indigo-400 hover:text-indigo-300 px-1" data-id="' + c.id + '">Placement</button><button class="del-cf-btn text-red-400 hover:text-red-300 px-1" data-id="' + c.id + '">' + t("deleteBtn") + '</button></div></div><div class="cf-placement-box hidden mt-2 pt-2 border-t border-gray-800" id="cf-placement-' + c.id + '"></div></div>';
  }).join("");
}
function addCfConnection() {
  var label = document.getElementById("newCf-label").value.trim();
  var accountId = document.getElementById("newCf-account").value.trim();
  var apiToken = document.getElementById("newCf-token").value.trim();
  if (!accountId || !apiToken) {
    showToast(t("cfCredsRequired"), "error");
    return;
  }
  showToast(t("cfChecking"));
  jsonFetch("/api/cf-connections", { method: "POST", body: JSON.stringify({ label, accountId, apiToken }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("newCf-label").value = "";
      document.getElementById("newCf-account").value = "";
      document.getElementById("newCf-token").value = "";
      showToast(t("cfAdded"));
      loadData();
    } else showToast(translateApiError(r.result, t("genericError")), "error");
  }).catch(function() {
    showToast(t("genericError"), "error");
  });
}
function deleteCfConnection(id) {
  if (!confirm(t("confirmDeleteCf"))) return;
  fetch("/api/cf-connections/" + id, { method: "DELETE" }).then(function() {
    showToast(t("cfDeleted"));
    loadData();
  }).catch(function() {
    showToast(t("cfDeleteFailed"), "error");
  });
}
var cfScriptsCache = {};
function toggleCfPlacementBox(connId) {
  var box = document.getElementById("cf-placement-" + connId);
  if (!box) return;
  if (!box.classList.contains("hidden")) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = '<span class="text-[11px] text-gray-500">' + t("fetchingScripts") + '</span>';
  Promise.all([
    fetchWithRetry("/api/cf-connections/" + connId + "/scripts").then(function(res) {
      return res.json();
    }),
    fetchWithRetry("/api/cf-connections/" + connId + "/regions").then(function(res) {
      return res.json();
    }).catch(function() {
      return { success: false };
    })
  ]).then(function(results) {
    var data = results[0];
    var regionsData = results[1];
    if (!data.success) {
      box.innerHTML = '<span class="text-[11px] text-orange-400">' + t("scriptsFetchFailed") + '</span>';
      return;
    }
    cfScriptsCache[connId] = data.scripts || [];
    if (data.scripts.length === 0) {
      box.innerHTML = '<span class="text-[11px] text-gray-500">' + t("noScriptsFound") + '</span>';
      return;
    }
    // Prefer the live, complete region list straight from Cloudflare's API;
    // fall back to the small hardcoded preset list if the fetch failed or
    // the token lacks permission for it, so Placement stays usable either
    // way.
    var regionsList = regionsData && regionsData.success && regionsData.regions && regionsData.regions.length > 0 ? regionsData.regions : placementRegionPresets();
    var regionOptions = regionsList.map(function(r) {
      return '<option value="' + escapeHtml(r.value) + '">' + escapeHtml(r.label) + '</option>';
    }).join("");
    var scriptOptions = data.scripts.map(function(s) {
      return '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + "</option>";
    }).join("");
    box.innerHTML = '<div class="space-y-2"><select class="cf-placement-script w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]" dir="ltr">' + scriptOptions + '</select><div class="flex flex-wrap gap-1.5"><button class="cf-placement-apply text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded" data-mode="smart">' + t("smartPlacementBtn") + '</button><button class="cf-placement-apply text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-2 py-1 rounded" data-mode="off">' + t("defaultPlacementBtn") + '</button></div><div class="flex items-center gap-1.5" dir="ltr"><select class="cf-placement-region flex-1 bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]"><option value="">' + t("placementCustomRegionPlaceholder") + '</option>' + regionOptions + '</select><button class="cf-placement-apply text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded shrink-0" data-mode="region">' + t("placementApplyBtn") + '</button></div><input class="cf-placement-region-custom w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px] font-mono" dir="ltr" placeholder="' + escapeHtml(t("placementCustomRegionInputPlaceholder")) + '"><p class="text-[10px] text-gray-600">' + t("placementCustomRegionHint") + '</p><div class="cf-placement-result text-[11px]"></div></div>';
  }).catch(function() {
    box.innerHTML = '<span class="text-[11px] text-orange-400">' + t("scriptsFetchFailed") + '</span>';
  });
}
document.getElementById("cfConnectionsList").addEventListener("click", function(e) {
  var delBtn = e.target.closest(".del-cf-btn");
  if (delBtn) deleteCfConnection(delBtn.getAttribute("data-id"));
  var placementBtn = e.target.closest(".cf-placement-btn");
  if (placementBtn) toggleCfPlacementBox(placementBtn.getAttribute("data-id"));
  var applyBtn = e.target.closest(".cf-placement-apply");
  if (applyBtn) {
    var box = applyBtn.closest(".cf-placement-box");
    var connId = box.id.replace("cf-placement-", "");
    var scriptName = box.querySelector(".cf-placement-script").value;
    var mode = applyBtn.getAttribute("data-mode");
    var payload = { scriptName };
    if (mode === "region") {
      var customRegion = box.querySelector(".cf-placement-region-custom").value.trim();
      var presetRegion = box.querySelector(".cf-placement-region").value;
      var region = customRegion || presetRegion;
      if (!region) {
        showToast(t("regionRequired"), "error");
        return;
      }
      payload.region = region;
    } else {
      payload.mode = mode;
    }
    var resultEl = box.querySelector(".cf-placement-result");
    resultEl.textContent = t("applying");
    resultEl.className = "cf-placement-result text-[11px] text-gray-400";
    jsonFetch("/api/cf-connections/" + connId + "/placement", { method: "PUT", body: JSON.stringify(payload) }).then(function(r) {
      if (r.ok && r.result.success) {
        resultEl.textContent = t("placementApplied");
        resultEl.className = "cf-placement-result text-[11px] text-emerald-400";
      } else {
        var msg = (r.result && r.result.message) || translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).CF_PLACEMENT_UPDATE_FAILED);
        resultEl.textContent = msg;
        resultEl.className = "cf-placement-result text-[11px] text-orange-400";
      }
    }).catch(function() {
      resultEl.textContent = t("networkError");
      resultEl.className = "cf-placement-result text-[11px] text-orange-400";
    });
  }
});
function statsCardSkeleton(conn) {
  return '<div class="bg-gray-900/50 p-5 rounded-xl border border-gray-800" id="cf-card-' + conn.id + '"><div class="flex items-center justify-between"><div><span class="text-gray-400 text-sm block mb-1">' + escapeHtml(conn.label) + '</span><div class="flex items-baseline gap-2"><strong class="cf-req-value text-3xl text-white font-black">---</strong><span class="text-gray-500 text-sm">/ 100,000 ' + (currentLang === "fa" ? "راه‌گان" : "requests") + '</span></div></div><div class="cf-chart-el w-16 h-16 rounded-full border-4 border-gray-800 flex items-center justify-center relative"><span class="text-xs text-gray-500">%</span></div></div><div class="cf-err-box hidden mt-3 text-orange-400 text-[11px]"></div></div>';
}
function fetchAllStats() {
  var connections = window.cfConnections || [];
  var cardsEl = document.getElementById("cf-stats-cards");
  var emptyEl = document.getElementById("cf-no-connections");
  if (connections.length === 0) {
    cardsEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  cardsEl.innerHTML = connections.map(statsCardSkeleton).join("");
  connections.forEach(function(conn) {
    fetchWithRetry("/api/cf-connections/" + conn.id + "/stats").then(function(res) {
      return res.json();
    }).then(function(data) {
      var card = document.getElementById("cf-card-" + conn.id);
      if (!card) return;
      var reqEl = card.querySelector(".cf-req-value");
      var errBox = card.querySelector(".cf-err-box");
      var chartEl = card.querySelector(".cf-chart-el");
      if (!data.success) {
        reqEl.textContent = "---";
        errBox.textContent = data.message || translateApiError(data, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).CF_STATS_FETCH_FAILED);
        errBox.classList.remove("hidden");
        return;
      }
      errBox.classList.add("hidden");
      var endReq = data.requests || 0;
      reqEl.textContent = endReq.toLocaleString();
      var percent = Math.min(100, Math.round(endReq / 1e5 * 100));
      chartEl.style.background = "conic-gradient(#6366f1 " + percent + "%, transparent 0)";
      chartEl.innerHTML = '<span class="text-[10px] font-bold text-white relative z-10 bg-gray-900 rounded-full w-12 h-12 flex items-center justify-center">' + percent + "%</span>";
    }).catch(function() {
    });
  });
}
function loadData() {
  return fetchWithRetry("/api/state").then(function(res) {
    return res.json();
  }).then(function(data) {
    document.getElementById("password-warning").classList.toggle("hidden", !data.usingDefaultPassword);
    cleanIpListsCache = data.cleanIpLists || [];
    sourceItemsCache = data.items || [];
    renderCleanIpListsContainer(cleanIpListsCache);
    renderCfConnectionsList(data.cfConnections || []);
    window.cfConnections = data.cfConnections || [];
    var listEl = document.getElementById("subsList");
    var countBadge = document.getElementById("sourcesCountBadge");
    countBadge.textContent = (data.items || []).length + " " + t("itemsSuffix");
    if (!data.items || data.items.length === 0) {
      listEl.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-700 rounded-xl flex flex-col items-center gap-2"><svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>' + t("noSourceYet") + '</span></div>';
    } else {
      listEl.innerHTML = data.items.map(renderItemCard).join("");
    }
    fetchAllStats();
  }).catch(function() {
    showToast(t("stateLoadFailed"), "error");
  });
}
function addSource() {
  var name = document.getElementById("sourceName").value || t("newSourceFallbackName");
  var urls = document.getElementById("sourceUrls").value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  var manual = document.getElementById("sourceManual").value;
  var category = document.getElementById("catIndependent").checked ? "independent" : "cloudflare";
  var useCleanIp = document.getElementById("sourceUseCleanIp").checked;
  var nameModeUrl = document.getElementById("nameModeUrlOriginal").checked ? "original" : "auto";
  var nameModeManual = document.getElementById("nameModeManualOriginal").checked ? "original" : "auto";
  if (urls.length === 0 && !manual.trim()) {
    showToast(t("noUrlOrManual"), "error");
    return;
  }
  showToast(t("creatingConfigs"));
  jsonFetch("/api/sources", { method: "POST", body: JSON.stringify({ name, urls, manual, category, useCleanIp, nameModeUrl, nameModeManual }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("sourceUrls").value = "";
      document.getElementById("sourceManual").value = "";
      showToast(t("sourceAdded"));
      loadData();
    } else showToast(translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).SOURCE_ADD_FAILED), "error");
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function deleteSource(id) {
  if (!confirm(t("confirmDeleteSource"))) return;
  fetch("/api/sources/" + id, { method: "DELETE" }).then(function() {
    showToast(t("deleteBtn"));
    if (editorSourceId === id) closeConfigEditor();
    loadData();
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function syncOneSource(id) {
  showToast(t("syncingOne"));
  fetch("/api/sources/" + id + "/sync", { method: "POST" }).then(function() {
    showToast(t("syncedOne"));
    loadData();
    if (editorSourceId === id) refreshConfigEditor();
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function syncAll() {
  showToast(t("syncingAll"));
  fetch("/api/sync", { method: "POST" }).then(function() {
    showToast(t("syncedAll"));
    loadData();
    if (editorSourceId) refreshConfigEditor();
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function getSelectedBackupSections() {
  var sections = [];
  if (document.getElementById("backupSecSources").checked) sections.push("sources");
  if (document.getElementById("backupSecLists").checked) sections.push("cleanIpLists");
  if (document.getElementById("backupSecCf").checked) sections.push("cfConnections");
  return sections;
}
function exportBackup() {
  var sections = getSelectedBackupSections();
  if (sections.length === 0) {
    showToast(t("selectOneSection"), "error");
    return;
  }
  showToast(t("exportingBackup"));
  fetchWithRetry("/api/backup?sections=" + encodeURIComponent(sections.join(","))).then(function(res) {
    if (!res.ok) throw new Error("export failed");
    return res.blob();
  }).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "sub-manager-backup-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(t("backupDownloaded"));
  }).catch(function() {
    showToast((currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).EXPORT_FAILED, "error");
  });
}
function importBackup() {
  var input = document.getElementById("importFileInput");
  var file = input.files && input.files[0];
  if (!file) {
    showToast(t("selectBackupFile"), "error");
    return;
  }
  var sections = getSelectedBackupSections();
  if (sections.length === 0) {
    showToast(t("selectOneSection"), "error");
    return;
  }
  var mode = document.getElementById("importModeReplace").checked ? "replace" : "merge";
  if (mode === "replace" && !confirm(t("confirmReplaceImport"))) return;
  var reader = new FileReader();
  reader.onload = function() {
    var parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showToast(t("invalidJsonFile"), "error");
      return;
    }
    parsed.__importMode = mode;
    parsed.__importSections = sections;
    showToast(t("restoringBackup"));
    jsonFetch("/api/backup", { method: "POST", body: JSON.stringify(parsed) }).then(function(r) {
      if (r.ok && r.result.success) {
        var parts = [];
        if (sections.indexOf("sources") !== -1) parts.push(r.result.sourcesImported + " " + t("importedSourcesLabel"));
        if (sections.indexOf("cleanIpLists") !== -1) parts.push(r.result.listsImported + " " + t("importedListsLabel"));
        if (sections.indexOf("cfConnections") !== -1) parts.push(r.result.cfConnectionsImported + " " + t("importedCfLabel"));
        showToast(parts.join((currentLang === "fa" ? "\u060C " : ", ")) + " " + t("importedSuffix"));
        input.value = "";
        loadData();
      } else {
        showToast(translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).IMPORT_INVALID_BACKUP), "error");
      }
    }).catch(function() {
      showToast(t("networkError"), "error");
    });
  };
  reader.onerror = function() {
    showToast(t("fileReadFailed"), "error");
  };
  reader.readAsText(file);
}
document.getElementById("subsList").addEventListener("click", function(e) {
  var copyBtn = e.target.closest(".copy-link-btn");
  if (copyBtn) {
    copyLink(copyBtn.getAttribute("data-link"));
    return;
  }
  var syncBtn = e.target.closest(".sync-one-btn");
  if (syncBtn) {
    syncOneSource(syncBtn.getAttribute("data-id"));
    return;
  }
  var editBtn = e.target.closest(".edit-configs-btn");
  if (editBtn) {
    openConfigEditor(editBtn.getAttribute("data-id"), editBtn.getAttribute("data-name"));
    return;
  }
  var delBtn = e.target.closest(".delete-source-btn");
  if (delBtn) deleteSource(delBtn.getAttribute("data-id"));
});
function openConfigEditor(sourceId, sourceName) {
  editorSourceId = sourceId;
  pendingNameEdits = {};
  pendingDeletes = {};
  pendingIncluded = {};
  pendingOrder = {};
  document.getElementById("editorTitle").textContent = t("editorDefaultTitle") + " (" + sourceName + ")";
  document.getElementById("configEditorPanel").classList.remove("hidden");
  var src = (sourceItemsCache || []).find(function(s) {
    return s.id === sourceId;
  });
  document.getElementById("editorLinkOrigin").textContent = baseUrl + "/sub/";
  document.getElementById("editorSlugInput").value = src ? src.slug : "";
  refreshConfigEditor().then(function() {
    document.getElementById("configEditorPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
function closeConfigEditor() {
  editorSourceId = null;
  pendingNameEdits = {};
  pendingDeletes = {};
  pendingIncluded = {};
  pendingOrder = {};
  document.getElementById("configEditorPanel").classList.add("hidden");
  document.getElementById("editorPartsContainer").innerHTML = "";
}
function saveSourceSlug() {
  if (!editorSourceId) return;
  var input = document.getElementById("editorSlugInput");
  var slug = input.value.trim();
  jsonFetch("/api/sources/" + editorSourceId + "/slug", {
    method: "PUT",
    body: JSON.stringify({ slug })
  }).then(function(r) {
    if (r.ok && r.result.success) {
      if (!r.result.unchanged) showToast(t("slugUpdated"));
      input.value = r.result.slug;
      loadData();
    } else {
      showToast(translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).SLUG_UPDATE_FAILED), "error");
    }
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function refreshConfigEditor() {
  if (!editorSourceId) return Promise.resolve();
  return fetchWithRetry("/api/sources/" + editorSourceId + "/configs").then(function(res) {
    return res.json();
  }).then(function(data) {
    var container = document.getElementById("editorPartsContainer");
    var lists = data.cleanIpLists || [];
    var parts = data.parts || [];
    editorListsCache = lists;
    editorCfConnectionsCache = data.cfConnections || [];
    editorPartsCache = {};
    editorPartsOrder = parts.map(function(p) {
      return p.id;
    });
    parts.forEach(function(p) {
      editorPartsCache[p.id] = p;
    });
    if (parts.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm border border-dashed border-gray-700 rounded-xl">' + t("noPartsYet") + '</div>';
    } else {
      container.innerHTML = parts.map(function(part, idx) {
        return renderPartCard(part, lists, idx, parts);
      }).join("");
      parts.forEach(function(part) {
        var portsContainer = document.getElementById("ports-" + part.id);
        if (portsContainer) renderPortCheckboxesInto(portsContainer, part.availablePorts, part.selectedPorts, "port-cb-" + part.id);
      });
      Array.prototype.slice.call(container.querySelectorAll(".select-all-cb[data-indeterminate]")).forEach(function(cb) {
        cb.indeterminate = true;
      });
      wirePartDisplaySettingsEvents(container, parts);
    }
    renderManualAddCard(lists, parts);
  }).catch(function() {
    showToast(t("configsFetchFailed"), "error");
  });
}
function cfConnectionOptionsHtml(selectedId) {
  return editorCfConnectionsCache.map(function(c) {
    var sel = c.id === selectedId ? " selected" : "";
    return '<option value="' + c.id + '"' + sel + '>' + escapeHtml(c.accountName || c.label) + " (" + escapeHtml(c.label) + ")</option>";
  }).join("");
}
// Per-part display settings (emoji + live usage-percent), rendered inside
// each part's card - each part of a subscription may point at a different
// Worker script, so these settings live per-part rather than per-source.
function partDisplaySettingsHtml(part) {
  var emojiChecked = part.emojiEnabled !== false ? " checked" : "";
  var pctChecked = part.usagePercentEnabled ? " checked" : "";
  var pctBlock = "";
  if (part.category === "cloudflare") {
    var connOptions = '<option value="">' + t("selectCfConnPlaceholder") + '</option>' + cfConnectionOptionsHtml(part.usagePercentCfConnectionId);
    var noConnHint = editorCfConnectionsCache.length === 0 ? '<p class="text-[11px] text-orange-400 mt-1">' + t("noCfConnYetHint") + '</p>' : "";
    pctBlock =
      '<div><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="part-display-pct h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600" data-part="' + part.id + '"' + pctChecked + '><span class="text-xs text-gray-300">' + t("usagePercentToggleLabel") + '</span></label><p class="text-[10px] text-gray-600 mt-1 pr-6">' + t("usagePercentHint") + '</p>' +
      '<div class="mt-2 grid grid-cols-2 gap-2 part-display-pct-target" data-part="' + part.id + '" style="' + (part.usagePercentEnabled ? "" : "display:none") + '">' +
      '<select class="bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px] part-display-pct-conn" data-part="' + part.id + '">' + connOptions + '</select>' +
      '<select class="bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px] part-display-pct-script" dir="ltr" data-part="' + part.id + '"><option value="">' + t("selectFirstConnHint") + '</option></select>' +
      '</div>' + noConnHint + '</div>';
  }
  return (
    '<details class="bg-gray-900/50 border border-gray-800 rounded-xl"><summary class="cursor-pointer select-none px-3 py-2 text-xs text-gray-300 font-bold">' + t("displaySettingsSummary") + '</summary><div class="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">' +
    '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="part-display-emoji h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600" data-part="' + part.id + '"' + emojiChecked + '><span class="text-xs text-gray-300">' + t("emojiToggleLabel") + '</span></label>' +
    pctBlock +
    '</div></details>'
  );
}
function loadScriptsIntoSelect(connSelect, scriptSelect, preselect) {
  var connId = connSelect.value;
  scriptSelect.innerHTML = '<option value="">' + t("fetchingEllipsis") + '</option>';
  if (!connId) {
    scriptSelect.innerHTML = '<option value="">' + t("selectFirstConnHint") + '</option>';
    return;
  }
  fetchWithRetry("/api/cf-connections/" + connId + "/scripts").then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.success || !data.scripts || data.scripts.length === 0) {
      scriptSelect.innerHTML = '<option value="">' + t("noScriptsOptionLabel") + '</option>';
      return;
    }
    scriptSelect.innerHTML = data.scripts.map(function(s) {
      var sel = s.name === preselect ? " selected" : "";
      return '<option value="' + escapeHtml(s.name) + '"' + sel + '>' + escapeHtml(s.name) + "</option>";
    }).join("");
  }).catch(function() {
    scriptSelect.innerHTML = '<option value="">' + t("fetchErrorOptionLabel") + '</option>';
  });
}
function wirePartDisplaySettingsEvents(container, parts) {
  parts.forEach(function(part) {
    var pctCheckbox = container.querySelector('.part-display-pct[data-part="' + part.id + '"]');
    var targetBlock = container.querySelector('.part-display-pct-target[data-part="' + part.id + '"]');
    if (pctCheckbox && targetBlock) {
      pctCheckbox.addEventListener("change", function() {
        targetBlock.style.display = pctCheckbox.checked ? "" : "none";
      });
    }
    var connSelect = container.querySelector('.part-display-pct-conn[data-part="' + part.id + '"]');
    var scriptSelect = container.querySelector('.part-display-pct-script[data-part="' + part.id + '"]');
    if (connSelect && scriptSelect) {
      connSelect.addEventListener("change", function() {
        loadScriptsIntoSelect(connSelect, scriptSelect, null);
      });
      if (part.usagePercentCfConnectionId) loadScriptsIntoSelect(connSelect, scriptSelect, part.usagePercentScriptName);
    }
  });
}
function partTitle(part, idx, allParts) {
  if (part.kind === "manual") return t("manualConfigsTitle");
  var urlPosition = 0;
  for (var i = 0; i <= idx; i++) {
    if (allParts[i] && allParts[i].kind !== "manual") urlPosition++;
  }
  return t("sourcePrefixLabel") + " " + urlPosition;
}
function cleanIpListOptionsHtml(lists, selectedId) {
  return lists.map(function(l) {
    var sel = l.id === selectedId ? " selected" : "";
    return '<option value="' + l.id + '"' + sel + ">" + escapeHtml(l.name) + " (" + (l.ips || []).length + ")</option>";
  }).join("");
}
var TRASH_ICON = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
var UNDO_ICON = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
var DRAG_HANDLE_ICON = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"></circle><circle cx="9" cy="12" r="1.4"></circle><circle cx="9" cy="18" r="1.4"></circle><circle cx="15" cy="6" r="1.4"></circle><circle cx="15" cy="12" r="1.4"></circle><circle cx="15" cy="18" r="1.4"></circle></svg>';
function orderedConfigsForPart(part) {
  var list = part.configs || [];
  var order = pendingOrder[part.id];
  if (!order) return list;
  var byId = {};
  list.forEach(function(c) {
    byId[c.configId] = c;
  });
  var result = [];
  order.forEach(function(id) {
    if (byId[id]) {
      result.push(byId[id]);
      delete byId[id];
    }
  });
  Object.keys(byId).forEach(function(id) {
    result.push(byId[id]);
  });
  return result;
}
function renderConfigRow(c, part) {
  var badgeColor = "bg-purple-500/20 text-purple-300";
  if (c.protocol === "vless") badgeColor = "bg-indigo-500/20 text-indigo-300";
  else if (c.protocol === "trojan") badgeColor = "bg-emerald-500/20 text-emerald-300";
  var tlsBadge = c.isTls ? '<span class="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">TLS</span>' : '<span class="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded">non-TLS</span>';
  var portBadge = '<span class="text-[10px] bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded">' + escapeHtml(c.port || "?") + "</span>";
  var isDeleted = !!pendingDeletes[c.configId];
  var included = pendingIncluded.hasOwnProperty(c.configId) ? pendingIncluded[c.configId] : !c.blocked;
  var rowClass = isDeleted ? "bg-gray-900/20 border border-dashed border-gray-700 rounded-lg p-2 opacity-40" : included ? "bg-gray-900/60 border border-gray-800 rounded-lg p-2" : "bg-gray-900/30 border border-red-900/40 rounded-lg p-2 opacity-50";
  var pendingName = pendingNameEdits.hasOwnProperty(c.configId) ? pendingNameEdits[c.configId] : null;
  var effectiveName = pendingName !== null ? pendingName || c.name || "AutoSub" : c.customName || c.name || "AutoSub";
  var nameHtml = isDeleted ? '<span class="flex-1 min-w-0 truncate text-xs text-gray-500 line-through">' + escapeHtml(effectiveName) + "</span>" : '<span class="cfg-name-wrap flex items-baseline gap-1 min-w-0 flex-1 basis-32" data-part="' + part.id + '" data-id="' + c.configId + '" data-default-name="' + escapeHtml(c.name || "AutoSub") + '" data-saved-custom="' + escapeHtml(c.customName || "") + '" data-host="' + escapeHtml(c.host || "") + '"><span class="cfg-name-display flex-1 min-w-0 truncate text-xs text-gray-300 cursor-text hover:text-white transition" title="' + escapeHtml(t("editNameTitle")) + '">' + escapeHtml(effectiveName) + '</span><span class="max-w-[45%] min-w-0 shrink truncate text-[11px] text-gray-600" title="' + escapeHtml(c.host || "") + '">(' + escapeHtml(c.host || "") + ")</span></span>";
  var deleteBtn = isDeleted ? '<button class="undo-delete-config-btn text-emerald-400 hover:text-emerald-300 px-1" title="' + escapeHtml(t("undoTitle")) + '" data-part="' + part.id + '" data-id="' + c.configId + '">' + UNDO_ICON + "</button>" : '<button class="delete-config-btn text-red-400 hover:text-red-300 px-1" title="' + escapeHtml(t("deleteTitle")) + '" data-part="' + part.id + '" data-id="' + c.configId + '">' + TRASH_ICON + "</button>";
  var checkboxHtml = isDeleted ? '<span class="h-4 w-4 shrink-0 inline-block"></span>' : '<input type="checkbox" class="config-include-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 shrink-0" title="' + escapeHtml(t("includeInOutputTitle")) + '" data-part="' + part.id + '" data-id="' + c.configId + '"' + (included ? " checked" : "") + ">";
  var dragHandle = isDeleted ? '<span class="w-4 h-4 shrink-0 text-gray-700">' + DRAG_HANDLE_ICON + "</span>" : '<span class="drag-handle-btn text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0" style="touch-action:none" title="' + escapeHtml(t("dragHandleTitle")) + '" data-part="' + part.id + '" data-id="' + c.configId + '">' + DRAG_HANDLE_ICON + "</span>";
  return '<div class="' + rowClass + '" data-config-id="' + c.configId + '" dir="ltr"><div class="flex items-center flex-wrap gap-2">' + dragHandle + checkboxHtml + nameHtml + '<div class="flex items-center gap-1 shrink-0">' + deleteBtn + '</div><div class="flex items-center gap-1.5 shrink-0"><span class="text-[10px] font-bold px-2 py-0.5 rounded ' + badgeColor + '">' + String(c.protocol || "?").toUpperCase() + "</span>" + tlsBadge + portBadge + "</div></div></div>";
}
function renderPartCard(part, lists, idx, allParts) {
  var fetchBadge = "";
  if (part.kind === "url") {
    if (part.lastFetchOk === false) {
      fetchBadge = '<span title="' + escapeHtml(t("fetchFailTitle")) + '" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg></span>';
    } else if (part.lastFetchOk === true) {
      fetchBadge = '<span title="' + escapeHtml(t("fetchOkTitle")) + '" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></span>';
    }
  }
  var deletePartBtn = '<button class="delete-part-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition shrink-0" title="' + escapeHtml(t("deleteEntirePart")) + '" data-part="' + part.id + '">' + TRASH_ICON + "</button>";
  var titleWithBadge = '<span class="flex items-center gap-1.5 min-w-0"><span class="truncate">' + escapeHtml(partTitle(part, idx, allParts)) + "</span>" + fetchBadge + "</span>";
  var urlBox = part.kind === "url" ? '<div class="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 mb-3 text-[11px] text-gray-500 truncate" dir="ltr">' + escapeHtml(part.url || "") + "</div>" : "";
  var orderedConfigs = orderedConfigsForPart(part);
  var configRows = orderedConfigs.map(function(c) {
    return renderConfigRow(c, part);
  }).join("") || '<div class="text-center text-gray-600 text-xs py-3">' + t("noConfigYet") + '</div>';
  var visibleConfigs = orderedConfigs.filter(function(c) {
    return !pendingDeletes[c.configId];
  });
  var isIncludedNow = function(c) {
    return pendingIncluded.hasOwnProperty(c.configId) ? pendingIncluded[c.configId] : !c.blocked;
  };
  var allIncluded = visibleConfigs.length > 0 && visibleConfigs.every(isIncludedNow);
  var noneIncluded = visibleConfigs.length > 0 && visibleConfigs.every(function(c) {
    return !isIncludedNow(c);
  });
  var selectAllRow = visibleConfigs.length > 0 ? '<div class="flex items-center gap-2 mb-2" dir="ltr"><input type="checkbox" class="select-all-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500" data-part="' + part.id + '"' + (allIncluded ? " checked" : "") + (!allIncluded && !noneIncluded ? ' data-indeterminate="1"' : "") + '><label class="text-[11px] text-gray-500">' + t("selectAllToggleLabel") + '</label></div>' : "";
  var rangeOnlyBlock = '<div><div class="flex items-center gap-2"><input type="checkbox" id="matchRanges-' + part.id + '"' + (part.matchKnownRangesOnly !== false ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="matchRanges-' + part.id + '" class="text-xs text-gray-400">' + t("onlyKnownRangesLabel") + '</label></div><p class="text-[11px] text-gray-500 mt-1 pr-6">' + t("onlyKnownRangesHint") + '</p></div>';
  var autoRefreshBlock = part.kind === "url" ? '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-2.5 space-y-2"><div class="flex items-center gap-2"><input type="checkbox" id="autoRefresh-' + part.id + '"' + (part.autoRefreshEnabled !== false ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="autoRefresh-' + part.id + '" class="text-xs text-gray-400">' + t("autoRefreshLabel") + '</label></div><div class="flex items-center gap-2"><span class="text-[11px] text-gray-500 shrink-0">' + t("everyLabel") + '</span><input type="number" id="autoRefreshMinutes-' + part.id + '" min="15" value="' + (part.autoRefreshMinutes || 1440) + '" class="w-24 bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs"><span class="text-[11px] text-gray-500 shrink-0">' + t("minutesLabel") + '</span></div></div>' : "";
  var nameModeBlock = '<div><label class="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" id="nameModeOriginal-' + part.id + '"' + (part.nameMode === "original" ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><span class="text-[11px] text-gray-300">' + t("keepOriginalNamesLabel") + '</span></label><div id="autoNumberWrap-' + part.id + '"' + (part.nameMode === "original" ? ' class="hidden"' : "") + '><label class="flex items-center gap-2 cursor-pointer pr-1"><input type="checkbox" id="autoNumberEnabled-' + part.id + '"' + (part.autoNumberEnabled !== false ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600"><span class="text-[11px] text-gray-500">' + t("autoNumberLabel") + '</span></label></div></div>';
  var protocolChecked = function(proto) {
    return (part.uploadBoostProtocols || ["vless", "trojan"]).indexOf(proto) !== -1;
  };
  // v1.1.5: clarify that an empty fp/cs/fm field means that layer is
  // skipped entirely - this wasn't documented anywhere in the UI before,
  // so a user clearing a field to "turn it off" had no way to know it
  // actually worked.
  var uploadBoostBlock = '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-3 space-y-3"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><input type="checkbox" id="uploadBoost-' + part.id + '"' + (part.uploadBoostEnabled ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-purple-600"><label for="uploadBoost-' + part.id + '" class="text-xs text-gray-300 font-bold">' + t("uploadLimitFixTitle") + '</label></div><span class="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full shrink-0">' + t("tlsOnlyBadge") + '</span></div><p class="text-[11px] text-gray-500 leading-relaxed">' + t("uploadBoostDesc") + ' <a href="https://github.com/patterniha/PattN/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattN</a>/<a href="https://github.com/patterniha/PattNG/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattNG</a></p><p class="text-[10px] text-gray-600">' + t("uploadBoostEmptyHint") + '</p><div><label class="block text-[10px] mb-1 text-gray-500">' + t("protocolsApplyLabel") + '</label><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-1.5 cursor-pointer"><input type="checkbox" id="uploadBoostProtoVless-' + part.id + '"' + (protocolChecked("vless") ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600"><span class="text-[11px] text-gray-300">VLESS</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-1.5 cursor-pointer"><input type="checkbox" id="uploadBoostProtoTrojan-' + part.id + '"' + (protocolChecked("trojan") ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600"><span class="text-[11px] text-gray-300">Trojan</span></label></div></div><details class="bg-gray-900/50 border border-gray-800 rounded-lg"><summary class="p-2 text-[11px] text-gray-400 cursor-pointer hover:text-gray-300">' + t("advancedSettingsSummary") + '</summary><div class="p-3 space-y-3">' +
    uploadBoostFieldHtml("fp", part.id, part.uploadBoostFingerprint, t("fpLabel")) +
    uploadBoostFieldHtml("cs", part.id, part.uploadBoostCipherSuites, t("csLabel")) +
    uploadBoostFieldHtml("fm", part.id, part.uploadBoostFragmentMask, t("fmLabel")) +
    '<button type="button" class="reset-upload-boost-btn flex items-center justify-center gap-1.5 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-700 transition" data-part="' + part.id + '">' + UNDO_ICON + '<span>' + t("resetToDefaultBtn") + '</span></button></div></details></div>';
  return '<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4" data-part-card="' + part.id + '"><div class="flex items-center justify-between gap-2 mb-2"><h3 class="text-sm font-bold text-white truncate min-w-0">' + titleWithBadge + '</h3><div class="flex items-center gap-1.5 shrink-0">' + deletePartBtn + "</div></div>" + urlBox + '<div class="space-y-3 mb-4 pb-4 border-b border-gray-800"><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="cat-' + part.id + '" value="cloudflare" id="catCf-' + part.id + '"' + (part.category !== "independent" ? " checked" : "") + ' class="text-indigo-600"><span class="text-xs text-gray-300">' + t("categoryWorker") + '</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="cat-' + part.id + '" value="independent" id="catInd-' + part.id + '"' + (part.category === "independent" ? " checked" : "") + ' class="text-indigo-600"><span class="text-xs text-gray-300">' + t("categoryIndependent") + '</span></label></div><div class="flex items-center gap-2"><input type="checkbox" id="useCleanIp-' + part.id + '"' + (part.useCleanIp ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="useCleanIp-' + part.id + '" class="text-xs text-gray-400">' + t("useCleanIpLabel") + '</label></div><div id="rangeOnlyWrap-' + part.id + '"' + (part.category === "independent" ? "" : ' class="hidden"') + ">" + rangeOnlyBlock + '</div><div><label class="block text-[11px] mb-1 text-gray-500">' + t("cleanIpListLabel") + '</label><select id="listId-' + part.id + '" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">' + cleanIpListOptionsHtml(lists, part.cleanIpListId) + '</select></div>' + nameModeBlock + '<div><label class="block text-[11px] mb-1 text-gray-500">' + t("distributionLabel") + '</label><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="dist-' + part.id + '" value="multiply" id="distMul-' + part.id + '"' + (part.distribution !== "random" ? " checked" : "") + ' class="text-indigo-600"><span class="text-[11px] text-gray-300">' + t("multiplyLabel") + '</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="dist-' + part.id + '" value="random" id="distRand-' + part.id + '"' + (part.distribution === "random" ? " checked" : "") + ' class="text-indigo-600"><span class="text-[11px] text-gray-300">' + t("randomLabel") + '</span></label></div></div><div><label class="block text-[11px] mb-1 text-gray-500">' + t("portsLabel") + '</label><div id="ports-' + part.id + '" class="grid grid-cols-4 gap-2"></div></div><div><div class="flex items-center gap-2"><input type="checkbox" id="oneConfigPerPort-' + part.id + '"' + (part.oneConfigPerPort ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500"><label for="oneConfigPerPort-' + part.id + '" class="text-xs text-gray-400">' + t("oneConfigPerPortLabel") + '</label></div><p class="text-[11px] text-gray-500 mt-1 pr-6">' + t("oneConfigPerPortHint") + '</p></div>' + partDisplaySettingsHtml(part) + autoRefreshBlock + uploadBoostBlock + (part.truncated ? '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-2 rounded-lg text-[11px]">' + t("partTruncatedWarning") + '</div>' : "") + '<button class="save-part-btn w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-xs font-bold transition border border-gray-700" data-part="' + part.id + '">' + t("savePartBtn") + '</button></div>' + selectAllRow + '<div class="space-y-2 mb-3" id="configRows-' + part.id + '">' + configRows + '</div><div class="flex gap-2"><input type="text" id="newConfig-' + part.id + '" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="' + escapeHtml(t("addConfigPlaceholder")) + '"><button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="' + part.id + '">' + t("addBtn") + '</button></div></div>';
}
function renderManualAddCard(lists, parts) {
  var hasManual = parts.some(function(p) {
    return p.kind === "manual";
  });
  var el = document.getElementById("manualAddCard");
  if (hasManual) {
    if (el) el.remove();
    return;
  }
  if (el) return;
  var card = document.createElement("div");
  card.id = "manualAddCard";
  card.className = "bg-gray-900/30 border border-dashed border-gray-700 rounded-xl p-4 text-center";
  card.innerHTML = '<p class="text-xs text-gray-500 mb-2">' + t("noManualPartYet") + '</p><div class="flex gap-2"><input type="text" id="newConfig-manual-new" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="vless://..."><button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="manual-new">' + t("addBtn") + '</button></div>';
  document.getElementById("editorPartsContainer").appendChild(card);
}
function flushPendingNameEditsForPart(partId) {
  var partCard = document.querySelector('[data-part-card="' + partId + '"]');
  if (!partCard) return Promise.resolve();
  var wraps = Array.prototype.slice.call(partCard.querySelectorAll(".cfg-name-wrap"));
  var jobs = [];
  wraps.forEach(function(wrap) {
    var configId = wrap.getAttribute("data-id");
    if (!pendingNameEdits.hasOwnProperty(configId)) return;
    var newName = pendingNameEdits[configId];
    jobs.push(jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId + "/configs/" + configId + "/name", {
      method: "PUT",
      body: JSON.stringify({ name: newName })
    }));
    delete pendingNameEdits[configId];
  });
  return Promise.all(jobs);
}
function savePartSettings(partId) {
  if (!editorSourceId) return;
  var catInd = document.getElementById("catInd-" + partId);
  var category = catInd && catInd.checked ? "independent" : "cloudflare";
  var useCleanIp = document.getElementById("useCleanIp-" + partId).checked;
  var matchRangesEl = document.getElementById("matchRanges-" + partId);
  var matchKnownRangesOnly = matchRangesEl ? matchRangesEl.checked : true;
  var distRand = document.getElementById("distRand-" + partId);
  var distribution = distRand && distRand.checked ? "random" : "multiply";
  var cleanIpListId = document.getElementById("listId-" + partId).value;
  var oneConfigPerPort = document.getElementById("oneConfigPerPort-" + partId).checked;
  var selectedPorts = Array.prototype.slice.call(document.querySelectorAll(".port-cb-" + partId + ":checked")).map(function(cb) {
    return cb.value;
  });
  var payload = { category, useCleanIp, matchKnownRangesOnly, distribution, cleanIpListId, oneConfigPerPort, selectedPorts };
  var emojiCb = document.querySelector('.part-display-emoji[data-part="' + partId + '"]');
  if (emojiCb) payload.emojiEnabled = emojiCb.checked;
  var pctCb = document.querySelector('.part-display-pct[data-part="' + partId + '"]');
  if (pctCb) {
    payload.usagePercentEnabled = pctCb.checked;
    if (pctCb.checked) {
      var connSelect = document.querySelector('.part-display-pct-conn[data-part="' + partId + '"]');
      var scriptSelect = document.querySelector('.part-display-pct-script[data-part="' + partId + '"]');
      var connId = connSelect ? connSelect.value : "";
      var scriptName = scriptSelect ? scriptSelect.value : "";
      if (!connId || !scriptName) {
        showToast(t("needConnAndScript"), "error");
        return;
      }
      payload.usagePercentCfConnectionId = connId;
      payload.usagePercentScriptName = scriptName;
    }
  }
  var nameModeOriginalEl = document.getElementById("nameModeOriginal-" + partId);
  if (nameModeOriginalEl) payload.nameMode = nameModeOriginalEl.checked ? "original" : "auto";
  var autoNumberEl = document.getElementById("autoNumberEnabled-" + partId);
  if (autoNumberEl) payload.autoNumberEnabled = autoNumberEl.checked;
  var uploadBoostEl = document.getElementById("uploadBoost-" + partId);
  if (uploadBoostEl) {
    payload.uploadBoostEnabled = uploadBoostEl.checked;
    var protocols = [];
    var vlessEl = document.getElementById("uploadBoostProtoVless-" + partId);
    var trojanEl = document.getElementById("uploadBoostProtoTrojan-" + partId);
    if (vlessEl && vlessEl.checked) protocols.push("vless");
    if (trojanEl && trojanEl.checked) protocols.push("trojan");
    payload.uploadBoostProtocols = protocols;
    payload.uploadBoostFingerprint = readUploadBoostField("fp", partId);
    payload.uploadBoostCipherSuites = readUploadBoostField("cs", partId);
    payload.uploadBoostFragmentMask = readUploadBoostField("fm", partId);
  }
  var autoRefreshEl = document.getElementById("autoRefresh-" + partId);
  if (autoRefreshEl) {
    var minutesEl = document.getElementById("autoRefreshMinutes-" + partId);
    var minutes = parseInt(minutesEl.value, 10);
    if (!minutes || minutes < 15) {
      showToast(t("autoRefreshMinInvalid"), "error");
      return;
    }
    payload.autoRefreshEnabled = autoRefreshEl.checked;
    payload.autoRefreshMinutes = minutes;
  }
  var batchPayload = computePartBatchPayload(partId);
  var batchTouched = batchPayload.deletedConfigIds.length > 0 || pendingOrder.hasOwnProperty(partId) || Object.keys(pendingIncluded).some(function(id) {
    return isConfigIdInPart(partId, id);
  });
  Promise.all([
    flushPendingNameEditsForPart(partId),
    batchTouched ? jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId + "/configs/batch", {
      method: "PUT",
      body: JSON.stringify(batchPayload)
    }) : Promise.resolve({ ok: true, result: { success: true } })
  ]).then(function(results) {
    var batchResult = results[1];
    if (!(batchResult.ok && batchResult.result.success)) {
      showToast(translateApiError(batchResult.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).CONFIG_BATCH_UPDATE_FAILED), "error");
      return Promise.reject(new Error("batch-failed"));
    }
    if (batchResult.result.capped) showToast(t("blockedConfigsCapped"), "error");
    return jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }).then(function(r) {
    if (!r) return;
    if (r.ok && r.result.success) {
      showToast(t("partSettingsSaved"));
      clearPendingConfigStateForPart(partId);
    } else {
      showToast(translateApiError(r.result, t("partSettingsSaveFailed")), "error");
    }
    loadData();
    refreshConfigEditor();
  }).catch(function(e) {
    if (e && e.message === "batch-failed") return;
    showToast(t("networkError"), "error");
  });
}
function computePartBatchPayload(partId) {
  var baseline = editorPartsCache[partId] && editorPartsCache[partId].configs || [];
  var order = pendingOrder[partId] || baseline.map(function(c) {
    return c.configId;
  });
  var deleted = [];
  var blocked = [];
  var finalOrder = [];
  order.forEach(function(id) {
    if (pendingDeletes[id]) {
      deleted.push(id);
      return;
    }
    finalOrder.push(id);
    var baseCfg = baseline.filter(function(c) {
      return c.configId === id;
    })[0];
    var included = pendingIncluded.hasOwnProperty(id) ? pendingIncluded[id] : baseCfg ? !baseCfg.blocked : true;
    if (!included) blocked.push(id);
  });
  return { order: finalOrder, deletedConfigIds: deleted, blockedConfigIds: blocked };
}
function isConfigIdInPart(partId, configId) {
  var baseline = editorPartsCache[partId] && editorPartsCache[partId].configs || [];
  return baseline.some(function(c) {
    return c.configId === configId;
  });
}
function clearPendingConfigStateForPart(partId) {
  var baseline = editorPartsCache[partId] && editorPartsCache[partId].configs || [];
  baseline.forEach(function(c) {
    delete pendingDeletes[c.configId];
    delete pendingIncluded[c.configId];
  });
  delete pendingOrder[partId];
}
function startEditConfigName(wrap) {
  if (wrap.querySelector("input")) return;
  var configId = wrap.getAttribute("data-id");
  var defaultName = wrap.getAttribute("data-default-name") || "AutoSub";
  var savedCustom = wrap.getAttribute("data-saved-custom") || "";
  var current = pendingNameEdits.hasOwnProperty(configId) ? pendingNameEdits[configId] || defaultName : savedCustom || defaultName;
  var nameSpan = wrap.querySelector(".cfg-name-display");
  if (!nameSpan) return;
  var input = document.createElement("input");
  input.type = "text";
  input.className = "cfg-name-input min-w-0 flex-1 bg-gray-950 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-gray-100 focus:outline-none";
  input.dir = "ltr";
  input.maxLength = 60;
  input.value = current;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();
}
function commitConfigNameEdit(wrap, input) {
  var configId = wrap.getAttribute("data-id");
  var defaultName = wrap.getAttribute("data-default-name") || "AutoSub";
  var savedCustom = wrap.getAttribute("data-saved-custom") || "";
  var typed = input.value.trim();
  if (typed === savedCustom) {
    delete pendingNameEdits[configId];
  } else if (!typed || typed === defaultName) {
    pendingNameEdits[configId] = "";
  } else {
    pendingNameEdits[configId] = typed;
  }
  renderConfigNameWrap(wrap);
}
function renderConfigNameWrap(wrap) {
  var configId = wrap.getAttribute("data-id");
  var defaultName = wrap.getAttribute("data-default-name") || "AutoSub";
  var savedCustom = wrap.getAttribute("data-saved-custom") || "";
  var host = wrap.getAttribute("data-host") || "";
  var shown = pendingNameEdits.hasOwnProperty(configId) ? pendingNameEdits[configId] || defaultName : savedCustom || defaultName;
  var nameSpan = document.createElement("span");
  nameSpan.className = "cfg-name-display flex-1 min-w-0 truncate text-xs text-gray-300 cursor-text hover:text-white transition";
  nameSpan.title = t("editNameTitle");
  nameSpan.textContent = shown;
  var hostSpan = document.createElement("span");
  hostSpan.className = "max-w-[45%] min-w-0 shrink truncate text-[11px] text-gray-600";
  hostSpan.title = host;
  hostSpan.textContent = "(" + host + ")";
  wrap.innerHTML = "";
  wrap.appendChild(nameSpan);
  wrap.appendChild(hostSpan);
}
function addConfigToPart(partId) {
  if (!editorSourceId) return;
  var input = document.getElementById("newConfig-" + partId);
  var raw = input.value.trim();
  if (!raw) {
    showToast(t("configRequired"), "error");
    return;
  }
  jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId + "/configs", { method: "POST", body: JSON.stringify({ raw }) }).then(function(r) {
    if (r.ok && r.result.success) {
      input.value = "";
      showToast(t("configAdded"));
      loadData();
      refreshConfigEditor();
    } else showToast(translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).CONFIG_ADD_FAILED), "error");
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
function rerenderPartCardInPlace(partId) {
  var part = editorPartsCache[partId];
  var cardEl = document.querySelector('[data-part-card="' + partId + '"]');
  if (!part || !cardEl) return;
  var idx = editorPartsOrder.indexOf(partId);
  var allParts = editorPartsOrder.map(function(id) {
    return editorPartsCache[id];
  });
  var tmp = document.createElement("div");
  tmp.innerHTML = renderPartCard(part, editorListsCache, idx, allParts);
  var newCard = tmp.firstElementChild;
  cardEl.replaceWith(newCard);
  var portsContainer = document.getElementById("ports-" + partId);
  if (portsContainer) renderPortCheckboxesInto(portsContainer, part.availablePorts, part.selectedPorts, "port-cb-" + partId);
  var selCb = newCard.querySelector(".select-all-cb[data-indeterminate]");
  if (selCb) selCb.indeterminate = true;
}
function toggleDeletePending(partId, configId) {
  pendingDeletes[configId] = !pendingDeletes[configId];
  rerenderPartCardInPlace(partId);
}
function stageConfigIncluded(partId, configId, wantIncluded) {
  pendingIncluded[configId] = wantIncluded;
  rerenderPartCardInPlace(partId);
}
function stageAllConfigsIncluded(partId, selected) {
  var part = editorPartsCache[partId];
  if (!part) return;
  orderedConfigsForPart(part).forEach(function(c) {
    if (pendingDeletes[c.configId]) return;
    pendingIncluded[c.configId] = selected;
  });
  rerenderPartCardInPlace(partId);
}
function deletePart(partId) {
  if (!editorSourceId) return;
  if (!confirm(t("confirmDeletePart"))) return;
  jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId, { method: "DELETE" }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast(t("partDeleted"));
      clearPendingConfigStateForPart(partId);
      loadData();
      refreshConfigEditor();
    } else {
      showToast(translateApiError(r.result, (currentLang === "fa" ? ERROR_MESSAGES_FA : ERROR_MESSAGES_EN).PART_DELETE_FAILED), "error");
    }
  }).catch(function() {
    showToast(t("networkError"), "error");
  });
}
document.getElementById("editorPartsContainer").addEventListener("click", function(e) {
  var saveBtn = e.target.closest(".save-part-btn");
  if (saveBtn) {
    savePartSettings(saveBtn.getAttribute("data-part"));
    return;
  }
  var resetBoostBtn = e.target.closest(".reset-upload-boost-btn");
  if (resetBoostBtn) {
    resetUploadBoostDefaults(resetBoostBtn.getAttribute("data-part"));
    return;
  }
  var addBtn = e.target.closest(".add-config-btn");
  if (addBtn) {
    addConfigToPart(addBtn.getAttribute("data-part"));
    return;
  }
  var deletePartBtn = e.target.closest(".delete-part-btn");
  if (deletePartBtn) {
    deletePart(deletePartBtn.getAttribute("data-part"));
    return;
  }
  var delBtn = e.target.closest(".delete-config-btn");
  if (delBtn) {
    toggleDeletePending(delBtn.getAttribute("data-part"), delBtn.getAttribute("data-id"));
    return;
  }
  var undoBtn = e.target.closest(".undo-delete-config-btn");
  if (undoBtn) {
    toggleDeletePending(undoBtn.getAttribute("data-part"), undoBtn.getAttribute("data-id"));
    return;
  }
  var nameWrap = e.target.closest(".cfg-name-wrap");
  if (nameWrap && !nameWrap.querySelector("input")) {
    startEditConfigName(nameWrap);
    return;
  }
});
document.getElementById("editorPartsContainer").addEventListener("change", function(e) {
  var includeCb = e.target.closest(".config-include-cb");
  if (includeCb) {
    stageConfigIncluded(includeCb.getAttribute("data-part"), includeCb.getAttribute("data-id"), includeCb.checked);
    return;
  }
  var selectAllCb = e.target.closest(".select-all-cb");
  if (selectAllCb) {
    stageAllConfigsIncluded(selectAllCb.getAttribute("data-part"), selectAllCb.checked);
    return;
  }
  var catRadio = e.target.closest('input[type="radio"][name^="cat-"]');
  if (catRadio) {
    var partId = catRadio.name.slice(4);
    var wrap = document.getElementById("rangeOnlyWrap-" + partId);
    if (wrap) wrap.classList.toggle("hidden", catRadio.value !== "independent");
    return;
  }
  var nameModeCb = e.target.closest('input[id^="nameModeOriginal-"]');
  if (nameModeCb) {
    var nmPartId = nameModeCb.id.replace("nameModeOriginal-", "");
    var numWrap = document.getElementById("autoNumberWrap-" + nmPartId);
    if (numWrap) numWrap.classList.toggle("hidden", nameModeCb.checked);
    return;
  }
});
var dragState = null;
document.getElementById("editorPartsContainer").addEventListener("pointerdown", function(e) {
  var handle = e.target.closest(".drag-handle-btn");
  if (!handle) return;
  var row = handle.closest("[data-config-id]");
  var partCard = handle.closest("[data-part-card]");
  if (!row || !partCard) return;
  e.preventDefault();
  dragState = { partId: partCard.getAttribute("data-part-card"), row, pointerId: e.pointerId };
  try {
    row.setPointerCapture(e.pointerId);
  } catch (err) {
  }
  row.classList.add("ring-2", "ring-indigo-500");
});
document.getElementById("editorPartsContainer").addEventListener("pointermove", function(e) {
  if (!dragState || dragState.pointerId !== e.pointerId) return;
  var row = dragState.row;
  var container = row.parentElement;
  if (!container) return;
  var siblings = Array.prototype.slice.call(container.children).filter(function(el) {
    return el !== row;
  });
  for (var i = 0; i < siblings.length; i++) {
    var rect = siblings[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      container.insertBefore(row, siblings[i]);
      return;
    }
  }
  container.appendChild(row);
});
function finishDrag(e) {
  if (!dragState || dragState.pointerId !== e.pointerId) return;
  var row = dragState.row;
  var partId = dragState.partId;
  row.classList.remove("ring-2", "ring-indigo-500");
  try {
    row.releasePointerCapture(dragState.pointerId);
  } catch (err) {
  }
  var container = row.parentElement;
  if (container) {
    pendingOrder[partId] = Array.prototype.slice.call(container.children).map(function(el) {
      return el.getAttribute("data-config-id");
    });
  }
  dragState = null;
}
document.getElementById("editorPartsContainer").addEventListener("pointerup", finishDrag);
document.getElementById("editorPartsContainer").addEventListener("pointercancel", finishDrag);
document.getElementById("editorPartsContainer").addEventListener("focusout", function(e) {
  var input = e.target.closest(".cfg-name-input");
  if (!input) return;
  var wrap = input.closest(".cfg-name-wrap");
  if (wrap) commitConfigNameEdit(wrap, input);
});
document.getElementById("editorPartsContainer").addEventListener("keydown", function(e) {
  var input = e.target.closest(".cfg-name-input");
  if (!input) return;
  if (e.key === "Enter") {
    e.preventDefault();
    input.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    var wrap = input.closest(".cfg-name-wrap");
    if (wrap) renderConfigNameWrap(wrap);
  }
});
document.addEventListener("DOMContentLoaded", loadData);
`;
}
