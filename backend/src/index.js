import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRouter from "./routes/auth.js";
import constantsRouter from "./routes/constants.js";
import monthsRouter from "./routes/months.js";
import assetsRouter from "./routes/assets.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// Everything past this point requires a valid login token.
app.use("/api/constants", requireAuth, constantsRouter);
app.use("/api/months", requireAuth, monthsRouter);
app.use("/api/assets", requireAuth, assetsRouter);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/piggybank";

if (!process.env.JWT_SECRET || !process.env.APP_PASSWORD_HASH) {
  console.error("Missing JWT_SECRET or APP_PASSWORD_HASH in .env — set both before starting.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`piggybank backend listening on :${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  });
