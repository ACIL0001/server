import type { JwtUser } from "../../middleware/auth";
import { MemberActif } from "../member-actif/member-actif.model";

function searchFilter(term: string): Record<string, unknown> {
  const re = { $regex: term, $options: "i" };
  return { $or: [{ full_name: re }, { nin: re }, { phone: re }, { email: re }] };
}

export async function buildCitizenListFilter(
  query: Record<string, unknown>,
  user?: JwtUser
): Promise<Record<string, unknown>> {
  const parts: Record<string, unknown>[] = [];

  if (query.search) {
    parts.push(searchFilter(String(query.search)));
  }
  if (query.member_actif) {
    parts.push({ member_actif: query.member_actif });
  }
  if (query.party) {
    parts.push({ party: query.party });
  }

  if (user?.role === "member_actif") {
    parts.push({ member_actif: user.sub });
    if (parts.length === 0) return { member_actif: user.sub };
    if (parts.length === 1) return parts[0];
    return { $and: parts };
  }

  let wilayaId = query.wilaya ? String(query.wilaya) : undefined;
  let communeId = query.commune ? String(query.commune) : undefined;

  if (user?.role === "admin_wilaya" && user.wilaya_id) {
    wilayaId = user.wilaya_id;
  }
  if (user?.role === "admin_commun" && user.commune_id) {
    communeId = user.commune_id;
    wilayaId = undefined;
  }

  if (communeId) {
    const memberIds = await MemberActif.find({ commune: communeId }).distinct("_id");
    const geoParts: Record<string, unknown>[] = [{ commune: communeId }];
    if (memberIds.length > 0) {
      geoParts.push({ member_actif: { $in: memberIds } });
    }
    parts.push({ $or: geoParts });
  } else if (wilayaId) {
    const memberFilter: Record<string, unknown> = { wilaya: wilayaId };
    if (query.commune && user?.role === "super_admin") {
      memberFilter.commune = query.commune;
    }
    const memberIds = await MemberActif.find(memberFilter).distinct("_id");
    const geoParts: Record<string, unknown>[] = [{ wilaya: wilayaId }];
    if (memberIds.length > 0) {
      geoParts.push({ member_actif: { $in: memberIds } });
    }
    parts.push({ $or: geoParts });
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}
