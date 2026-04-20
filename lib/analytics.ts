/**
 * Lightweight analytics shim. PRD success metrics:
 *   - User retention (weekly returns)
 *   - Content freshness (real-time updates frequency)
 *   - Database growth (locations published)
 *
 * Events are logged to stdout in dev. In production, swap `track` to call
 * PostHog/Mixpanel/etc. The schema is intentionally narrow so destination
 * routing is easy.
 */
export type AnalyticsEvent =
  | { name: "user.registered"; userId: string }
  | { name: "user.approved"; userId: string }
  | { name: "user.rejected"; userId: string }
  | { name: "location.submitted"; userId: string; locationId: string }
  | { name: "location.published"; locationId: string; awardedPoints: boolean }
  | { name: "location.viewed"; userId?: string; locationId: string }
  | { name: "status_update.posted"; userId: string; locationId: string }
  | { name: "secret.unlocked"; userId: string; locationId: string };

export async function track(event: AnalyticsEvent) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event.name, event);
  }
  // TODO: forward to your analytics destination of choice.
}
