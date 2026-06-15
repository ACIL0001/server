import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IMemberActif extends Document {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  date_of_birth: Date;
  nin: string;
  goal?: string;
  wilaya: Types.ObjectId;
  commune: Types.ObjectId;
  party: Types.ObjectId;
  created_by: Types.ObjectId;
}

const memberActifSchema = new Schema<IMemberActif>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    date_of_birth: { type: Date, required: true },
    nin: { type: String, required: true, unique: true, trim: true },
    goal: { type: String, trim: true, maxlength: 500 },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true },
    commune: { type: Schema.Types.ObjectId, ref: "Commune", required: true },
    party: { type: Schema.Types.ObjectId, ref: "Party" },
    created_by: { type: Schema.Types.ObjectId, ref: "Admin" },
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

memberActifSchema.index({ commune: 1, party: 1 });

export const MemberActif = mongoose.model<IMemberActif>("MemberActif", memberActifSchema, "membre actifs");
