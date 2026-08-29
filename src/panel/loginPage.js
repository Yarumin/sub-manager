import { PANEL_PATH } from "../constants.js";

export function getLoginHTML(showError, customMessage) {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzgxOGNmOCIvPgo8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2MwODRmYyIvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3ZGQzZmMiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMjIiIGhlaWdodD0iMjIiIHJ4PSI2IiBmaWxsPSIjMGIwZjFhIi8+CjxyZWN0IHg9IjQuMiIgeT0iNS4zIiB3aWR0aD0iMTMuNSIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiLz4KPHJlY3QgeD0iNC4yIiB5PSIxMC4yIiB3aWR0aD0iMTUuNiIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNzIiLz4KPHJlY3QgeD0iNC4yIiB5PSIxNS4xIiB3aWR0aD0iMTAuNCIgaGVpZ2h0PSIzLjYiIHJ4PSIxLjgiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNDYiLz4KPC9zdmc+Cg==">
    <title>Login | Subscription Manager Panel</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-950 text-gray-200 flex items-center justify-center h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-950 to-black">
    <div class="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-800">
        <div class="flex justify-center mb-6">
            <div class="bg-indigo-500/20 p-4 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <svg class="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        </div>
        <h1 class="text-2xl font-bold text-center mb-8 text-white">Login</h1>
        ${customMessage ? `<div class="bg-orange-500/10 border border-orange-500/50 text-orange-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">${customMessage}</div>` : showError ? `<div class="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">Incorrect password.</div>` : ""}
        <form method="POST" action="${PANEL_PATH}/login" class="space-y-6">
            <div class="relative">
                <input type="password" id="loginPassword" name="password" required dir="ltr" class="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">
                <button type="button" id="togglePasswordBtn" aria-label="Show/hide password" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                    <svg id="eyeIconShow" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    <svg id="eyeIconHide" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path></svg>
                </button>
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Sign In</button>
        </form>
    </div>
    <script>
        document.getElementById('togglePasswordBtn').addEventListener('click', function () {
            var input = document.getElementById('loginPassword');
            var showIcon = document.getElementById('eyeIconShow');
            var hideIcon = document.getElementById('eyeIconHide');
            var isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            showIcon.classList.toggle('hidden', isHidden);
            hideIcon.classList.toggle('hidden', !isHidden);
        });
    <\/script>
</body>
</html>`;
}
