// @ts-nocheck
import { connectMongo, disconnectMongo } from "../db/mongoose";
import { Citizen } from "../modules/citizen/citizen.model";
import { MemberActif } from "../modules/member-actif/member-actif.model";
import { Commune } from "../modules/commune/commune.model";
import { Wilaya } from "../modules/wilaya/wilaya.model";
import { Party } from "../modules/parties/parties.model";
import { buildCitizenListFilter } from "../modules/citizen/citizen-scope";
import type { JwtUser } from "../middleware/auth";

async function testRole(roleName: string, user: JwtUser) {
  console.log(`\n=================== TESTING ROLE: ${roleName} ===================`);
  console.log("User Claims:", user);
  const filter = await buildCitizenListFilter({}, user);
  console.log("Generated Filter:", JSON.stringify(filter, null, 2));

  const results = await Citizen.find(filter)
    .populate([
      {
        path: "member_actif",
        select: "full_name wilaya commune",
        populate: [
          { path: "wilaya", select: "name name_fr name_ar wilaya_code" },
          { path: "commune", select: "name name_fr name_ar" },
        ],
      },
      { path: "party", select: "name acronym" },
      { path: "wilaya", select: "name name_fr name_ar wilaya_code" },
      { path: "commune", select: "name name_fr name_ar" },
    ])
    .lean();

  console.log("Matching Citizens Count:", results.length);
  if (results.length > 0) {
    console.log("First Citizen matched:", results[0].full_name, "scoped under wilaya:", results[0].wilaya?.name_fr, "commune:", results[0].commune?.name_fr);
  }
}

async function run() {
  await connectMongo();

  // Force registration
  const _c = Citizen.modelName;
  const _m = MemberActif.modelName;
  const _co = Commune.modelName;
  const _w = Wilaya.modelName;
  const _p = Party.modelName;

  // 1. Communal Admin
  await testRole("ADMIN COMMUN", {
    sub: "6a0ccbb7cb0d9b44be190303",
    role: "admin_commun",
    commune_id: "6a07dcea29cc0f5eaf299945",
    wilaya_id: "6a07dcea29cc0f5eaf299941"
  });

  // 2. Wilaya Admin
  await testRole("ADMIN WILAYA", {
    sub: "6a0ccb54cb0d9b44be190302",
    role: "admin_wilaya",
    wilaya_id: "6a07dcea29cc0f5eaf299941"
  });

  // 3. Super Admin
  await testRole("SUPER ADMIN", {
    sub: "6a0cc6355582f77eff4a7e69",
    role: "super_admin"
  });

  await disconnectMongo();
}

run();
