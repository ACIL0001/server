import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICandidat extends Document {
  full_name: string;
  nin: string;
  phone: string;
  date_of_birth: Date;
  image?: Buffer;
  image_mimetype?: string;
  party: Types.ObjectId;
  wilaya: Types.ObjectId;
  commune?: Types.ObjectId;
  created_by?: Types.ObjectId;
  is_favorite: boolean;
  result: number;
  number?: number;
}

const candidatSchema = new Schema<ICandidat>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    nin: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, trim: true },
    date_of_birth: { type: Date, required: true },
    image: { type: Buffer, select: false },
    image_mimetype: { type: String, select: false },
    party: { type: Schema.Types.ObjectId, ref: "Party" },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true },
    commune: { type: Schema.Types.ObjectId, ref: "Commune" },
    created_by: { type: Schema.Types.ObjectId, ref: "MemberActif" },
    is_favorite: { type: Boolean, default: false },
    result: { type: Number, default: 0, min: 0 },
    number: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.image;
        delete ret.image_mimetype;
      },
    },
  }
);

candidatSchema.index({ party: 1, wilaya: 1 });
candidatSchema.index({ wilaya: 1, commune: 1 });
candidatSchema.index({ wilaya: 1, result: -1 });
candidatSchema.index({ created_by: 1 });

export const Candidat = mongoose.model<ICandidat>("Candidat", candidatSchema);
