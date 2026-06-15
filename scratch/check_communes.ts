import { connectMongo, disconnectMongo } from "../db/mongoose";
import { Commune } from "../modules/commune/commune.model";

async function run() {
  await connectMongo();
  const communes = await Commune.find().limit(5).lean();
  console.log(JSON.stringify(communes, null, 2));
  await disconnectMongo();
}

run();
