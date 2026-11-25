import { supabase, createUserClient } from "../config/supabase.js";

/**
 * Verifies the Bearer token with Supabase Auth and checks the user is in public.admins.
 * On success sets req.user and req.db (a Supabase client acting as that user).
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const header = req.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Sesión requerida." });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const db = createUserClient(token);
    const { data: isAdmin, error: adminError } = await db.rpc("is_admin");
    if (adminError) throw adminError;
    if (!isAdmin) {
      return res.status(403).json({ error: "No tienes permisos de administrador." });
    }

    req.user = data.user;
    req.db = db;
    next();
  } catch (err) {
    next(err);
  }
};
