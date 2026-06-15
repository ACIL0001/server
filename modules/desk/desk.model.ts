import mongoose, { Schema, type Document, type Types } from "mongoose";

export type DeskType = "male" | "female";

export interface IDesk extends Document {
  desk_number: number;
  center: Types.ObjectId;
  wilaya: Types.ObjectId;
  commune: Types.ObjectId;
  type: DeskType;
  male_count: number;
  female_count: number;
  total_voters: number;
}

const deskSchema = new Schema<IDesk>(
  {
    desk_number: { type: Number, required: true, min: 1 },
    center: { type: Schema.Types.ObjectId, ref: "Center", required: true },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true, index: true },
    commune: { type: Schema.Types.ObjectId, ref: "Commune", required: true, index: true },
    type: { type: String, enum: ["male", "female"], required: true, index: true },
    male_count: { type: Number, default: 0, min: 0 },
    female_count: { type: Number, default: 0, min: 0 },
    total_voters: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

deskSchema.index({ desk_number: 1, center: 1 }, { unique: true });
deskSchema.index({ center: 1 });

export const Desk = mongoose.model<IDesk>("Desk", deskSchema);
