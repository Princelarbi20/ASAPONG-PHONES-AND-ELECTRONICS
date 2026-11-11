import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // counter name, e.g. "orderNumber"
  seq: { type: Number, default: 0, min: 0, max: 899999, validate: Number.isInteger },
});

export const Counter = mongoose.model("Counter", counterSchema);
