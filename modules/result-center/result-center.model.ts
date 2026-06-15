import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IResultCenter extends Document {
  center: Types.ObjectId;
  owner: Types.ObjectId;
  party: Types.ObjectId;
  result: number;
  image?: Buffer;
  image_mimetype?: string;
  status: "pending" | "validated" | "rejected";
}

const resultCenterSchema = new Schema<IResultCenter>(
  {
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "RoleElectionDay", required: true },
    party: { type: Schema.Types.ObjectId, ref: "Party", required: true },
    result: { type: Number, required: true, min: 0 },
    image: { type: Buffer, select: false },
    image_mimetype: { type: String, select: false },
    status: { type: String, enum: ["pending", "validated", "rejected"], default: "pending" },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret: any) { ret.id = ret._id; delete ret._id; delete ret.__v; delete ret.image; delete ret.image_mimetype; } },
  }
);

resultCenterSchema.index({ center: 1, party: 1 }, { unique: true });
resultCenterSchema.index({ status: 1 });

export const ResultCenter = mongoose.model<IResultCenter>("ResultCenter", resultCenterSchema, "result centers");
