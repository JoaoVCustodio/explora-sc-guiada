import { z } from "zod";
import { pendingSchema } from "../credits/pending.ts";
import { normalizeItineraryResponse } from "./schema.ts";
import type { Itinerary } from "./types.ts";
import type { PendingGeneration } from "../credits/pending.ts";

export type ItineraryDraft = PendingGeneration & { itinerary: Itinerary };

const draftSchema = pendingSchema.extend({ itinerary: z.unknown() });
const key = (userId: string) => `explorasc:itinerary-draft:${userId}`;

const parseDraft = (value: unknown): ItineraryDraft => {
  const draft = draftSchema.parse(value);
  return {
    ...draft,
    itinerary: normalizeItineraryResponse(draft.itinerary, draft.input.days),
  };
};

export function readDraft(userId: string): ItineraryDraft | null {
  try {
    const stored = localStorage.getItem(key(userId));
    return stored ? parseDraft(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function writeDraft(userId: string, draft: ItineraryDraft): void {
  // Keep the pending request available for replay if storage fails.
  localStorage.setItem(key(userId), JSON.stringify(parseDraft(draft)));
}
