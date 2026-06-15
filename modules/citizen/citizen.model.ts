import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICitizen extends Document {
  full_name: string;
  email?: string;
  phone: string;
  password: string;
  date_of_birth: Date;
  nin: string;
  member_actif?: Types.ObjectId;
  party?: Types.ObjectId;
  wilaya?: Types.ObjectId;
  commune?: Types.ObjectId;
}

const citizenSchema = new Schema<ICitizen>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, sparse: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    date_of_birth: { type: Date, required: true },
    nin: { type: String, required: true, unique: true, trim: true },
    member_actif: { type: Schema.Types.ObjectId, ref: "MemberActif" },
    party: { type: Schema.Types.ObjectId, ref: "Party" },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya" },
    commune: { type: Schema.Types.ObjectId, ref: "Commune" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
      },
    },
  }
);

citizenSchema.index({ member_actif: 1 });
citizenSchema.index({ party: 1 });
citizenSchema.index({ wilaya: 1, commune: 1 });

export const Citizen = mongoose.model<ICitizen>("Citizen", citizenSchema);
