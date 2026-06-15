import mongoose, { Schema, type Document } from "mongoose";

export interface IWilaya extends Document {
  name_fr: string;
  name_ar: string;
  wilaya_code: number;
  seats_count: number;
}

const wilayaSchema = new Schema<IWilaya>(
  {
    name_fr: { type: String, required: true, trim: true },
    name_ar: { type: String, required: true, trim: true },
    wilaya_code: { type: Number, required: true, unique: true, min: 1 },
    seats_count: { type: Number, default: 0 },
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

export const Wilaya = mongoose.model<IWilaya>("Wilaya", wilayaSchema);
