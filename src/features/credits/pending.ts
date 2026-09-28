import { z } from "zod";
import { isCalendarDate } from "../../../supabase/functions/_shared/calendar-date.mjs";
const pendingSchema = z.object({
  id: z.string().uuid(),
  input: z.object({ startDate: z.string().refine(isCalendarDate).optional(), preferences: z.string().max(300), days: z.number().int().min(1).max(7), interests: z.array(z.string()), regions: z.array(z.string()).min(1) }),
});
export type PendingGeneration = z.infer<typeof pendingSchema>;
const key = (userId: string) => `explorasc:pending-generation:${userId}:`;
export function readPending(userId: string): PendingGeneration | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const itemKey = localStorage.key(i);
      if (!itemKey?.startsWith(key(userId))) continue;
      try {
        const parsed = pendingSchema.safeParse(JSON.parse(localStorage.getItem(itemKey) ?? "null"));
        if (parsed.success) return parsed.data;
      } catch { /* Ignore a corrupt entry, but keep looking for other requests. */ }
    }
  } catch { /* Storage is unavailable. Starting a new request will fail safely. */ }
  return null;
}
export function writePending(userId: string, pending: PendingGeneration) {
  // Persist before sending: if storage is unavailable, do not start a chargeable request.
  localStorage.setItem(key(userId) + pending.id, JSON.stringify(pending));
}
export function clearPending(userId: string, requestId: string) {
  // Each tab removes only its own request, never another tab's active reservation.
  try { localStorage.removeItem(key(userId) + requestId); } catch { /* Replay remains safe. */ }
}
