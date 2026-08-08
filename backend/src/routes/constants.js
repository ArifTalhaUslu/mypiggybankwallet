import { Router } from "express";
import Constant from "../models/Constant.js";

const router = Router();

router.get("/", async (req, res) => {
  const constants = await Constant.find().sort({ name: 1 });
  res.json(constants);
});

router.post("/", async (req, res) => {
  const { name, current } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const exists = await Constant.findOne({ name });
  if (exists) return res.status(409).json({ error: "constant already exists" });
  const constant = await Constant.create({ name, current: current ?? 0, history: [] });
  res.status(201).json(constant);
});

router.patch("/:id/name", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const constant = await Constant.findById(req.params.id);
  if (!constant) return res.status(404).json({ error: "not found" });
  constant.name = name.trim();
  await constant.save();
  res.json(constant);
});

// Updates the live amount and records/overwrites a history snapshot for the current year.
router.patch("/:id/amount", async (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== "number") return res.status(400).json({ error: "amount must be a number" });
  const constant = await Constant.findById(req.params.id);
  if (!constant) return res.status(404).json({ error: "not found" });

  const year = new Date().getFullYear();
  const entry = constant.history.find((h) => h.year === year);
  if (entry) entry.amount = amount;
  else constant.history.push({ year, amount });

  constant.current = amount;
  await constant.save();
  res.json(constant);
});

// Sets (or overwrites) the amount for an arbitrary year — for backfilling past years,
// not just the live "current" value.
router.put("/:id/history/:year", async (req, res) => {
  const { amount } = req.body;
  const year = Number(req.params.year);
  if (typeof amount !== "number" || Number.isNaN(year)) {
    return res.status(400).json({ error: "amount (number) and a valid year are required" });
  }
  const constant = await Constant.findById(req.params.id);
  if (!constant) return res.status(404).json({ error: "not found" });

  const entry = constant.history.find((h) => h.year === year);
  if (entry) entry.amount = amount;
  else constant.history.push({ year, amount });

  await constant.save();
  res.json(constant);
});

router.delete("/:id/history/:year", async (req, res) => {
  const year = Number(req.params.year);
  const constant = await Constant.findById(req.params.id);
  if (!constant) return res.status(404).json({ error: "not found" });
  constant.history = constant.history.filter((h) => h.year !== year);
  await constant.save();
  res.json(constant);
});

router.delete("/:id", async (req, res) => {
  await Constant.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
