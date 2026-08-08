import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    paid: { type: Boolean, required: true, default: false },
    // Links this line to a fixed constant (Kira, Aidat, ...) when it's a regular
    // payment against it — set automatically for auto-seeded items, optional for
    // manually-added ones. Items left unlinked are "irregular" one-off charges.
    constantId: { type: mongoose.Schema.Types.ObjectId, ref: "Constant", default: null },
  },
  { _id: true }
);

const monthEntrySchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // "YYYY-MM"
  items: { type: [itemSchema], default: [] },
});

export default mongoose.model("MonthEntry", monthEntrySchema);
