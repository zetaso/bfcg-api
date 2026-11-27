import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  jwtClaims,
  refreshTokens,
  setSessionCookies,
  signOutAtSupabase,
  touchSession,
} from "../auth/session.js";

const EXPIRED_MESSAGES = {
  idle: "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.",
  absolute: "Tu sesión alcanzó su duración máxima. Vuelve a iniciar sesión.",
};

/**
 * Admin guard. Reads the session from httpOnly cookies, refreshes the Supabase access token when it
 * has expired, and enforces the idle / absolute limits through admin_session_touch().
 * On success sets req.db (Supabase client acting as the admin), req.user, req.session and req.accessToken.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    let accessToken = req.cookies?.[ACCESS_COOKIE];
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    const deny = (status, error, extra = {}) => {
      clearSessionCookies(res);
      return res.status(status).json({ error, ...extra });
    };

    if (!accessToken && !refreshToken) return deny(401, "Sesión requerida.");

    let checked = accessToken ? await touchSession(accessToken) : { jwtError: true };
    let refreshed = null;

    // access token missing or expired (they last ~1h): trade the refresh token for a new pair
    if (checked.jwtError) {
      refreshed = refreshToken ? await refreshTokens(refreshToken) : null;
      if (!refreshed) return deny(401, "Sesión inválida o expirada.");
      accessToken = refreshed.access_token;
      checked = await touchSession(accessToken);
      if (checked.jwtError) return deny(401, "Sesión inválida o expirada.");
    }

    const { db, result } = checked;

    if (result?.status === "not_admin") {
      await signOutAtSupabase(accessToken);
      return deny(403, "No tienes permisos de administrador.");
    }
    if (result?.status !== "ok") {
      await signOutAtSupabase(accessToken);
      const reason = result?.reason;
      return deny(401, EXPIRED_MESSAGES[reason] ?? "Sesión inválida o expirada.", { reason });
    }

    if (refreshed) setSessionCookies(res, refreshed, result.expires_at);

    const claims = jwtClaims(accessToken);
    req.user = { id: claims.sub, email: claims.email };
    req.session = result;
    req.accessToken = accessToken;
    req.db = db;
    next();
  } catch (err) {
    next(err);
  }
};
