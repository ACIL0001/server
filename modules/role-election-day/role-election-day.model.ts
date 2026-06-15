import mongoose, { Schema, type Document, type Types } from "mongoose";

export type ElectionRole = "chef_centre" | "observateur_bureau" | "observateur_centre" | "scrutateur";

export interface IRoleElectionDay extends Document {
  full_name: string;
  email: string;
  password: string;
  /** Last known login password (for admin display & SMS); not returned in list APIs */
  password_plain?: string;
  date_of_birth: Date;
  phone: string;
  nin: string;
  role: ElectionRole;
  wilaya: Types.ObjectId;
  commune: Types.ObjectId;
  center?: Types.ObjectId;
  desk?: Types.ObjectId;
  location?: string;
  assigned_time?: string;
  assigned_date?: Date;
  created_by: Types.ObjectId;
}

const roleElectionDaySchema = new Schema<IRoleElectionDay>(
  {
    full_name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false, minlength: 8 },
    password_plain: { type: String, select: false },
    date_of_birth: { type: Date, required: true },
    phone: { type: String, required: true, trim: true },
    nin: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      enum: ["chef_centre", "observateur_bureau", "observateur_centre", "scrutateur"],
      required: true,
    },
    wilaya: { type: Schema.Types.ObjectId, ref: "Wilaya", required: true },
    commune: { type: Schema.Types.ObjectId, ref: "Commune", required: true },
    center: { type: Schema.Types.ObjectId, ref: "Center" },
    desk: { type: Schema.Types.ObjectId, ref: "Desk" },
    location: { type: String, trim: true, maxlength: 500 },
    assigned_time: { type: String, trim: true },
    assigned_date: { type: Date },
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
        // password_plain kept when explicitly selected (admin edit view)
      },
    },
  }
);

roleElectionDaySchema.index({ desk: 1, role: 1 });
roleElectionDaySchema.index({ wilaya: 1, role: 1 });
roleElectionDaySchema.index({ center: 1 });

export const RoleElectionDay = mongoose.model<IRoleElectionDay>("RoleElectionDay", roleElectionDaySchema, "role election days");
