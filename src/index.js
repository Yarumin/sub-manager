import { PANEL_PATH, SESSION_TTL_SECONDS } from "./constants.js";
import { parseCookies } from "./utils/cookies.js";
import { createSession, isValidSession, destroySession } from "./authz/session.js";
import { verifyAdminPassword } from "./authz/password.js";
import { checkLoginCooldown, recordFailedLogin, clearFailedLogin } from "./authz/loginRateLimit.js";
import { renderHTML } from "./panel/renderHtml.js";
import { getLoginHTML } from "./panel/loginPage.js";
import { getDashboardHTML } from "./panel/dashboardShell.js";
import { handleApi } from "./api/router.js";
import { handleServeSubscription } from "./publicApi/serveSubscription.js";
import { processAllSubscriptions } from "./sync/syncEngine.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (!env.SUB_DB) return new Response("Error: KV Database (SUB_DB) is not bound to this Worker.", { status: 500 });

      const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "admin123";

      if (path.startsWith("/sub/")) {
        const token = path.split("/")[2];
        return await handleServeSubscription(token, env, ctx);
      }

      const cookies = parseCookies(request.headers.get("Cookie") || "");
      const isAuth = await isValidSession(cookies.session, env);

      if (path === PANEL_PATH + "/login" && request.method === "POST") {
        const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
        const cooldown = await checkLoginCooldown(env, clientIp);
        if (cooldown.blocked) return renderHTML(getLoginHTML(false, `Please try again in ${cooldown.retryAfterSeconds} seconds.`), 429);

        let password = "";
        try {
          const formData = await request.formData();
          password = formData.get("password") || "";
        } catch (e) {
          return renderHTML(getLoginHTML(true), 401);
        }

        const passwordMatches = await verifyAdminPassword(password, ADMIN_PASSWORD);
        if (passwordMatches) {
          await clearFailedLogin(env, clientIp);
          const token = await createSession(env);
          return new Response(null, {
            status: 302,
            headers: {
              Location: PANEL_PATH,
              "Set-Cookie": `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
            }
          });
        }
        await recordFailedLogin(env, clientIp);
        return renderHTML(getLoginHTML(true), 401);
      }

      if (path === PANEL_PATH + "/logout") {
        ctx.waitUntil(destroySession(cookies.session, env));
        return new Response(null, {
          status: 302,
          headers: { Location: PANEL_PATH, "Set-Cookie": "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" }
        });
      }

      if (path === PANEL_PATH || path === PANEL_PATH + "/") {
        if (!isAuth) return renderHTML(getLoginHTML(false));
        return renderHTML(getDashboardHTML(url.origin));
      }

      if (path.startsWith("/api/")) {
        if (!isAuth) {
          return new Response(JSON.stringify({ success: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
          });
        }
        const parts = path.split("/").filter(Boolean);
        const apiResponse = await handleApi(parts, request, env, ctx);
        if (!apiResponse.headers.has("Cache-Control")) {
          const headers = new Headers(apiResponse.headers);
          headers.set("Cache-Control", "no-store");
          return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText, headers });
        }
        return apiResponse;
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return new Response("Internal Server Error", { status: 500 });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processAllSubscriptions(env, { mode: "auto" }));
  }
};
