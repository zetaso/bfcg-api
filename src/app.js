import express from "express";
import logger from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";
import { allowedOrigins } from "./middleware/security.js";

dotenv.config();

const app = express();

// behind a hosting proxy (Railway, Render…) set TRUST_PROXY=1 so rate limiting sees the real client IP
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(
  cors({
    origin: allowedOrigins, // credentials (cookies) require an explicit list, never "*"
    credentials: true,
  })
);

app.use("/api/v1", apiRoutes);

app.get("/", (req, res) => {
  res.json({ status: "API is running cleanly with pnpm!" });
});

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "La imagen supera el tamaño máximo de 20 MB." });
  }
  // errors raised on purpose carry a status and a user-facing message
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err.stack ?? err);
  res.status(500).json({ error: "Ocurrió un error inesperado." });
});

export default app;
