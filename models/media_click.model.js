import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CategoryClickSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    click_count: { type: Number, default: 0 },
    lastClickedAt: { type: Date, default: null },
  },
  { _id: false }
);

const MediaClickSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    categories: { type: [CategoryClickSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "media_clicks",
  }
);

export default model("MediaClick", MediaClickSchema);
