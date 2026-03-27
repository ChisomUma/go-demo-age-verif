import type {
  InteractionFetchResponse,
  JourneyStartResponse,
  JourneyStateResponse,
  SubmitPayload,
} from "./types";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(
      `Server returned ${res.status} with non-JSON response`,
      res.status,
    );
  }

  if (!res.ok) {
    const msg =
      (data as Record<string, string>)?.message ??
      (data as Record<string, string>)?.error ??
      "Request failed";
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Starts a new journey and returns the instanceId. */
export async function startJourney(resourceId: string, documentImage?: string) {
  return request<JourneyStartResponse>("/api/journey/start", {
    resourceId,
    ...(documentImage ? { documentImage } : {}),
  });
}

/** Fetches the current interaction (pages, cards, outstanding elements). */
export async function fetchInteraction(instanceId: string) {
  return request<InteractionFetchResponse>("/api/journey/fetch", {
    instanceId,
  });
}

/** Submits collected domain element data for the current interaction. */
export async function submitInteraction(payload: SubmitPayload) {
  return request<{ status: string }>("/api/journey/submit", payload);
}

/** Fetches journey state (status, results). */
export async function fetchJourneyState(instanceId: string) {
  return request<JourneyStateResponse>("/api/journey/state", { instanceId });
}

/**
 * Polls interaction/fetch until an interaction appears or journey completes.
 * Uses 3-second intervals with a 60-second timeout.
 */
export async function pollForInteraction(
  instanceId: string,
  signal?: AbortSignal,
): Promise<InteractionFetchResponse> {
  const POLL_INTERVAL = 3000;
  const TIMEOUT = 60_000;
  const start = Date.now();

  while (Date.now() - start < TIMEOUT) {
    if (signal?.aborted) throw new Error("Polling aborted");

    try {
      const response = await fetchInteraction(instanceId);

      // If we got an interaction back, return it
      if (response.interactionId) return response;

      // If journey is no longer in progress, return whatever we got
      if (response.journey?.status !== "InProgress") return response;
    } catch (err) {
      // On error, wait and retry (the backend may still be processing)
      if (err instanceof ApiError && err.status >= 500) {
        console.warn("Server error during poll, retrying...", err.message);
      } else {
        throw err;
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error("Polling timed out waiting for interaction");
}
