import mongoose, { Schema, type Document } from "mongoose";

export interface IElectionDay extends Document {
  is_election_day_open: boolean;
  updatedAt?: Date;
}

const electionDaySchema = new Schema<IElectionDay>(
  {
    is_election_day_open: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const ElectionDay = mongoose.model<IElectionDay>("ElectionDay", electionDaySchema, "election day");
