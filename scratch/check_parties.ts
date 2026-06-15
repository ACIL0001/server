import { connectMongo, disconnectMongo } from "../db/mongoose";
import { Party } from "../modules/parties/parties.model";

async function run() {
  await connectMongo();
  const parties = await Party.find();
  console.log(JSON.stringify(parties, null, 2));
  await disconnectMongo();
}

run();
