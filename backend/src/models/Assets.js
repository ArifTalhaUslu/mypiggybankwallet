import mongoose from "mongoose";

// Generic holdings list — each entry is any kind of asset (gold, USD, silver, a fund,
// whatever) as a quantity + unit price, not a fixed set of hardcoded fields.
// If priceSource is set, unitPrice is auto-synced from the live Altınkaynak feed
// (see routes/prices.js) instead of being hand-edited.
const priceSourceSchema = new mongoose.Schema(
  { kind: { type: String, enum: ["gold", "currency"], required: true }, code: { type: String, required: true } },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true, default: 0 },
    priceSource: { type: priceSourceSchema, default: null },
  },
  { _id: true }
);

const assetsSchema = new mongoose.Schema({
  entries: { type: [entrySchema], default: [] },
});

export default mongoose.model("Assets", assetsSchema);
