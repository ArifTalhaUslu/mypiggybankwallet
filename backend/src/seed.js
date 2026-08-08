// One-off migration of the old piggybank data.json into MongoDB.
// Usage: place the old data.json next to this file's project root as data.json, then `npm run seed`.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import Constant from "./models/Constant.js";
import MonthEntry from "./models/MonthEntry.js";
import Assets from "./models/Assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data.json");

async function run() {
  if (!fs.existsSync(dataPath)) {
    console.error(`No data.json found at ${dataPath}. Copy the old piggybank data.json there first.`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/piggybank");

  await Promise.all([Constant.deleteMany({}), MonthEntry.deleteMany({}), Assets.deleteMany({})]);

  const constants = Object.entries(data.constants || {}).map(([name, c]) => ({
    name,
    current: c.current,
    history: c.history || [],
  }));
  if (constants.length) await Constant.insertMany(constants);

  const months = Object.entries(data.months || {}).map(([month, items]) => ({
    month,
    items: items.map(([name, amount, paid]) => ({ name, amount, paid })),
  }));
  if (months.length) await MonthEntry.insertMany(months);

  if (data.assets) {
    const a = data.assets;
    const entries = [];
    if (a.quarterGold || a.quarterGoldPrice) entries.push({ name: "Çeyrek Altın", quantity: a.quarterGold || 0, unitPrice: a.quarterGoldPrice || 0 });
    if (a.gramGold || a.gramGoldPrice) entries.push({ name: "Gram Altın", quantity: a.gramGold || 0, unitPrice: a.gramGoldPrice || 0 });
    if (a.usd || a.usdPrice) entries.push({ name: "Dolar", quantity: a.usd || 0, unitPrice: a.usdPrice || 0 });
    if (a.tl) entries.push({ name: "TL", quantity: a.tl, unitPrice: 1 });
    await Assets.create({ entries });
  }

  console.log(`Seeded ${constants.length} constants, ${months.length} months, assets.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
