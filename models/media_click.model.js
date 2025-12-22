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

const AiEditDailySchema = new Schema(
  {
    date: {
      type: Date, 
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const AiEditSavedEntrySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const AiEditSharedEntrySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const PaywallOpenedEntrySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const StyleOpenedEntrySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
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

    /* ---------- AI EDIT TRACKING ---------- */
    ai_edit_complete: {
      type: Number,
      default: 0,
    },

    ai_edit_last_date: {
      type: Date,
      default: null,
    },

    ai_edit_daily_count: {
      type: [AiEditDailySchema],
      default: [],
    },

    ai_edit_saved_count: {
      type: Number,
      default: 0,
    },

    ai_edit_saved_entry: {
      type: [AiEditSavedEntrySchema],
      default: [],
    },

    ai_edit_shared_count: {
      type: Number,
      default: 0,
    },

    ai_edit_shared_entry: {
      type: [AiEditSharedEntrySchema],
      default: [],
    },

    paywall_opened_count: {
      type: Number,
      default: 0,
    },

    paywall_opened_entry: {
      type: [PaywallOpenedEntrySchema],
      default: [],
    },

    style_opened_count: {
      type: Number,
      default: 0,
    },

    style_opened_entry: {
      type: [StyleOpenedEntrySchema],
      default: [],
    },

  },
  {
    timestamps: true,
    collection: "media_clicks",
  }
);

export default model("MediaClick", MediaClickSchema);
