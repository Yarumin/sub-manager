export function getDashboardClientScript(baseUrl) {
  return `
var baseUrl = "${baseUrl}";
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
var UPLOAD_BOOST_FP_PRESETS_CLIENT = [
  { value: "unsafe", label: "پترنیها - unsafe (پیشنهادی)" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "safari", label: "Safari" },
  { value: "ios", label: "iOS Safari" },
  { value: "android", label: "Android Chrome" },
  { value: "edge", label: "Edge" },
  { value: "none", label: "None (بدون اثر انگشت)" }
];
var UPLOAD_BOOST_CS_PRESETS_CLIENT = [
  { key: "patternia", label: "پترنیها (پیشنهادی)", value: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256" },
  { key: "chrome_mobile", label: "Chrome موبایل", value: "TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384" },
  { key: "firefox", label: "Firefox", value: "TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA" },
  { key: "chrome_desktop", label: "Chrome دسکتاپ", value: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA" },
  { key: "safari", label: "Safari", value: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA" },
  { key: "tls13_only", label: "فقط TLS 1.3", value: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256" },
  { key: "mixed", label: "ترکیبی (مدرن اول)", value: "TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA" }
];
var UPLOAD_BOOST_FM_PRESETS_CLIENT = [
  { key: "patternia", label: "پترنیها (پیشنهادی)", value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["5","94","1"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["109","1"],"delays":["1"],"maxSplit":"355"}}]}' },
  { key: "aggressive", label: "تهاجمی (تکه‌های خیلی کوچک)", value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["1","50","2"],"delays":["1"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["40","1"],"delays":["2"],"maxSplit":"500"}}]}' },
  { key: "balanced", label: "متعادل", value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["3","120","2"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["80","2"],"delays":["1"],"maxSplit":"300"}}]}' },
  { key: "fast", label: "سریع (تکه‌های بزرگ‌تر)", value: '{"tcp":[{"type":"fragment","settings":{"packets":"tlshello","lengths":["8","180","3"],"delays":["0"],"maxSplit":"0"}},{"type":"fragment","settings":{"packets":"1-1","lengths":["150","2"],"delays":["0"],"maxSplit":"200"}}]}' }
];
var PLACEMENT_REGION_PRESETS_CLIENT = [
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
  var presets = field === "fp" ? UPLOAD_BOOST_FP_PRESETS_CLIENT : field === "cs" ? UPLOAD_BOOST_CS_PRESETS_CLIENT : UPLOAD_BOOST_FM_PRESETS_CLIENT;
  var matchedPreset = presets.find(function(p) {
    return (p.value !== undefined ? p.value : p.key) === textValue;
  });
  var placeholderLabel = matchedPreset ? "-- سفارشی (مقدار وارد شده با هیچ پیش‌فرضی مطابقت ندارد) --" : "-- انتخاب سریع از پیش‌فرض‌ها --";
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
  var randomLabel = field === "fm"
    ? "تصادفی (هر بار همگام‌سازی، پنل خودش با الگوریتم داخلی مقادیر عددی جدید تولید می‌کند)"
    : "تصادفی (هر بار همگام‌سازی، یکی از مقادیر پیشنهادی بالا به‌صورت شانسی انتخاب می‌شود)";
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
  if (placeholderOption) placeholderOption.textContent = "-- سفارشی (مقدار وارد شده با هیچ پیش‌فرضی مطابقت ندارد) --";
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
  if (csField) { csField.value = UPLOAD_BOOST_CS_PRESETS_CLIENT[0].value; csField.disabled = false; }
  if (fmField) { fmField.value = UPLOAD_BOOST_FM_PRESETS_CLIENT[0].value; fmField.disabled = false; }
  if (fpRandom) fpRandom.checked = false;
  if (csRandom) csRandom.checked = false;
  if (fmRandom) fmRandom.checked = false;
  ["uploadBoostFPSelect-", "uploadBoostCSSelect-", "uploadBoostFMSelect-"].forEach(function(prefix) {
    var sel = document.getElementById(prefix + partId);
    if (sel) sel.disabled = false;
  });
  if (vlessEl) vlessEl.checked = true;
  if (trojanEl) trojanEl.checked = true;
  showToast("تنظیمات به مقادیر پیش‌فرض پترنیها برگشت", "success");
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
var ERROR_MESSAGES = {
  EXPORT_FAILED: "\u0633\u0627\u062E\u062A \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  IMPORT_INVALID_BACKUP: "\u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A \u06CC\u0627 \u062E\u0631\u0627\u0628 \u0634\u062F\u0647",
  LIST_NAME_REQUIRED: "\u06CC\u06A9 \u0646\u0627\u0645 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0644\u06CC\u0633\u062A \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",
  LIST_NEEDS_ONE_IP: "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0622\u06CC\u200C\u067E\u06CC \u062F\u0631 \u0644\u06CC\u0633\u062A \u0644\u0627\u0632\u0645 \u0627\u0633\u062A",
  LIST_ADD_FAILED: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0644\u06CC\u0633\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  LIST_NOT_FOUND: "\u0644\u06CC\u0633\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F",
  LIST_UPDATE_FAILED: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0644\u06CC\u0633\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  LIST_DEFAULT_UNDELETABLE: "\u0644\u06CC\u0633\u062A \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u067E\u0646\u0644 \u0642\u0627\u0628\u0644 \u062D\u0630\u0641 \u0646\u06CC\u0633\u062A",
  LIST_DELETE_FAILED: "\u062D\u0630\u0641 \u0644\u06CC\u0633\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  LIST_MAX_IPS: "\u062D\u062F\u0627\u06A9\u062B\u0631 {limit} \u0622\u06CC\u200C\u067E\u06CC \u062F\u0631 \u0647\u0631 \u0644\u06CC\u0633\u062A \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.",
  LIST_MAX_LISTS: "\u062D\u062F\u0627\u06A9\u062B\u0631 {limit} \u0644\u06CC\u0633\u062A \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.",
  SOURCE_NOT_FOUND: "\u0645\u0646\u0628\u0639 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F",
  SOURCE_NEEDS_URL_OR_MANUAL: "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628\u0633\u06A9\u0631\u06CC\u067E\u0634\u0646 \u06CC\u0627 \u06CC\u06A9 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u062F\u0633\u062A\u06CC \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",
  SOURCE_NO_VALID_CONFIGS: "\u0647\u06CC\u0686 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0645\u0639\u062A\u0628\u0631\u06CC \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0646\u0634\u062F",
  SOURCE_ADD_FAILED: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0645\u0646\u0628\u0639 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  SOURCE_DELETE_FAILED: "\u062D\u0630\u0641 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  SOURCE_MAX_URLS: "\u062D\u062F\u0627\u06A9\u062B\u0631 {limit} \u0644\u06CC\u0646\u06A9 \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.",
  SOURCE_MAX_MANUAL_LINES: "\u062D\u062F\u0627\u06A9\u062B\u0631 {limit} \u062E\u0637 \u062F\u0633\u062A\u06CC \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.",
  SLUG_TAKEN: "\u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0642\u0628\u0644\u0627\u064B \u0628\u0631\u0627\u06CC \u06CC\u06A9 \u0633\u0627\u0628\u0633\u06A9\u0631\u06CC\u067E\u0634\u0646 \u062F\u06CC\u06AF\u0631 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0634\u062F\u0647 \u0627\u0633\u062A.",
  SLUG_UPDATE_FAILED: "\u062A\u063A\u06CC\u06CC\u0631 \u0644\u06CC\u0646\u06A9 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  SLUG_INVALID_FORMAT: "\u0644\u06CC\u0646\u06A9 \u0628\u0627\u06CC\u062F \u0628\u06CC\u0646 {min} \u062A\u0627 {max} \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC\u060C \u0639\u062F\u062F\u060C \u062E\u0637 \u062A\u06CC\u0631\u0647 \u06CC\u0627 \u0632\u06CC\u0631\u062E\u0637 \u0628\u0627\u0634\u062F.",
  PART_NOT_FOUND: "\u0627\u06CC\u0646 \u0628\u062E\u0634 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F",
  PART_UPDATE_FAILED: "\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  PART_DELETE_FAILED: "\u062D\u0630\u0641 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_BATCH_UPDATE_FAILED: "\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  PART_MAX_CONFIGS: "\u0627\u06CC\u0646 \u0628\u062E\u0634 \u0628\u0647 \u0633\u0642\u0641 {limit} \u0642\u0627\u0644\u0628 \u0631\u0633\u06CC\u062F\u0647 \u0627\u0633\u062A.",
  PART_MAX_BLOCKED: "\u062D\u062F\u0627\u06A9\u062B\u0631 {limit} \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0628\u0644\u0627\u06A9\u200C\u0634\u062F\u0647 \u062F\u0631 \u0647\u0631 \u0628\u062E\u0634 \u0645\u062C\u0627\u0632 \u0627\u0633\u062A.",
  PART_MAX_CUSTOM_NAMES: "\u0633\u0642\u0641 \u062A\u0639\u062F\u0627\u062F \u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u0633\u0641\u0627\u0631\u0634\u06CC \u0627\u06CC\u0646 \u0628\u062E\u0634 ({limit}) \u067E\u0631 \u0634\u062F\u0647 \u0627\u0633\u062A.",
  PART_OUTPUT_TRUNCATED: "\u062A\u0639\u062F\u0627\u062F \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0646\u0647\u0627\u06CC\u06CC \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0627\u0632 \u0633\u0642\u0641 \u0645\u062C\u0627\u0632 ({limit}) \u0628\u06CC\u0634\u062A\u0631 \u0628\u0648\u062F\u061B \u0641\u0642\u0637 {kept} \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0632 {total} \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u062A\u0635\u0627\u062F\u0641\u06CC \u062F\u0631 \u062E\u0631\u0648\u062C\u06CC \u0642\u0631\u0627\u0631 \u06AF\u0631\u0641\u062A.",
  SYNC_FAILED: "\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_EMPTY: "\u06A9\u0627\u0646\u0641\u06CC\u06AF \u062E\u0627\u0644\u06CC \u0627\u0633\u062A",
  CONFIG_INVALID_FORMAT: "\u0641\u0631\u0645\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A",
  CONFIG_DUPLICATE: "\u0627\u06CC\u0646 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0632 \u0642\u0628\u0644 \u0648\u062C\u0648\u062F \u062F\u0627\u0631\u062F",
  CONFIG_ADD_FAILED: "\u0627\u0641\u0632\u0648\u062F\u0646 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_NOT_FOUND: "\u06A9\u0627\u0646\u0641\u06CC\u06AF \u06CC\u0627\u0641\u062A \u0646\u0634\u062F",
  CONFIG_DELETE_FAILED: "\u062D\u0630\u0641 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_TOGGLE_FAILED: "\u062A\u063A\u06CC\u06CC\u0631 \u0648\u0636\u0639\u06CC\u062A \u0628\u0644\u0627\u06A9 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_BULK_TOGGLE_FAILED: "\u062A\u063A\u06CC\u06CC\u0631 \u0648\u0636\u0639\u06CC\u062A \u06AF\u0631\u0648\u0647\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_RENAME_FAILED: "\u062A\u063A\u06CC\u06CC\u0631 \u0646\u0627\u0645 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CONFIG_REORDER_FAILED: "\u062A\u063A\u06CC\u06CC\u0631 \u062A\u0631\u062A\u06CC\u0628 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F",
  CF_CONNECTION_ADD_FAILED: "افزودن اتصال API ناموفق بود",
  CF_CONNECTION_DELETE_FAILED: "حذف اتصال API ناموفق بود",
  CF_CONNECTION_NOT_FOUND: "این اتصال API یافت نشد",
  CF_CREDENTIALS_REQUIRED: "وارد کردن Account ID و API Token لازم است",
  CF_TOKEN_INVALID: "Account ID یا API Token نادرست است، یا توکن به این اکانت دسترسی ندارد",
  CF_VALIDATION_FAILED: "اتصال به کلودفلر برای اعتبارسنجی ناموفق بود",
  CF_SCRIPTS_LIST_FAILED: "دریافت فهرست ورکرها ناموفق بود",
  CF_SCRIPT_NAME_REQUIRED: "انتخاب یک ورکر لازم است",
  CF_PLACEMENT_INVALID: "حالت Placement نامعتبر است",
  CF_PLACEMENT_UPDATE_FAILED: "اعمال Placement ناموفق بود",
  SOURCE_DISPLAY_SETTINGS_FAILED: "ذخیره تنظیمات نمایش ناموفق بود",
  USAGE_PERCENT_NEEDS_TARGET: "برای نمایش درصد مصرف، یک اتصال API و یک ورکر انتخاب کنید",
  CLEAN_IP_LIST_EMPTY: "لیست آی‌پی تمیز انتخاب‌شده خالی است؛ کانفیگ‌های این بخش بدون جایگزینی عبور داده شدند.",
  UNAUTHORIZED: "نشست شما منقضی شده است. در حال انتقال به صفحه ورود..."
};
function translateApiError(result, fallback) {
  if (result && typeof result.error === "string" && ERROR_MESSAGES[result.error]) {
    var text = ERROR_MESSAGES[result.error];
    var params = result.errorParams || {};
    Object.keys(params).forEach(function(k) {
      text = text.split("{" + k + "}").join(params[k]);
    });
    return text;
  }
  return fallback;
}
function jsonFetch(url, opts) {
  return fetch(url, opts).then(function(res) {
    if (res.status === 401) {
      showToast(ERROR_MESSAGES.UNAUTHORIZED, "error");
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
    container.innerHTML = '<span class="text-[11px] text-gray-500">\u0647\u0646\u0648\u0632 \u0647\u06CC\u0686 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u06CC \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0646\u0634\u062F\u0647.</span>';
    return;
  }
  var out = [];
  for (var i = 0; i < allPorts.length; i++) {
    var p = allPorts[i];
    var isChecked = selectedPorts.indexOf(p) !== -1;
    out.push(
      '<label class="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition"><input type="checkbox" value="' + p + '" class="' + cssClass + ' form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-700 bg-gray-900"' + (isChecked ? " checked" : "") + '><span class="text-xs text-gray-300">' + p + "</span></label>"
    );
  }
  container.innerHTML = out.join("");
}
function renderItemCard(item) {
  var updatedStr = item.updatedAt ? new Date(item.updatedAt).toLocaleString("fa-IR") : "\u2014";
  var subLink = baseUrl + "/sub/" + (item.slug || item.id);
  var safeName = escapeHtml(item.name || "\u0628\u062F\u0648\u0646 \u0646\u0627\u0645");
  var categoryLabel = item.category === "independent" ? "\u0633\u0631\u0648\u0631 \u0645\u0633\u062A\u0642\u0644" : item.category === "mixed" ? "\u062A\u0631\u06A9\u06CC\u0628\u06CC" : "\u06A9\u0644\u0648\u062F\u0641\u0644\u0631";
  var categoryClass = item.category === "independent" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : item.category === "mixed" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20";
  var partsLabel = (item.partsCount || 0) + " \u0628\u062E\u0634";
  var warningsHtml = "";
  if (item.truncated) warningsHtml += '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] p-2 rounded-lg mt-2">\u26A0\uFE0F \u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9\u06CC \u0627\u0632 \u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0645\u0646\u0628\u0639 \u0628\u0647 \u0633\u0642\u0641 \u062A\u0639\u062F\u0627\u062F \u0642\u0627\u0644\u0628\u200C\u0647\u0627 \u0631\u0633\u06CC\u062F\u0647.</div>';
  (item.partWarnings || []).forEach(function(w) {
    var msg = translateApiError({ error: w.message, errorParams: w.params }, w.message);
    warningsHtml += '<div class="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] p-2 rounded-lg mt-2">\u26A0\uFE0F ' + escapeHtml(msg) + "</div>";
  });
  return '<div class="bg-gray-900/80 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition"><div class="flex justify-between items-start mb-2"><div><h3 class="font-bold text-sm text-gray-200">' + safeName + '</h3><div class="flex flex-wrap gap-1 mt-1"><span class="text-[10px] px-2 py-0.5 rounded border ' + categoryClass + '">' + categoryLabel + '</span><span class="text-[10px] px-2 py-0.5 rounded border bg-gray-800 text-gray-400 border-gray-700">' + partsLabel + '</span></div><span class="text-[11px] text-gray-500 block mt-1">\u0622\u067E\u062F\u06CC\u062A: ' + updatedStr + '</span></div><span class="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-1 rounded border border-indigo-500/20">' + item.baseCount + " \u0642\u0627\u0644\u0628 &larr; " + item.finalCount + " \u06A9\u0627\u0646\u0641\u06CC\u06AF</span></div>" + warningsHtml + '<div class="flex flex-wrap gap-2 mt-4"><button class="copy-link-btn flex-1 bg-white text-gray-900 hover:bg-gray-200 text-xs font-bold py-2 rounded-lg transition shadow-md" data-link="' + escapeHtml(subLink) + '">\u06A9\u067E\u06CC \u0644\u06CC\u0646\u06A9</button><button class="sync-one-btn bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-2 rounded-lg border border-emerald-500/20 transition text-xs font-bold" data-id="' + item.id + '">\u0633\u06CC\u0646\u06A9</button><button class="edit-configs-btn bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-3 py-2 rounded-lg border border-purple-500/20 transition text-xs font-bold" data-id="' + item.id + '" data-name="' + safeName + '">\u0648\u06CC\u0631\u0627\u06CC\u0634</button><button class="delete-source-btn bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg border border-red-500/20 transition" data-id="' + item.id + '">\u062D\u0630\u0641</button></div></div>';
}
function copyLink(link) {
  navigator.clipboard.writeText(link).then(function() {
    showToast("\u0644\u06CC\u0646\u06A9 \u06A9\u067E\u06CC \u0634\u062F!");
  }).catch(function() {
    showToast("\u06A9\u067E\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0645\u0645\u06A9\u0646 \u0646\u0634\u062F - \u0644\u06CC\u0646\u06A9: " + link, "error");
  });
}
function renderCleanIpListsContainer(lists) {
  var wrap = document.getElementById("cleanIpListsContainer");
  if (!lists || lists.length === 0) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = lists.map(function(l) {
    var delBtn = l.builtin ? '<span class="text-[10px] text-gray-600">\u067E\u06CC\u0634\u200C\u0641\u0631\u0636</span>' : '<button class="del-list-btn text-red-400 hover:text-red-300 text-xs" data-id="' + l.id + '">\u062D\u0630\u0641</button>';
    return '<div class="bg-gray-900/60 border border-gray-800 rounded-lg p-3"><div class="flex items-center justify-between mb-2"><input type="text" class="list-name-input bg-transparent text-sm font-bold text-gray-200 border-b border-transparent focus:border-sky-500 focus:outline-none w-2/3" data-id="' + l.id + '" value="' + escapeHtml(l.name) + '">' + delBtn + '</div><textarea class="list-ips-input w-full bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono text-[11px]" dir="ltr" rows="3" data-id="' + l.id + '">' + escapeHtml((l.ips || []).join("\\n")) + '</textarea><button class="save-list-btn w-full mt-2 bg-gray-800 hover:bg-gray-700 py-1.5 rounded-lg text-[11px] font-bold transition border border-gray-700" data-id="' + l.id + '">\u0630\u062E\u06CC\u0631\u0647 \u0627\u06CC\u0646 \u0644\u06CC\u0633\u062A (' + (l.ips || []).length + " \u0622\u06CC\u200C\u067E\u06CC)</button></div>";
  }).join("");
}
function addCleanIpList() {
  var name = document.getElementById("newListName").value.trim();
  var ips = document.getElementById("newListIps").value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  if (!name || ips.length === 0) {
    showToast("\u0646\u0627\u0645 \u0648 \u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0622\u06CC\u200C\u067E\u06CC \u0644\u0627\u0632\u0645 \u0627\u0633\u062A", "error");
    return;
  }
  jsonFetch("/api/clean-ip-lists", { method: "POST", body: JSON.stringify({ name, ips }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("newListName").value = "";
      document.getElementById("newListIps").value = "";
      showToast("\u0644\u06CC\u0633\u062A \u0633\u0627\u062E\u062A\u0647 \u0634\u062F");
      loadData();
    } else showToast(translateApiError(r.result, "\u0633\u0627\u062E\u062A \u0644\u06CC\u0633\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
  });
}
function saveCleanIpList(listId) {
  var name = document.querySelector('.list-name-input[data-id="' + listId + '"]').value.trim();
  var ips = document.querySelector('.list-ips-input[data-id="' + listId + '"]').value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  jsonFetch("/api/clean-ip-lists/" + listId, { method: "PUT", body: JSON.stringify({ name, ips }) }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast("\u0644\u06CC\u0633\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F");
      loadData();
    } else showToast(translateApiError(r.result, "\u0630\u062E\u06CC\u0631\u0647 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
  });
}
function deleteCleanIpList(listId) {
  if (!confirm("\u0627\u06CC\u0646 \u0644\u06CC\u0633\u062A \u062D\u0630\u0641 \u0634\u0648\u062F\u061F")) return;
  jsonFetch("/api/clean-ip-lists/" + listId, { method: "DELETE" }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast("\u062D\u0630\u0641 \u0634\u062F");
      loadData();
    } else showToast(translateApiError(r.result, "\u062D\u0630\u0641 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
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
    return '<div class="bg-gray-900/60 border border-gray-800 rounded-lg p-2 text-xs"><div class="flex items-center justify-between"><div class="text-gray-300"><b>' + escapeHtml(c.label) + '</b> <span class="text-gray-500" dir="ltr">(' + accountLabel + ", " + escapeHtml(c.tokenPreview) + ')</span></div><div class="flex items-center gap-2 shrink-0"><button class="cf-placement-btn text-indigo-400 hover:text-indigo-300 px-1" data-id="' + c.id + '">Placement</button><button class="del-cf-btn text-red-400 hover:text-red-300 px-1" data-id="' + c.id + '">حذف</button></div></div><div class="cf-placement-box hidden mt-2 pt-2 border-t border-gray-800" id="cf-placement-' + c.id + '"></div></div>';
  }).join("");
}
function addCfConnection() {
  var label = document.getElementById("newCf-label").value.trim();
  var accountId = document.getElementById("newCf-account").value.trim();
  var apiToken = document.getElementById("newCf-token").value.trim();
  if (!accountId || !apiToken) {
    showToast("وارد کردن Account ID و API Token لازم است", "error");
    return;
  }
  showToast("در حال بررسی اعتبار نزد کلودفلر...");
  jsonFetch("/api/cf-connections", { method: "POST", body: JSON.stringify({ label, accountId, apiToken }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("newCf-label").value = "";
      document.getElementById("newCf-account").value = "";
      document.getElementById("newCf-token").value = "";
      showToast("اتصال API با موفقیت تأیید و اضافه شد!");
      loadData();
    } else showToast(translateApiError(r.result, "اعتبارسنجی ناموفق بود"), "error");
  }).catch(function() {
    showToast("خطای شبکه هنگام بررسی اعتبار", "error");
  });
}
function deleteCfConnection(id) {
  if (!confirm("این اتصال API حذف شود؟")) return;
  fetch("/api/cf-connections/" + id, { method: "DELETE" }).then(function() {
    showToast("حذف شد");
    loadData();
  }).catch(function() {
    showToast("خطا در حذف", "error");
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
  box.innerHTML = '<span class="text-[11px] text-gray-500">در حال دریافت فهرست ورکرها...</span>';
  fetch("/api/cf-connections/" + connId + "/scripts").then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.success) {
      box.innerHTML = '<span class="text-[11px] text-orange-400">دریافت فهرست ورکرها ناموفق بود - توکن باید مجوز Workers Scripts داشته باشد.</span>';
      return;
    }
    cfScriptsCache[connId] = data.scripts || [];
    if (data.scripts.length === 0) {
      box.innerHTML = '<span class="text-[11px] text-gray-500">هیچ ورکری در این اکانت یافت نشد.</span>';
      return;
    }
    var regionOptions = PLACEMENT_REGION_PRESETS_CLIENT.map(function(r) {
      return '<option value="' + r.value + '">' + escapeHtml(r.label) + '</option>';
    }).join("");
    var scriptOptions = data.scripts.map(function(s) {
      return '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + "</option>";
    }).join("");
    box.innerHTML = '<div class="space-y-2"><select class="cf-placement-script w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]" dir="ltr">' + scriptOptions + '</select><div class="flex flex-wrap gap-1.5"><button class="cf-placement-apply text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded" data-mode="smart">Smart Placement</button><button class="cf-placement-apply text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-2 py-1 rounded" data-mode="off">پیش‌فرض (تلاش برای خاموش کردن)</button></div><p class="text-[10px] text-gray-600">توجه: برگرداندن Placement به پیش‌فرض یک باگ شناخته‌شده در خودِ API کلودفلر دارد (حتی از داشبورد رسمی هم گاهی با همین خطا مواجه می‌شود) و ممکن است با خطا مواجه شود؛ در آن صورت باید از داشبورد کلودفلر (Workers &amp; Pages ← ورکر موردنظر ← Settings ← Runtime ← Placement) به‌صورت دستی روی Default تنظیمش کنید.</p><div class="flex items-center gap-1.5" dir="ltr"><select class="cf-placement-region flex-1 bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]"><option value="">-- Region سفارشی/آماده --</option>' + regionOptions + '</select><button class="cf-placement-apply text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded shrink-0" data-mode="region">اعمال</button></div><input class="cf-placement-region-custom w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px] font-mono" dir="ltr" placeholder="یا provider:region دلخواه، مثل azure:israelcentral"><p class="text-[10px] text-gray-600">اگر Region سفارشی پر باشد به‌جای گزینه‌ی بالا استفاده می‌شود.</p><div class="cf-placement-result text-[11px]"></div></div>';
  }).catch(function() {
    box.innerHTML = '<span class="text-[11px] text-orange-400">خطای شبکه هنگام دریافت فهرست ورکرها.</span>';
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
        showToast("یک Region انتخاب یا وارد کنید", "error");
        return;
      }
      payload.region = region;
    } else {
      payload.mode = mode;
    }
    var resultEl = box.querySelector(".cf-placement-result");
    resultEl.textContent = "در حال اعمال...";
    resultEl.className = "cf-placement-result text-[11px] text-gray-400";
    jsonFetch("/api/cf-connections/" + connId + "/placement", { method: "PUT", body: JSON.stringify(payload) }).then(function(r) {
      if (r.ok && r.result.success) {
        resultEl.textContent = "Placement اعمال شد.";
        resultEl.className = "cf-placement-result text-[11px] text-emerald-400";
      } else {
        var msg = (r.result && r.result.message) || translateApiError(r.result, "اعمال Placement ناموفق بود");
        resultEl.textContent = msg;
        resultEl.className = "cf-placement-result text-[11px] text-orange-400";
      }
    }).catch(function() {
      resultEl.textContent = "خطای شبکه";
      resultEl.className = "cf-placement-result text-[11px] text-orange-400";
    });
  }
});
function statsCardSkeleton(conn) {
  return '<div class="bg-gray-900/50 p-5 rounded-xl border border-gray-800" id="cf-card-' + conn.id + '"><div class="flex items-center justify-between"><div><span class="text-gray-400 text-sm block mb-1">' + escapeHtml(conn.label) + '</span><div class="flex items-baseline gap-2"><strong class="cf-req-value text-3xl text-white font-black">---</strong><span class="text-gray-500 text-sm">/ 100,000 \u0631\u0627\u06CC\u06AF\u0627\u0646</span></div></div><div class="cf-chart-el w-16 h-16 rounded-full border-4 border-gray-800 flex items-center justify-center relative"><span class="text-xs text-gray-500">%</span></div></div><div class="cf-err-box hidden mt-3 text-orange-400 text-[11px]"></div></div>';
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
    fetch("/api/cf-connections/" + conn.id + "/stats").then(function(res) {
      return res.json();
    }).then(function(data) {
      var card = document.getElementById("cf-card-" + conn.id);
      if (!card) return;
      var reqEl = card.querySelector(".cf-req-value");
      var errBox = card.querySelector(".cf-err-box");
      var chartEl = card.querySelector(".cf-chart-el");
      if (data.error) {
        reqEl.textContent = "---";
        errBox.textContent = data.error;
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
  return fetch("/api/state").then(function(res) {
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
    countBadge.textContent = (data.items || []).length + " \u0645\u0648\u0631\u062F";
    if (!data.items || data.items.length === 0) {
      listEl.innerHTML = '<div class="text-center text-gray-500 py-8 text-sm border border-dashed border-gray-700 rounded-xl flex flex-col items-center gap-2"><svg class="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span>\u0647\u0646\u0648\u0632 \u0645\u0646\u0628\u0639\u06CC \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 - \u0627\u0632 \u0641\u0631\u0645 \u0628\u0627\u0644\u0627 \u0634\u0631\u0648\u0639 \u06A9\u0646\u06CC\u062F.</span></div>';
    } else {
      listEl.innerHTML = data.items.map(renderItemCard).join("");
    }
    fetchAllStats();
  }).catch(function() {
    showToast("\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A", "error");
  });
}
function addSource() {
  var name = document.getElementById("sourceName").value || "\u0645\u0646\u0628\u0639 \u062C\u062F\u06CC\u062F";
  var urls = document.getElementById("sourceUrls").value.split("\\n").map(function(i) {
    return i.trim();
  }).filter(Boolean);
  var manual = document.getElementById("sourceManual").value;
  var category = document.getElementById("catIndependent").checked ? "independent" : "cloudflare";
  var useCleanIp = document.getElementById("sourceUseCleanIp").checked;
  var nameModeUrl = document.getElementById("nameModeUrlOriginal").checked ? "original" : "auto";
  var nameModeManual = document.getElementById("nameModeManualOriginal").checked ? "original" : "auto";
  if (urls.length === 0 && !manual.trim()) {
    showToast("لطفاً حداقل یک لینک سابسکریپشن یا یک کانفیگ دستی وارد کنید", "error");
    return;
  }
  showToast("در حال استخراج قالب‌ها و ساخت کانفیگ‌های جدید...");
  jsonFetch("/api/sources", { method: "POST", body: JSON.stringify({ name, urls, manual, category, useCleanIp, nameModeUrl, nameModeManual }) }).then(function(r) {
    if (r.ok && r.result.success) {
      document.getElementById("sourceUrls").value = "";
      document.getElementById("sourceManual").value = "";
      showToast("منبع با موفقیت اضافه شد!");
      loadData();
    } else showToast(translateApiError(r.result, "خطا در افزودن منبع"), "error");
  }).catch(function() {
    showToast("خطای شبکه", "error");
  });
}
function deleteSource(id) {
  if (!confirm("\u0622\u06CC\u0627 \u0627\u06CC\u0646 \u0645\u0646\u0628\u0639 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F")) return;
  fetch("/api/sources/" + id, { method: "DELETE" }).then(function() {
    showToast("\u062D\u0630\u0641 \u0634\u062F");
    if (editorSourceId === id) closeConfigEditor();
    loadData();
  }).catch(function() {
    showToast("\u062E\u0637\u0627 \u062F\u0631 \u062D\u0630\u0641", "error");
  });
}
function syncOneSource(id) {
  showToast("\u062F\u0631 \u062D\u0627\u0644 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0627\u06CC\u0646 \u0645\u0646\u0628\u0639...");
  fetch("/api/sources/" + id + "/sync", { method: "POST" }).then(function() {
    showToast("\u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0634\u062F");
    loadData();
    if (editorSourceId === id) refreshConfigEditor();
  }).catch(function() {
    showToast("\u062E\u0637\u0627 \u062F\u0631 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC", "error");
  });
}
function syncAll() {
  showToast("\u062F\u0631 \u062D\u0627\u0644 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0647\u0645\u0647\u200C\u06CC \u0645\u0646\u0627\u0628\u0639...");
  fetch("/api/sync", { method: "POST" }).then(function() {
    showToast("\u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0634\u062F!");
    loadData();
    if (editorSourceId) refreshConfigEditor();
  }).catch(function() {
    showToast("\u062E\u0637\u0627 \u062F\u0631 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC", "error");
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
    showToast("\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0628\u062E\u0634 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", "error");
    return;
  }
  showToast("\u062F\u0631 \u062D\u0627\u0644 \u0633\u0627\u062E\u062A \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646...");
  fetch("/api/backup?sections=" + encodeURIComponent(sections.join(","))).then(function(res) {
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
    showToast("\u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062F\u0627\u0646\u0644\u0648\u062F \u0634\u062F");
  }).catch(function() {
    showToast("\u0633\u0627\u062E\u062A \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", "error");
  });
}
function importBackup() {
  var input = document.getElementById("importFileInput");
  var file = input.files && input.files[0];
  if (!file) {
    showToast("\u06CC\u06A9 \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", "error");
    return;
  }
  var sections = getSelectedBackupSections();
  if (sections.length === 0) {
    showToast("\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0628\u062E\u0634 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", "error");
    return;
  }
  var mode = document.getElementById("importModeReplace").checked ? "replace" : "merge";
  if (mode === "replace" && !confirm("\u0627\u06CC\u0646 \u06A9\u0627\u0631 \u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u062A\u06CC\u06A9\u200C\u062E\u0648\u0631\u062F\u0647 \u0631\u0627 \u0628\u0627 \u0645\u062D\u062A\u0648\u0627\u06CC \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0645\u06CC\u200C\u06A9\u0646\u062F \u0648 \u0642\u0627\u0628\u0644 \u0628\u0627\u0632\u06AF\u0634\u062A \u0646\u06CC\u0633\u062A. \u0627\u062F\u0627\u0645\u0647 \u0645\u06CC\u200C\u062F\u0647\u06CC\u062F\u061F")) return;
  var reader = new FileReader();
  reader.onload = function() {
    var parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      showToast("\u0641\u0627\u06CC\u0644 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647 \u06CC\u06A9 JSON \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A", "error");
      return;
    }
    parsed.__importMode = mode;
    parsed.__importSections = sections;
    showToast("\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0627\u0632 \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646...");
    jsonFetch("/api/backup", { method: "POST", body: JSON.stringify(parsed) }).then(function(r) {
      if (r.ok && r.result.success) {
        var parts = [];
        if (sections.indexOf("sources") !== -1) parts.push(r.result.sourcesImported + " \u0633\u0627\u0628\u0633\u06A9\u0631\u06CC\u067E\u0634\u0646");
        if (sections.indexOf("cleanIpLists") !== -1) parts.push(r.result.listsImported + " \u0644\u06CC\u0633\u062A \u0622\u06CC\u200C\u067E\u06CC");
        if (sections.indexOf("cfConnections") !== -1) parts.push(r.result.cfConnectionsImported + " \u0627\u062A\u0635\u0627\u0644 API");
        showToast(parts.join("\u060C ") + " \u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0634\u062F");
        input.value = "";
        loadData();
      } else {
        showToast(translateApiError(r.result, "\u0628\u0627\u0632\u06CC\u0627\u0628\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
      }
    }).catch(function() {
      showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
    });
  };
  reader.onerror = function() {
    showToast("\u062E\u0648\u0627\u0646\u062F\u0646 \u0641\u0627\u06CC\u0644 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F", "error");
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
  document.getElementById("editorTitle").textContent = "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0633\u0627\u0628\u0633\u06A9\u0631\u06CC\u067E\u0634\u0646 (" + sourceName + ")";
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
      if (!r.result.unchanged) showToast("\u0622\u062F\u0631\u0633 \u0633\u0627\u0628\u0633\u06A9\u0631\u06CC\u067E\u0634\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F");
      input.value = r.result.slug;
      loadData();
    } else {
      showToast(translateApiError(r.result, "\u062A\u063A\u06CC\u06CC\u0631 \u0644\u06CC\u0646\u06A9 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
    }
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
  });
}
function refreshConfigEditor() {
  if (!editorSourceId) return Promise.resolve();
  return fetch("/api/sources/" + editorSourceId + "/configs").then(function(res) {
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
    renderSourceDisplaySettings(data.source || {});
    if (parts.length === 0) {
      container.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm border border-dashed border-gray-700 rounded-xl">این منبع هنوز هیچ بخشی ندارد.</div>';
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
    }
    renderManualAddCard(lists, parts);
  }).catch(function() {
    showToast("خطا در دریافت کانفیگ‌ها", "error");
  });
}
function cfConnectionOptionsHtml(selectedId) {
  return editorCfConnectionsCache.map(function(c) {
    var sel = c.id === selectedId ? " selected" : "";
    return '<option value="' + c.id + '"' + sel + '>' + escapeHtml(c.accountName || c.label) + " (" + escapeHtml(c.label) + ")</option>";
  }).join("");
}
function renderSourceDisplaySettings(source) {
  var wrap = document.getElementById("editorDisplaySettingsContainer");
  var emojiChecked = source.emojiEnabled !== false ? " checked" : "";
  var pctChecked = source.usagePercentEnabled ? " checked" : "";
  var connOptions = '<option value="">-- انتخاب اتصال API --</option>' + cfConnectionOptionsHtml(source.usagePercentCfConnectionId);
  var noConnHint = editorCfConnectionsCache.length === 0 ? '<p class="text-[11px] text-orange-400 mt-1">ابتدا از بخش «اتصال به API کلودفلر» یک اکانت اضافه کنید.</p>' : "";
  wrap.innerHTML =
    '<details class="bg-gray-900/50 border border-gray-800 rounded-xl"><summary class="cursor-pointer select-none px-4 py-3 text-sm text-gray-300 font-bold">تنظیمات نمایش نام کانفیگ‌ها</summary><div class="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">' +
    '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="srcDisplayEmoji" class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"' + emojiChecked + '><span class="text-xs text-gray-300">افزودن ایموجی قبل از نام کانفیگ‌ها</span></label>' +
    '<div><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="srcDisplayPct" class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"' + pctChecked + '><span class="text-xs text-gray-300">نمایش درصد مصرف ورکر جلوی نام (فقط کانفیگ‌های ورکر)</span></label><p class="text-[10px] text-gray-600 mt-1 pr-6">فقط برای کانفیگ‌های VLESS/Trojan/Shadowsocks کار می‌کند؛ کانفیگ‌های VMess به‌دلیل ساختار base64 پشتیبانی نمی‌شوند.</p>' +
    '<div class="mt-2 grid grid-cols-2 gap-2" id="srcDisplayPctTarget" style="' + (source.usagePercentEnabled ? "" : "display:none") + '">' +
    '<select class="bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]" id="srcDisplayPctConn">' + connOptions + '</select>' +
    '<select class="bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-[11px]" dir="ltr" id="srcDisplayPctScript"><option value="">-- ابتدا اتصال را انتخاب کنید --</option></select>' +
    '</div>' + noConnHint + '</div>' +
    '<button class="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 py-2 rounded-lg text-xs font-bold transition" onclick="saveSourceDisplaySettings()">ذخیره تنظیمات نمایش</button>' +
    '</div></details>';
  var pctCheckbox = document.getElementById("srcDisplayPct");
  pctCheckbox.addEventListener("change", function() {
    document.getElementById("srcDisplayPctTarget").style.display = pctCheckbox.checked ? "" : "none";
  });
  var connSelect = document.getElementById("srcDisplayPctConn");
  var scriptSelect = document.getElementById("srcDisplayPctScript");
  function loadScriptsForSelectedConnection(preselect) {
    var connId = connSelect.value;
    scriptSelect.innerHTML = '<option value="">-- در حال دریافت... --</option>';
    if (!connId) {
      scriptSelect.innerHTML = '<option value="">-- ابتدا اتصال را انتخاب کنید --</option>';
      return;
    }
    fetch("/api/cf-connections/" + connId + "/scripts").then(function(res) {
      return res.json();
    }).then(function(data) {
      if (!data.success || !data.scripts || data.scripts.length === 0) {
        scriptSelect.innerHTML = '<option value="">-- ورکری یافت نشد --</option>';
        return;
      }
      scriptSelect.innerHTML = data.scripts.map(function(s) {
        var sel = s.name === preselect ? " selected" : "";
        return '<option value="' + escapeHtml(s.name) + '"' + sel + '>' + escapeHtml(s.name) + "</option>";
      }).join("");
    }).catch(function() {
      scriptSelect.innerHTML = '<option value="">-- خطا در دریافت --</option>';
    });
  }
  connSelect.addEventListener("change", function() {
    loadScriptsForSelectedConnection(null);
  });
  if (source.usagePercentCfConnectionId) loadScriptsForSelectedConnection(source.usagePercentScriptName);
}
function saveSourceDisplaySettings() {
  if (!editorSourceId) return;
  var emojiEnabled = document.getElementById("srcDisplayEmoji").checked;
  var usagePercentEnabled = document.getElementById("srcDisplayPct").checked;
  var payload = { emojiEnabled, usagePercentEnabled };
  if (usagePercentEnabled) {
    var connId = document.getElementById("srcDisplayPctConn").value;
    var scriptName = document.getElementById("srcDisplayPctScript").value;
    if (!connId || !scriptName) {
      showToast("یک اتصال API و یک ورکر انتخاب کنید", "error");
      return;
    }
    payload.usagePercentCfConnectionId = connId;
    payload.usagePercentScriptName = scriptName;
  }
  jsonFetch("/api/sources/" + editorSourceId + "/display-settings", { method: "PUT", body: JSON.stringify(payload) }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast("تنظیمات نمایش ذخیره شد");
      loadData();
    } else showToast(translateApiError(r.result, "ذخیره ناموفق بود"), "error");
  }).catch(function() {
    showToast("خطای شبکه", "error");
  });
}
function partTitle(part, idx, allParts) {
  if (part.kind === "manual") return "\u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062F\u0633\u062A\u06CC";
  var urlPosition = 0;
  for (var i = 0; i <= idx; i++) {
    if (allParts[i] && allParts[i].kind !== "manual") urlPosition++;
  }
  return "\u0645\u0646\u0628\u0639 " + urlPosition;
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
  var nameHtml = isDeleted ? '<span class="flex-1 min-w-0 truncate text-xs text-gray-500 line-through">' + escapeHtml(effectiveName) + "</span>" : '<span class="cfg-name-wrap flex items-baseline gap-1 min-w-0 flex-1 basis-32" data-part="' + part.id + '" data-id="' + c.configId + '" data-default-name="' + escapeHtml(c.name || "AutoSub") + '" data-saved-custom="' + escapeHtml(c.customName || "") + '" data-host="' + escapeHtml(c.host || "") + '"><span class="cfg-name-display flex-1 min-w-0 truncate text-xs text-gray-300 cursor-text hover:text-white transition" title="\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631 \u0646\u0627\u0645 \u0627\u06CC\u0646 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F">' + escapeHtml(effectiveName) + '</span><span class="max-w-[45%] min-w-0 shrink truncate text-[11px] text-gray-600" title="' + escapeHtml(c.host || "") + '">(' + escapeHtml(c.host || "") + ")</span></span>";
  var deleteBtn = isDeleted ? '<button class="undo-delete-config-btn text-emerald-400 hover:text-emerald-300 px-1" title="\u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u06CC" data-part="' + part.id + '" data-id="' + c.configId + '">' + UNDO_ICON + "</button>" : '<button class="delete-config-btn text-red-400 hover:text-red-300 px-1" title="\u062D\u0630\u0641" data-part="' + part.id + '" data-id="' + c.configId + '">' + TRASH_ICON + "</button>";
  var checkboxHtml = isDeleted ? '<span class="h-4 w-4 shrink-0 inline-block"></span>' : '<input type="checkbox" class="config-include-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500 shrink-0" title="\u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u062F\u0631 \u062E\u0631\u0648\u062C\u06CC \u0646\u0647\u0627\u06CC\u06CC" data-part="' + part.id + '" data-id="' + c.configId + '"' + (included ? " checked" : "") + ">";
  var dragHandle = isDeleted ? '<span class="w-4 h-4 shrink-0 text-gray-700">' + DRAG_HANDLE_ICON + "</span>" : '<span class="drag-handle-btn text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0" style="touch-action:none" title="\u0628\u0631\u0627\u06CC \u062C\u0627\u0628\u0647\u200C\u062C\u0627\u06CC\u06CC \u0646\u06AF\u0647 \u062F\u0627\u0631\u06CC\u062F \u0648 \u0628\u06A9\u0634\u06CC\u062F" data-part="' + part.id + '" data-id="' + c.configId + '">' + DRAG_HANDLE_ICON + "</span>";
  return '<div class="' + rowClass + '" data-config-id="' + c.configId + '" dir="ltr"><div class="flex items-center flex-wrap gap-2">' + dragHandle + checkboxHtml + nameHtml + '<div class="flex items-center gap-1 shrink-0">' + deleteBtn + '</div><div class="flex items-center gap-1.5 shrink-0"><span class="text-[10px] font-bold px-2 py-0.5 rounded ' + badgeColor + '">' + String(c.protocol || "?").toUpperCase() + "</span>" + tlsBadge + portBadge + "</div></div></div>";
}
function renderPartCard(part, lists, idx, allParts) {
  var fetchBadge = "";
  if (part.kind === "url") {
    if (part.lastFetchOk === false) {
      fetchBadge = '<span title="\u0622\u062E\u0631\u06CC\u0646 \u0648\u0627\u06A9\u0634\u06CC \u0646\u0627\u0645\u0648\u0641\u0642 - \u0646\u0633\u062E\u0647\u200C\u06CC \u0642\u0628\u0644\u06CC \u062D\u0641\u0638 \u0634\u062F" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg></span>';
    } else if (part.lastFetchOk === true) {
      fetchBadge = '<span title="\u0622\u062E\u0631\u06CC\u0646 \u0648\u0627\u06A9\u0634\u06CC \u0645\u0648\u0641\u0642" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></span>';
    }
  }
  var deletePartBtn = '<button class="delete-part-btn text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition shrink-0" title="\u062D\u0630\u0641 \u0627\u06CC\u0646 \u0628\u062E\u0634" data-part="' + part.id + '">' + TRASH_ICON + "</button>";
  var titleWithBadge = '<span class="flex items-center gap-1.5 min-w-0"><span class="truncate">' + partTitle(part, idx, allParts) + "</span>" + fetchBadge + "</span>";
  var urlBox = part.kind === "url" ? '<div class="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 mb-3 text-[11px] text-gray-500 truncate" dir="ltr">' + escapeHtml(part.url || "") + "</div>" : "";
  var orderedConfigs = orderedConfigsForPart(part);
  var configRows = orderedConfigs.map(function(c) {
    return renderConfigRow(c, part);
  }).join("") || '<div class="text-center text-gray-600 text-xs py-3">\u0647\u0646\u0648\u0632 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u06CC \u062F\u0631 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0646\u06CC\u0633\u062A.</div>';
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
  var selectAllRow = visibleConfigs.length > 0 ? '<div class="flex items-center gap-2 mb-2" dir="ltr"><input type="checkbox" class="select-all-cb h-4 w-4 rounded border-gray-700 bg-gray-900 text-emerald-500" data-part="' + part.id + '"' + (allIncluded ? " checked" : "") + (!allIncluded && !noneIncluded ? ' data-indeterminate="1"' : "") + '><label class="text-[11px] text-gray-500">\u0627\u0646\u062A\u062E\u0627\u0628/\u0644\u063A\u0648</label></div>' : "";
  var rangeOnlyBlock = '<div><div class="flex items-center gap-2"><input type="checkbox" id="matchRanges-' + part.id + '"' + (part.matchKnownRangesOnly !== false ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="matchRanges-' + part.id + '" class="text-xs text-gray-400">\u0641\u0642\u0637 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646\u06CC \u0647\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0644\u0648\u062F\u0641\u0644\u0631</label></div><p class="text-[11px] text-gray-500 mt-1 pr-6">\u0631\u0648\u0634\u0646: \u0641\u0642\u0637 \u0647\u0627\u0633\u062A\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u0647\u0645\u06CC\u0646 \u0627\u0644\u0627\u0646 \u06CC\u06A9 \u0622\u06CC\u200C\u067E\u06CC \u06A9\u0644\u0648\u062F\u0641\u0644\u0631 \u0647\u0633\u062A\u0646\u062F \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u062E\u0627\u0645\u0648\u0634: \u0647\u0627\u0633\u062A \u0647\u0645\u0647\u200C\u06CC \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0628\u062E\u0634 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0645\u06CC\u200C\u0634\u0648\u062F.</p></div>';
  var autoRefreshBlock = part.kind === "url" ? '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-2.5 space-y-2"><div class="flex items-center gap-2"><input type="checkbox" id="autoRefresh-' + part.id + '"' + (part.autoRefreshEnabled !== false ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="autoRefresh-' + part.id + '" class="text-xs text-gray-400">\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9</label></div><div class="flex items-center gap-2"><span class="text-[11px] text-gray-500 shrink-0">\u0647\u0631</span><input type="number" id="autoRefreshMinutes-' + part.id + '" min="15" value="' + (part.autoRefreshMinutes || 1440) + '" class="w-24 bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs"><span class="text-[11px] text-gray-500 shrink-0">\u062F\u0642\u06CC\u0642\u0647</span></div></div>' : "";
  var nameModeBlock = '<div><label class="flex items-center gap-2 cursor-pointer mb-2"><input type="checkbox" id="nameModeOriginal-' + part.id + '"' + (part.nameMode === "original" ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><span class="text-[11px] text-gray-300">به‌جای نام‌گذاری خودکار توسط پنل، نام اصلی کانفیگ‌ها حفظ شود</span></label><div id="autoNumberWrap-' + part.id + '"' + (part.nameMode === "original" ? ' class="hidden"' : "") + '><label class="flex items-center gap-2 cursor-pointer pr-1"><input type="checkbox" id="autoNumberEnabled-' + part.id + '"' + (part.autoNumberEnabled !== false ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600"><span class="text-[11px] text-gray-500">شماره‌گذاری خودکار</span></label></div></div>';
  var protocolChecked = function(proto) {
    return (part.uploadBoostProtocols || ["vless", "trojan"]).indexOf(proto) !== -1;
  };
  var uploadBoostBlock = '<div class="bg-gray-950/60 border border-gray-800 rounded-lg p-3 space-y-3"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><input type="checkbox" id="uploadBoost-' + part.id + '"' + (part.uploadBoostEnabled ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-purple-600"><label for="uploadBoost-' + part.id + '" class="text-xs text-gray-300 font-bold">رفع محدودیت آپلود / دور زدن فیلتر دامنه</label></div><span class="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full shrink-0">فقط کانفیگ‌های TLS</span></div><p class="text-[11px] text-gray-500 leading-relaxed">با روش پترنیها، اثر انگشت TLS و تنظیمات فرگمنت را روی کانفیگ‌های TLS تغییر می‌دهد تا شناسایی و محدودسازی توسط فیلترینگ سخت‌تر شود. کلاینت پیشنهادی سازگار با ابن روش : <a href="https://github.com/patterniha/PattN/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattN</a>/<a href="https://github.com/patterniha/PattNG/releases" target="_blank" rel="noopener" class="text-purple-400 hover:text-purple-300 underline">PattNG</a></p><div><label class="block text-[10px] mb-1 text-gray-500">این تنظیمات روی کدام پروتکل‌ها اعمال شود؟</label><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-1.5 cursor-pointer"><input type="checkbox" id="uploadBoostProtoVless-' + part.id + '"' + (protocolChecked("vless") ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600"><span class="text-[11px] text-gray-300">VLESS</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-1.5 cursor-pointer"><input type="checkbox" id="uploadBoostProtoTrojan-' + part.id + '"' + (protocolChecked("trojan") ? " checked" : "") + ' class="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600"><span class="text-[11px] text-gray-300">Trojan</span></label></div></div><details class="bg-gray-900/50 border border-gray-800 rounded-lg"><summary class="p-2 text-[11px] text-gray-400 cursor-pointer hover:text-gray-300">تنظیمات پیشرفته (هر پارامتر جدا قابل تنظیم است)</summary><div class="p-3 space-y-3">' +
    uploadBoostFieldHtml("fp", part.id, part.uploadBoostFingerprint, "اثر انگشت TLS (fp)") +
    uploadBoostFieldHtml("cs", part.id, part.uploadBoostCipherSuites, "لیست رمزنگارها (cs) - فقط برای security=tls") +
    uploadBoostFieldHtml("fm", part.id, part.uploadBoostFragmentMask, "تنظیمات فرگمنت (fm) - فقط برای security=tls") +
    '<button type="button" class="reset-upload-boost-btn flex items-center justify-center gap-1.5 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-700 transition" data-part="' + part.id + '">' + UNDO_ICON + '<span>بازنشانی به پیش‌فرض</span></button></div></details></div>';
  return '<div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4" data-part-card="' + part.id + '"><div class="flex items-center justify-between gap-2 mb-2"><h3 class="text-sm font-bold text-white truncate min-w-0">' + titleWithBadge + '</h3><div class="flex items-center gap-1.5 shrink-0">' + deletePartBtn + "</div></div>" + urlBox + '<div class="space-y-3 mb-4 pb-4 border-b border-gray-800"><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="cat-' + part.id + '" value="cloudflare" id="catCf-' + part.id + '"' + (part.category !== "independent" ? " checked" : "") + ' class="text-indigo-600"><span class="text-xs text-gray-300">کانفیگ ورکر</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="cat-' + part.id + '" value="independent" id="catInd-' + part.id + '"' + (part.category === "independent" ? " checked" : "") + ' class="text-indigo-600"><span class="text-xs text-gray-300">کانفیگ مستقل</span></label></div><div class="flex items-center gap-2"><input type="checkbox" id="useCleanIp-' + part.id + '"' + (part.useCleanIp ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600"><label for="useCleanIp-' + part.id + '" class="text-xs text-gray-400">استفاده از آی‌پی تمیز جایگزین</label></div><div id="rangeOnlyWrap-' + part.id + '"' + (part.category === "independent" ? "" : ' class="hidden"') + ">" + rangeOnlyBlock + '</div><div><label class="block text-[11px] mb-1 text-gray-500">لیست آی‌پی تمیز</label><select id="listId-' + part.id + '" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs">' + cleanIpListOptionsHtml(lists, part.cleanIpListId) + '</select></div>' + nameModeBlock + '<div><label class="block text-[11px] mb-1 text-gray-500">نحوه‌ی توزیع آی‌پی</label><div class="grid grid-cols-2 gap-2"><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="dist-' + part.id + '" value="multiply" id="distMul-' + part.id + '"' + (part.distribution !== "random" ? " checked" : "") + ' class="text-indigo-600"><span class="text-[11px] text-gray-300">تکثیر</span></label><label class="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 cursor-pointer"><input type="radio" name="dist-' + part.id + '" value="random" id="distRand-' + part.id + '"' + (part.distribution === "random" ? " checked" : "") + ' class="text-indigo-600"><span class="text-[11px] text-gray-300">تصادفی</span></label></div></div><div><label class="block text-[11px] mb-1 text-gray-500">پورت‌های مورد نیاز (خالی = همه)</label><div id="ports-' + part.id + '" class="grid grid-cols-4 gap-2"></div></div><div><div class="flex items-center gap-2"><input type="checkbox" id="oneConfigPerPort-' + part.id + '"' + (part.oneConfigPerPort ? " checked" : "") + ' class="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500"><label for="oneConfigPerPort-' + part.id + '" class="text-xs text-gray-400">یک کانفیگ برای هر مقصد</label></div><p class="text-[11px] text-gray-500 mt-1 pr-6">از بین کانفیگ‌هایی که سرور و پورت مقصدشان یکسان است، هر بار فقط یکی به‌صورت تصادفی در خروجی نهایی استفاده می‌شود.</p></div>' + autoRefreshBlock + uploadBoostBlock + (part.truncated ? '<div class="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-2 rounded-lg text-[11px]">⚠️ این بخش به سقف تعداد قالب‌ها رسیده.</div>' : "") + '<button class="save-part-btn w-full bg-gray-800 hover:bg-gray-700 py-2 rounded-lg text-xs font-bold transition border border-gray-700" data-part="' + part.id + '">ذخیره تنظیمات این بخش</button></div>' + selectAllRow + '<div class="space-y-2 mb-3" id="configRows-' + part.id + '">' + configRows + '</div><div class="flex gap-2"><input type="text" id="newConfig-' + part.id + '" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="vless://..."><button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="' + part.id + '">افزودن</button></div></div>';
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
  card.innerHTML = '<p class="text-xs text-gray-500 mb-2">\u0627\u06CC\u0646 \u0645\u0646\u0628\u0639 \u0647\u0646\u0648\u0632 \u0628\u062E\u0634 \xAB\u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062F\u0633\u062A\u06CC\xBB \u0646\u062F\u0627\u0631\u062F.</p><div class="flex gap-2"><input type="text" id="newConfig-manual-new" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-mono" dir="ltr" placeholder="vless://..."><button class="add-config-btn bg-purple-600 hover:bg-purple-500 px-4 rounded-lg text-sm font-bold text-white" data-part="manual-new">\u0627\u0641\u0632\u0648\u062F\u0646</button></div>';
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
      showToast("\u062D\u062F\u0627\u0642\u0644 \u0641\u0627\u0635\u0644\u0647\u200C\u06CC \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06F1\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u0627\u0633\u062A", "error");
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
      showToast(translateApiError(batchResult.result, "\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
      return Promise.reject(new Error("batch-failed"));
    }
    if (batchResult.result.capped) showToast("\u0628\u0631\u062E\u06CC \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0628\u0647 \u0633\u0642\u0641 \u062A\u0639\u062F\u0627\u062F \u0628\u0644\u0627\u06A9 \u0631\u0633\u06CC\u062F\u0646\u062F \u0648 \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F\u0646\u062F", "error");
    return jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }).then(function(r) {
    if (!r) return;
    if (r.ok && r.result.success) {
      showToast("\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F");
      clearPendingConfigStateForPart(partId);
    } else {
      showToast(translateApiError(r.result, "\u0630\u062E\u06CC\u0631\u0647 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
    }
    loadData();
    refreshConfigEditor();
  }).catch(function(e) {
    if (e && e.message === "batch-failed") return;
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
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
  nameSpan.title = "\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631 \u0646\u0627\u0645 \u0627\u06CC\u0646 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F";
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
    showToast("\u06CC\u06A9 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F", "error");
    return;
  }
  jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId + "/configs", { method: "POST", body: JSON.stringify({ raw }) }).then(function(r) {
    if (r.ok && r.result.success) {
      input.value = "";
      showToast("\u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0636\u0627\u0641\u0647 \u0634\u062F");
      loadData();
      refreshConfigEditor();
    } else showToast(translateApiError(r.result, "\u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
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
  if (!confirm("\u0627\u06CC\u0646 \u0628\u062E\u0634 \u0628\u0647\u200C\u0637\u0648\u0631 \u06A9\u0627\u0645\u0644 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F \u0627\u06CC\u0646 \u06A9\u0627\u0631 \u0642\u0627\u0628\u0644 \u0628\u0627\u0632\u06AF\u0634\u062A \u0646\u06CC\u0633\u062A.")) return;
  jsonFetch("/api/sources/" + editorSourceId + "/parts/" + partId, { method: "DELETE" }).then(function(r) {
    if (r.ok && r.result.success) {
      showToast("\u0628\u062E\u0634 \u062D\u0630\u0641 \u0634\u062F");
      clearPendingConfigStateForPart(partId);
      loadData();
      refreshConfigEditor();
    } else {
      showToast(translateApiError(r.result, "\u062D\u0630\u0641 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F"), "error");
    }
  }).catch(function() {
    showToast("\u062E\u0637\u0627\u06CC \u0634\u0628\u06A9\u0647", "error");
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
