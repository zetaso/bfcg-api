import "dotenv/config";
import rateLimit from "express-rate-limit";

/** Origins allowed to call the API from a browser, e.g. "https://bfcg.cl,https://www.bfcg.cl". */
export const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * CSRF protection for cookie-authenticated routes: any state-changing request must come from one of
 * our own origins. Browsers always send Origin on such requests and pages can't forge it.
 */
export const requireTrustedOrigin = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Origen no permitido." });
  }
  next();
};

/** Slows down password guessing: 10 attempts per IP every 15 minutes (Supabase adds its own limits). */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." },
});
