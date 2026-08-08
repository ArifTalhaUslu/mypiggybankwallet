import jwt from "jsonwebtoken";

// Single-user app: one shared password (bcrypt hash in .env), a JWT proves you knew
// it. No accounts, no per-user rows — just a gate in front of everything else.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Giriş gerekli" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Oturum geçersiz, yeniden giriş yap" });
  }
}
