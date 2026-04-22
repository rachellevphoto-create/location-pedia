/**
 * Lightweight analytics shim. PRD success metrics:
 *   - User retention (weekly returns)
 *   - Content freshness (real-time updates frequency)
 *   - Database growth (locations published)
 *
 * Events are logged to stdout in dev. In production, swap `track` to call
 * PostHog/Mixpanel/etc. The schema is intentionally narrow so destination
 * routing is easy.
 *
 * Tracking is gated by the `lp_consent` cookie. If the visitor has not
 * accepted analytics cookies, events are dropped.
 */
import { cookies } from "next/headers";

export type AnalyticsEvent =
  | { name: "user.registered"; userId: string }
  | { name: "user.approved"; userId: string }
  | { name: "user.rejected"; userId: string }
  | { name: "location.submitted"; userId: string; locationId: string }
  | { name: "location.published"; locationId: string; awardedPoints: boolean }
  | { name: "location.viewed"; userId?: string; locationId: string }
  | { name: "status_update.posted"; userId: string; locationId: string }
  | { name: "secret.unlocked"; userId: string; locationId: string };

async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get("lp_consent")?.value === "accepted";
  } catch {
    // `cookies()` throws outside of a request context (e.g. during build).
    // Default to no consent in that case.
    return false;
  }
}

export async function track(event: AnalyticsEvent) {
  if (!(await hasAnalyticsConsent())) return;
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event.name, event);
  }
  // TODO: forward to your analytics destination of choice.
}
