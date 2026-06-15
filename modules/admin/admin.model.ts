import mongoose, { Schema, type Document, type Types } from "mongoose";

export type AdminRole = "super_admin" | "admin_wilaya" | "admin_commun";

export interface IAdmin extends Document {
  full_name: string;
  email: string;
  password: string;
  role: AdminRole;
  status: "active" | "inactive" | "suspended";
  image?: Buffer;
  image_mimetype?: string;
  phone: string;
  nin: string;
  wilaya?: Types.ObjectId;
  commune?: Types.ObjectId;
  created_by?: Types.ObjectId;
}

const adminSchema = new Schema<IAdmin>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: {
      type: String,
      enum: ["super_admin", "admin_wilaya", "admin_commun"],
      required: true,
    },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    image: { type: Buffer, select: false },
    image_mimetype: { type: String, select: false },
    phone: { type: String, required: true, trim: true },
    nin: { type: String, required: true, unique: true, trim: true },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya" },
    commune: { type: Schema.Types.ObjectId, ref: "Commune" },
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
        delete ret.image;
        delete ret.image_mimetype;
      },
    },
  }
);

adminSchema.index({ role: 1, status: 1 });
adminSchema.index({ wilaya: 1, commune: 1, status: 1 });

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
