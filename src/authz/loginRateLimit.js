import {
  LOGIN_COOLDOWN_STEP_SECONDS,
  LOGIN_COOLDOWN_CAP_SECONDS,
  LOGIN_FAIL_RECORD_TTL_SECONDS
} from "../constants.js";

export async function checkLoginCooldown(env, ip) {
  try {
    const raw = await env.SUB_DB.get(`login_fail_${ip}`);
    if (!raw) return { blocked: false };
    const data = JSON.parse(raw);
    const fails = data.fails || 0;
    const lastFail = data.lastFail || 0;
    const cooldown = Math.min(fails * LOGIN_COOLDOWN_STEP_SECONDS, LOGIN_COOLDOWN_CAP_SECONDS);
    const elapsedSeconds = (Date.now() - lastFail) / 1000;
    if (elapsedSeconds < cooldown) {
      return { blocked: true, retryAfterSeconds: Math.ceil(cooldown - elapsedSeconds) };
    }
    return { blocked: false };
  } catch (e) {
    return { blocked: false };
  }
}

export async function recordFailedLogin(env, ip) {
  try {
    const raw = await env.SUB_DB.get(`login_fail_${ip}`);
    const fails = (raw ? JSON.parse(raw).fails || 0 : 0) + 1;
    await env.SUB_DB.put(`login_fail_${ip}`, JSON.stringify({ fails, lastFail: Date.now() }), {
      expirationTtl: LOGIN_FAIL_RECORD_TTL_SECONDS
    });
  } catch (e) {
    /* noop */
  }
}

export async function clearFailedLogin(env, ip) {
  try {
    await env.SUB_DB.delete(`login_fail_${ip}`);
  } catch (e) {
    /* noop */
  }
}
