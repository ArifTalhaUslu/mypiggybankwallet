import mongoose from "mongoose";

// Generic holdings list — each entry is any kind of asset (gold, USD, silver, a fund,
// whatever) as a quantity + unit price, not a fixed set of hardcoded fields.
const entrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unitPrice: { type: Number, required: true, default: 0 },
  },
  { _id: true }
);

const assetsSchema = new mongoose.Schema({
  entries: { type: [entrySchema], default: [] },
});

export default mongoose.model("Assets", assetsSchema);
