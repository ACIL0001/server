import { connectMongo, disconnectMongo } from "../db/mongoose";
import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

async function run() {
  await connectMongo();
  const rawAdmin = await Admin.findOne({ role: "admin_wilaya" }).lean();
  console.log("Raw admin_wilaya document:", JSON.stringify(rawAdmin, null, 2));
  await disconnectMongo();
}

run();
