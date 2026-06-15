import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IParty extends Document {
  name: string;
  acronym: string;
  leader: string;
  founded?: string;
  logo?: Buffer;
  logo_mimetype?: string;
  wilaya: Types.ObjectId;
  created_by: Types.ObjectId;
}

const partySchema = new Schema<IParty>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    acronym: { type: String, required: true, trim: true, maxlength: 20 },
    leader: { type: String, required: true, trim: true, maxlength: 100 },
    founded: { type: String, trim: true },
    logo: { type: Buffer, select: false },
    logo_mimetype: { type: String, select: false },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true },
    created_by: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.logo;
        delete ret.logo_mimetype;
      },
    },
  }
);

partySchema.index({ name: 1, wilaya: 1 }, { unique: true });
partySchema.index({ wilaya: 1 });

export const Party = mongoose.model<IParty>("Party", partySchema);
