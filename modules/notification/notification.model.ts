import mongoose, { Schema, type Document, type Types } from "mongoose";

export type NotificationType = "result_submitted" | "result_validated" | "assignment" | "alert" | "system" | "reclamation" | "message";

export interface INotification extends Document {
  type: NotificationType;
  sender?: Types.ObjectId;
  senderModel?: "Admin" | "RoleElectionDay" | "MemberActif";
  receivers: Types.ObjectId[];
  title: string;
  body: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    type: { type: String, enum: ["result_submitted", "result_validated", "assignment", "alert", "system", "reclamation", "message"], required: true },
    sender: { type: Schema.Types.ObjectId, refPath: 'senderModel' },
    senderModel: { type: String, enum: ['Admin', 'RoleElectionDay', 'MemberActif'] },
    receivers: [{ type: Schema.Types.ObjectId, required: true }],
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    is_read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { transform(_doc, ret: any) { ret.id = ret._id; delete ret._id; delete ret.__v; } },
  }
);

notificationSchema.index({ receivers: 1, is_read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
