import { Notification } from "./notification.model";
import * as crud from "../common/crud.helpers";
export async function create(data: any) { return crud.createDoc(Notification, data); }
export async function findForUser(userId: string, query: any) {
  const f: any = { receivers: userId };
  if (query.is_read !== undefined) f.is_read = query.is_read === "true";
  if (query.type) f.type = query.type;
  const populate = { path: "sender", select: "full_name email phone role nin date_of_birth desk center" };
  return crud.paginate(Notification, f, query, undefined, populate as any);
}
export async function markRead(id: string) { return crud.updateDoc(Notification, id, { is_read: true }); }
export async function markAllRead(userId: string) { return Notification.updateMany({ receivers: userId, is_read: false }, { $set: { is_read: true } }); }

import { Admin } from "../admin/admin.model";
import { emitToRoom } from "../../socket";
import type { Types } from "mongoose";

export async function createReclamation(data: any) {
  const query: any = { status: "active", $or: [{ role: "super_admin" }] };
  
  if (data.wilaya_id) {
    query.$or.push({ role: "admin_wilaya", wilaya: data.wilaya_id });
  }
  
  if (data.commune_id) {
    query.$or.push({ role: "admin_commun", commune: data.commune_id });
  }

  const admins = await Admin.find(query).select("_id role wilaya commune");
  const receiverIds = admins.map((a) => a._id as Types.ObjectId);

  const title = data.title;
  const body = data.content;
  
  let notification;
  if (receiverIds.length > 0) {
    let senderModel: "Admin" | "RoleElectionDay" | "MemberActif" = "Admin";
    if (data.role === "member_actif") senderModel = "MemberActif";
    else if (data.role === "role_election_day" || ["observateur_bureau", "observateur_centre", "chef_centre", "scrutateur"].includes(data.role)) senderModel = "RoleElectionDay";

    notification = await Notification.create({
      type: data.type,
      sender: data.sender,
      senderModel,
      receivers: receiverIds,
      title,
      body,
      metadata: {
        role: data.role,
        wilaya_id: data.wilaya_id,
        commune_id: data.commune_id,
        center_id: data.center_id,
        status: "pending",
      },
    });

    emitToRoom("super_admin", "notification", notification);
    if (data.wilaya_id) emitToRoom(`wilaya:${data.wilaya_id}`, "notification", notification);
    if (data.commune_id) emitToRoom(`commune:${data.commune_id}`, "notification", notification);
  }

  return notification;
}

export async function findReclamations(query: any) {
  const f: any = { type: { $in: ["reclamation", "message"] } };
  
  if (query.status) f["metadata.status"] = query.status;
  if (query.type) f.type = query.type;
  if (query.wilaya_id) f["metadata.wilaya_id"] = query.wilaya_id;
  if (query.commune_id) f["metadata.commune_id"] = query.commune_id;
  if (query.sender) f.sender = query.sender;
  
  const populate = { path: "sender", select: "full_name email phone role nin date_of_birth desk center" };
  return crud.paginate(Notification, f, query, undefined, populate as any);
}
