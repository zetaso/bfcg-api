import { createAuthClient, createUserClient, supabase } from "../config/supabase.js";

// Tokens live only in httpOnly cookies: page JavaScript (and any injected script) can't read them.
export const ACCESS_COOKIE = "bfcg_admin_at";
export const REFRESH_COOKIE = "bfcg_admin_rt";

const cookieOptions = (expires) => ({
  httpOnly: true,
  // Secure by default (Chrome and Firefox also accept it on http://localhost); COOKIE_SECURE=false only for Safari dev
  secure: process.env.COOKIE_SECURE !== "false",
  // lax when frontend and API share a site (bfcg.cl + api.bfcg.cl, or a proxy); "none" only if they don't
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  path: "/api/v1/admin", // only sent to admin routes, never to public ones
  ...(expires ? { expires } : {}),
});

export function setSessionCookies(res, { access_token, refresh_token }, expiresAt) {
  const expires = expiresAt ? new Date(expiresAt) : undefined;
  res.cookie(ACCESS_COOKIE, access_token, cookieOptions(expires));
  res.cookie(REFRESH_COOKIE, refresh_token, cookieOptions(expires));
}

export function clearSessionCookies(res) {
  const { expires, ...opts } = cookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

/** Payload of a JWT that Supabase has already verified (we only read claims, never trust it unverified). */
export function jwtClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

const isJwtError = (error) =>
  !!error && (error.code?.startsWith("PGRST30") || /jwt/i.test(error.message ?? ""));

/** Registers / checks the session limits in the database. Returns { db, result } or { jwtError }. */
export async function touchSession(accessToken) {
  const db = createUserClient(accessToken);
  const { data, error } = await db.rpc("admin_session_touch");
  if (isJwtError(error)) return { jwtError: true };
  if (error) throw error;
  return { db, result: data };
}

export async function refreshTokens(refreshToken) {
  const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) return null;
  return data.session;
}

/** Best effort: also revoke the refresh token at Supabase so it can't mint new access tokens. */
export async function signOutAtSupabase(accessToken, scope = "local") {
  try {
    await supabase.auth.admin.signOut(accessToken, scope);
  } catch {
    /* the session is already refused by admin_session_touch, this is only cleanup */
  }
}
