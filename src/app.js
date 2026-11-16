import express from "express";
import logger from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import apiRoutes from "./routes/apiRoutes.js";

dotenv.config();

const app = express();

app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/v1", apiRoutes);

app.get("/", (req, res) => {
  res.json({ status: "API is running cleanly with pnpm!" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
