import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/login", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Şifre gerekli" });

  const ok = await bcrypt.compare(password, process.env.APP_PASSWORD_HASH || "");
  if (!ok) return res.status(401).json({ error: "Şifre yanlış" });

  const token = jwt.sign({ app: "piggybank" }, process.env.JWT_SECRET, { expiresIn: "90d" });
  res.json({ token });
});

export default router;
