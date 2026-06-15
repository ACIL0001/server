import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICommune extends Document {
  name_fr: string;
  name_ar: string;
  commune_id: number;
  wilaya: Types.ObjectId;
}

const communeSchema = new Schema<ICommune>(
  {
    name_fr: { type: String, required: true, trim: true },
    name_ar: { type: String, required: true, trim: true },
    commune_id: { type: Number, required: true, unique: true },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true, index: true },
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

export const Commune = mongoose.model<ICommune>("Commune", communeSchema);
