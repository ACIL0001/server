import type { Model, SortOrder } from "mongoose";

// ────────────────────────────────────────────────────────────────
// Generic CRUD helpers — avoids repeating boilerplate per entity.
// Each module's service wraps these with entity-specific logic.
// ────────────────────────────────────────────────────────────────

interface PaginationOpts {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function paginate<T>(
  model: Model<T>,
  filter: Record<string, any>,
  opts: PaginationOpts,
  select?: string,
  populate?: string | string[]
) {
  const limit = Math.min(opts.limit || 20, 5000);
  const sortBy = opts.sortBy || "createdAt";
  const sortOrder: SortOrder = opts.sortOrder === "asc" ? 1 : -1;

  // Cursor-based pagination (preferred for performance)
  if (opts.cursor) {
    const cursorFilter = sortOrder === -1
      ? { ...filter, _id: { $lt: opts.cursor } }
      : { ...filter, _id: { $gt: opts.cursor } };

    let query = model.find(cursorFilter)
      .sort({ [sortBy]: sortOrder, _id: sortOrder } as any)
      .limit(limit + 1)
      .lean();

    if (select) query = query.select(select) as any;
    if (populate) query = query.populate(populate as any) as any;

    const docs = await query;
    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();
    const nextCursor = hasMore && docs.length > 0 ? String((docs[docs.length - 1] as any)._id) : null;

    return { data: docs, hasMore, nextCursor };
  }

  // Offset-based fallback
  const page = Math.max(opts.page || 1, 1);
  const skip = (page - 1) * limit;

  let query = model.find(filter)
    .sort({ [sortBy]: sortOrder } as any)
    .skip(skip)
    .limit(limit)
    .lean();

  if (select) query = query.select(select) as any;
  if (populate) query = query.populate(populate as any) as any;

  const [data, total] = await Promise.all([query, model.countDocuments(filter)]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function findById<T>(model: Model<T>, id: string, populate?: string | string[]) {
  let query = model.findById(id).lean();
  if (populate) query = query.populate(populate as any) as any;
  const doc = await query;
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}

export async function createDoc<T>(model: Model<T>, data: Partial<T>) {
  return model.create(data as any);
}

export async function updateDoc<T>(model: Model<T>, id: string, data: Partial<T>) {
  const doc = await model.findByIdAndUpdate(id, { $set: data } as any, { new: true, runValidators: true }).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}

export async function deleteDoc<T>(model: Model<T>, id: string) {
  const doc = await model.findByIdAndDelete(id).lean();
  if (!doc) throw Object.assign(new Error("Not found"), { status: 404 });
  return doc;
}
