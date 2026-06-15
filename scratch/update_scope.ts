import { connectMongo, disconnectMongo } from "../db/mongoose";
import { Citizen } from "../modules/citizen/citizen.model";
import { MemberActif } from "../modules/member-actif/member-actif.model";
import mongoose from "mongoose";

async function run() {
  await connectMongo();

  const targetWilaya = new mongoose.Types.ObjectId("6a07dcea29cc0f5eaf299941");
  const targetCommune = new mongoose.Types.ObjectId("6a07dcea29cc0f5eaf299945");

  console.log("Updating active members...");
  const memberUpdate = await MemberActif.updateMany(
    {},
    {
      $set: {
        wilaya: targetWilaya,
        commune: targetCommune
      }
    }
  );
  console.log("MemberActif update result:", memberUpdate);

  console.log("Updating citizens...");
  const citizenUpdate = await Citizen.updateMany(
    {},
    {
      $set: {
        wilaya: targetWilaya,
        commune: targetCommune
      }
    }
  );
  console.log("Citizen update result:", citizenUpdate);

  await disconnectMongo();
}

run();
