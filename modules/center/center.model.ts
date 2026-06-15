import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICenter extends Document {
  name: string;
  wilaya: Types.ObjectId;
  commune: Types.ObjectId;
  female_count: number;
  male_count: number;
  total_voters: number;
  number_of_desks: number;
  location?: string;
}

const centerSchema = new Schema<ICenter>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true },
    commune: { type: Schema.Types.ObjectId, ref: "Commune", required: true },
    female_count: { type: Number, default: 0, min: 0 },
    male_count: { type: Number, default: 0, min: 0 },
    total_voters: { type: Number, default: 0, min: 0 },
    number_of_desks: { type: Number, default: 0, min: 0 },
    location: { type: String, trim: true, maxlength: 500 },
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

centerSchema.index({ name: 1, commune: 1 }, { unique: true });
centerSchema.index({ wilaya: 1, commune: 1 });

export const Center = mongoose.model<ICenter>("Center", centerSchema);
