import { connectMongo, disconnectMongo } from "../db/mongoose";
import mongoose from "mongoose";

async function run() {
  await connectMongo();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not ready");
  }

  const targetWilaya = new mongoose.Types.ObjectId("6a07dcea29cc0f5eaf299941");

  console.log("Locating admins collection...");
  const collection = db.collection("admins");

  const adminWilayaBefore = await collection.findOne({ role: "admin_wilaya" });
  console.log("Before update:", JSON.stringify(adminWilayaBefore, null, 2));

  console.log("Updating admin_wilaya to Wilaya 6a07dcea29cc0f5eaf299941...");
  const updateResult = await collection.updateOne(
    { role: "admin_wilaya" },
    { 
      $set: { 
        wilaya: targetWilaya,
        wilaya_id: "6a07dcea29cc0f5eaf299941" // Also set wilaya_id as a string if referenced that way
      } 
    }
  );
  console.log("Update result:", updateResult);

  const adminWilayaAfter = await collection.findOne({ role: "admin_wilaya" });
  console.log("After update:", JSON.stringify(adminWilayaAfter, null, 2));

  await disconnectMongo();
}

run();
