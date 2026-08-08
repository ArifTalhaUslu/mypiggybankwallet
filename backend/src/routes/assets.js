import { Router } from "express";
import Assets from "../models/Assets.js";

const router = Router();

async function getSingleton() {
  let doc = await Assets.findOne();
  if (!doc) doc = await Assets.create({ entries: [] });
  return doc;
}

router.get("/", async (req, res) => {
  res.json(await getSingleton());
});

router.post("/entries", async (req, res) => {
  const { name, quantity, unitPrice } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const doc = await getSingleton();
  doc.entries.push({ name: name.trim(), quantity: quantity ?? 0, unitPrice: unitPrice ?? 0 });
  await doc.save();
  res.status(201).json(doc);
});

router.put("/entries/:id", async (req, res) => {
  const doc = await getSingleton();
  const entry = doc.entries.id(req.params.id);
  if (!entry) return res.status(404).json({ error: "entry not found" });

  const { name, quantity, unitPrice } = req.body;
  if (name !== undefined) entry.name = name;
  if (quantity !== undefined) entry.quantity = quantity;
  if (unitPrice !== undefined) entry.unitPrice = unitPrice;

  await doc.save();
  res.json(doc);
});

router.delete("/entries/:id", async (req, res) => {
  const doc = await getSingleton();
  doc.entries.id(req.params.id)?.deleteOne();
  await doc.save();
  res.json(doc);
});

export default router;
