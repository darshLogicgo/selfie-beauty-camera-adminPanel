import mongoose from "mongoose";
import MediaClick from "../models/media_click.model.js";

// Configure your Mongo URI via env or fallback (adjust fallback if needed)
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://darsh01logicgo_db_user:sqStkMn8n7jjx8Qr@selfie-beauty-camera.dllbn2q.mongodb.net/adminPanel";

// Test data
const userId = "693a8b85564da396268c05fd";
const testCategories = [
  { categoryId: "69368ce76e3939abccf93ca7", click_count: 7 },
  { categoryId: "69368d62b95a6c2a75920505", click_count: 6 },
  { categoryId: "69368e421224bcb6bdb98063", click_count: 5 },
  { categoryId: "69368e741224bcb6bdb98076", click_count: 4 },
  { categoryId: "69368ed634fb273922619258", click_count: 3 },
  { categoryId: "69368f1a2e46bd68ae18894d", click_count: 2 },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to Mongo");

  const payload = {
    userId: new mongoose.Types.ObjectId(userId),
    categories: testCategories.map((c) => ({
      categoryId: new mongoose.Types.ObjectId(c.categoryId),
      click_count: c.click_count,
      lastClickedAt: new Date(),
    })),
  };

  const res = await MediaClick.findOneAndUpdate(
    { userId: payload.userId },
    { $set: payload },
    { new: true, upsert: true }
  ).lean();

  console.log("Upserted media_clicks doc:", res);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
