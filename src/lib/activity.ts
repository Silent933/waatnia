import "server-only";

import { prisma } from "@/lib/prisma";

export type ActivityInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  actor?: string;
};

/**
 * Audit trail for the dashboard. Logging must never break the operation that
 * triggered it, so failures are swallowed.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.activityLog.create({
      data: {
        actor: input.actor ?? "admin",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("activity log failed:", error);
  }
}

export async function listActivity(limit = 50) {
  if (!prisma) return [];
  return prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
