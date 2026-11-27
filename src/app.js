import express from "express";
import logger from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "*"
      // add frontend vercel url
    ],
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
