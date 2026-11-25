import { createAuthClient, createUserClient } from "../config/supabase.js";

const sessionPayload = (session) => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  user: { id: session.user.id, email: session.user.email },
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const { data: isAdmin, error: adminError } = await createUserClient(data.session.access_token).rpc("is_admin");
    if (adminError) throw adminError;
    if (!isAdmin) {
      return res.status(403).json({ error: "Esta cuenta no tiene permisos de administrador." });
    }

    res.json(sessionPayload(data.session));
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body ?? {};
    if (!refresh_token) {
      return res.status(400).json({ error: "Falta refresh_token." });
    }

    const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token });
    if (error || !data?.session) {
      return res.status(401).json({ error: "La sesión expiró. Vuelve a iniciar sesión." });
    }

    res.json(sessionPayload(data.session));
  } catch (err) {
    next(err);
  }
};

export const me = (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
};
