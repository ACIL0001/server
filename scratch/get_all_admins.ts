import { connectMongo, disconnectMongo } from "../db/mongoose";
import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

async function run() {
  await connectMongo();
  const allAdmins = await Admin.find().lean();
  console.log("All Admins:", JSON.stringify(allAdmins, null, 2));
  await disconnectMongo();
}

run();
