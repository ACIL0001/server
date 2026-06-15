import { connectMongo, disconnectMongo } from "../db/mongoose";
import { Citizen } from "../modules/citizen/citizen.model";
import { MemberActif } from "../modules/member-actif/member-actif.model";
import mongoose from "mongoose";

// We'll define a quick Admin schema interface or import it if it exists to query the admins
const AdminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

async function run() {
  await connectMongo();

  // Force register models
  console.log("MemberActif model:", MemberActif.modelName);
  console.log("Citizen model:", Citizen.modelName);

  // 1. Fetch Admins
  const admins = await Admin.find().lean();
  console.log("\n--- ADMINS ---");
  console.log(JSON.stringify(admins.map(a => ({
    id: a._id,
    name: a.full_name,
    role: a.role,
    wilaya: a.wilaya_id || a.wilaya,
    commune: a.commune_id || a.commune
  })), null, 2));

  // 2. Fetch Active Members
  const members = await MemberActif.find().lean();
  console.log("\n--- ACTIVE MEMBERS ---");
  console.log(JSON.stringify(members.map(m => ({
    id: m._id,
    name: m.full_name,
    wilaya: m.wilaya,
    commune: m.commune
  })), null, 2));

  // 3. Fetch Citizens
  const citizens = await Citizen.find().lean();
  console.log("\n--- CITIZENS ---");
  console.log(JSON.stringify(citizens.map(c => ({
    id: c._id,
    name: c.full_name,
    member_actif: c.member_actif,
    wilaya: c.wilaya,
    commune: c.commune
  })), null, 2));

  await disconnectMongo();
}

run();
