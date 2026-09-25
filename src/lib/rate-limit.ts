import "server-only";

import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Keeps the map from growing without bound on a long-lived instance. */
const MAX_BUCKETS = 10_000;

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Best-effort caller IP.
 *
 * Vercel sets `x-forwarded-for` with the original client first. The other two
 * headers are the fallbacks used by Vercel's own proxy and by nginx.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-vercel-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitVerdict = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Fixed-window counter held in memory.
 *
 * Each serverless instance keeps its own copy, so this reliably stops casual
 * brute force and bot bursts but is not a hard global ceiling. If the store ever
 * comes under sustained attack, replace `buckets` with a shared store such as
 * Upstash Redis; the call sites do not need to change.
 */
export async function rateLimit(
  scope: string,
  id: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitVerdict> {
  const now = Date.now();
  sweep(now);

  const key = `${scope}:${id}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/**
 * Returns `null` when the caller may proceed, or the number of seconds to wait
 * when it may not.
 */
export async function enforceRateLimit(
  scope: string,
  id: string,
  limit: number,
  windowMs: number,
): Promise<number | null> {
  const verdict = await rateLimit(scope, id, limit, windowMs);
  return verdict.ok ? null : verdict.retryAfterSec;
}

/** Clears a counter — used so a legitimate sign-in never locks the owner out. */
export function resetRateLimit(scope: string, id: string): void {
  buckets.delete(`${scope}:${id}`);
}
