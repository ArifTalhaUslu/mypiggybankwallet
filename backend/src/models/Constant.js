import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const constantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  current: { type: Number, required: true, default: 0 },
  history: { type: [historySchema], default: [] },
});

export default mongoose.model("Constant", constantSchema);
