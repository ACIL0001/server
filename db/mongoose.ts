import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectMongo(): Promise<void> {
  // Mongoose has safe defaults in v7+; we still set a couple of explicit ones.
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== "production",
  });

  // MongoDB only shows a database after the first write.
  // This upsert ensures the configured DB (e.g. `election`) is created/visible.
  const db = mongoose.connection.db;
  if (db) {
    await db
      .collection<{ _id: string; createdAt: Date }>("__meta")
      .updateOne({ _id: "init" }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

