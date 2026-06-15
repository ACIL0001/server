import { connectMongo, disconnectMongo } from "../db/mongoose";
import mongoose from "mongoose";

// Quick schema reference
const AdminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

async function run() {
  await connectMongo();

  const targetWilaya = new mongoose.Types.ObjectId("6a07dcea29cc0f5eaf299941");

  console.log("Updating admin_wilaya's scope to Wilaya 6a07dcea29cc0f5eaf299941...");
  
  const updateResult = await Admin.updateOne(
    { role: "admin_wilaya" },
    { $set: { wilaya: targetWilaya, wilaya_id: targetWilaya } }
  );
  
  console.log("Update result:", updateResult);

  // Fetch all admins again to verify
  const admins = await Admin.find().lean();
  console.log("\n--- UPDATED ADMINS ---");
  console.log(JSON.stringify(admins.map(a => ({
    id: a._id,
    name: a.full_name,
    role: a.role,
    wilaya: a.wilaya_id || a.wilaya,
    commune: a.commune_id || a.commune
  })), null, 2));

  await disconnectMongo();
}

run();
