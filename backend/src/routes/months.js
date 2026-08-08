import { Router } from "express";
import MonthEntry from "../models/MonthEntry.js";
import Constant from "../models/Constant.js";

const router = Router();

function summarize(monthDoc) {
  const total = monthDoc.items.reduce((sum, i) => sum + i.amount, 0);
  const paid = monthDoc.items.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0);
  return { month: monthDoc.month, total, paid, remaining: total - paid, itemCount: monthDoc.items.length };
}

function addMonths(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function serverCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// New month = only the constants that were actually used (linked) in the previous
// month, refreshed to each constant's current amount. A constant not used last month
// (e.g. no QNB statement that month) doesn't get auto-added — the user re-adds it from
// Sabitler when it's actually needed. Irregular one-off items never carry over; the
// user re-adds them explicitly, keeping each month an honest record of what happened.
async function buildSeedItems(beforeMonth) {
  const prevMonth = await MonthEntry.findOne({ month: { $lt: beforeMonth } }).sort({ month: -1 });
  if (!prevMonth) {
    // No history at all yet — seed every constant so there's something to start from.
    const constants = await Constant.find();
    return constants.map((c) => ({ name: c.name, amount: c.current, paid: false, constantId: c._id }));
  }

  const usedIds = [...new Set(prevMonth.items.filter((i) => i.constantId).map((i) => String(i.constantId)))];
  const constants = await Constant.find({ _id: { $in: usedIds } });
  return constants.map((c) => ({ name: c.name, amount: c.current, paid: false, constantId: c._id }));
}

// List all months with totals, sorted chronologically.
router.get("/", async (req, res) => {
  const months = await MonthEntry.find().sort({ month: 1 });
  res.json(months.map(summarize));
});

// Spending grouped by category across every month — items linked to a constant (Kira,
// Aidat, ...) roll up under that constant's current name even if the line itself was
// named differently ("Ocak ayı aidat farkı"); unlinked items group by their own name.
// Must be registered before "/:month" so "breakdown" isn't captured as a month param.
router.get("/breakdown", async (req, res) => {
  const result = await MonthEntry.aggregate([
    { $unwind: "$items" },
    { $lookup: { from: "constants", localField: "items.constantId", foreignField: "_id", as: "constant" } },
    {
      $addFields: {
        categoryName: { $ifNull: [{ $arrayElemAt: ["$constant.name", 0] }, "$items.name"] },
        linked: { $cond: [{ $ifNull: ["$items.constantId", false] }, true, false] },
      },
    },
    { $group: { _id: "$categoryName", total: { $sum: "$items.amount" }, linked: { $max: "$linked" } } },
    { $sort: { total: -1 } },
  ]);
  res.json(result.map((r) => ({ name: r._id, total: r.total, linked: r.linked })));
});

// Fetch a month. Never silently creates one — browsing must only ever show months that
// really exist, so a stray/rapid request can't spawn ghost entries in either direction.
router.get("/:month", async (req, res) => {
  const monthDoc = await MonthEntry.findOne({ month: req.params.month });
  if (!monthDoc) return res.status(404).json({ error: `Month ${req.params.month} does not exist yet` });
  res.json(monthDoc);
});

// Explicitly create the next month after whatever currently exists (or after today, if
// this is the very first month ever). Seeded from constants + last month's extra items.
router.post("/next", async (req, res) => {
  const latestExisting = await MonthEntry.findOne().sort({ month: -1 });
  const nextMonth = latestExisting ? addMonths(latestExisting.month, 1) : serverCurrentMonth();

  const existing = await MonthEntry.findOne({ month: nextMonth });
  if (existing) return res.json(existing);

  const items = await buildSeedItems(nextMonth);
  const monthDoc = await MonthEntry.create({ month: nextMonth, items });
  res.status(201).json(monthDoc);
});

router.post("/:month/items", async (req, res) => {
  const { name, amount, paid, constantId } = req.body;
  if (!name || typeof amount !== "number") {
    return res.status(400).json({ error: "name and amount are required" });
  }
  const monthDoc = await MonthEntry.findOne({ month: req.params.month });
  if (!monthDoc) return res.status(404).json({ error: "month not found" });
  monthDoc.items.push({ name, amount, paid: !!paid, constantId: constantId || null });
  await monthDoc.save();
  res.status(201).json(monthDoc);
});

router.put("/:month/items/:itemId", async (req, res) => {
  const monthDoc = await MonthEntry.findOne({ month: req.params.month });
  if (!monthDoc) return res.status(404).json({ error: "month not found" });
  const item = monthDoc.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: "item not found" });

  const { name, amount, paid, constantId } = req.body;
  if (name !== undefined) item.name = name;
  if (amount !== undefined) item.amount = amount;
  if (paid !== undefined) item.paid = paid;
  if (constantId !== undefined) item.constantId = constantId || null;

  await monthDoc.save();
  res.json(monthDoc);
});

router.delete("/:month/items/:itemId", async (req, res) => {
  const monthDoc = await MonthEntry.findOne({ month: req.params.month });
  if (!monthDoc) return res.status(404).json({ error: "month not found" });
  monthDoc.items.id(req.params.itemId)?.deleteOne();
  await monthDoc.save();
  res.json(monthDoc);
});

export default router;
