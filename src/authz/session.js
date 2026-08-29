import { SESSION_TTL_SECONDS } from "../constants.js";

export async function createSession(env) {
  const token = crypto.randomUUID();
  await env.SUB_DB.put(`session_${token}`, "1", { expirationTtl: SESSION_TTL_SECONDS });
  return token;
}

export async function isValidSession(token, env) {
  if (!token) return false;
  const record = await env.SUB_DB.get(`session_${token}`);
  return record !== null;
}

export async function destroySession(token, env) {
  if (!token) return;
  try {
    await env.SUB_DB.delete(`session_${token}`);
  } catch (e) {
    /* noop */
  }
}
