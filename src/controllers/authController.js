import { createAuthClient } from "../config/supabase.js";
import {
  clearSessionCookies,
  setSessionCookies,
  signOutAtSupabase,
  touchSession,
} from "../auth/session.js";

const sessionInfo = (session) => ({
  idle_timeout_seconds: session.idle_timeout_seconds,
  expires_at: session.expires_at,
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      // same answer for unknown email and wrong password
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const { result, jwtError } = await touchSession(data.session.access_token);
    if (jwtError || result?.status !== "ok") {
      await signOutAtSupabase(data.session.access_token);
      const notAdmin = result?.status === "not_admin";
      return res
        .status(notAdmin ? 403 : 401)
        .json({ error: notAdmin ? "Esta cuenta no tiene permisos de administrador." : "No se pudo iniciar sesión." });
    }

    setSessionCookies(res, data.session, result.expires_at);
    res.json({ user: { email: data.session.user.email }, session: sessionInfo(result) });
  } catch (err) {
    next(err);
  }
};

// The routes below run behind requireAdmin.

export const me = (req, res) => {
  res.json({ user: { email: req.user.email }, session: sessionInfo(req.session) });
};

export const logout = async (req, res, next) => {
  try {
    await req.db.rpc("admin_session_revoke", { others: false });
    await signOutAtSupabase(req.accessToken, "local");
    clearSessionCookies(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const logoutOthers = async (req, res, next) => {
  try {
    await req.db.rpc("admin_session_revoke", { others: true });
    await signOutAtSupabase(req.accessToken, "others");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
