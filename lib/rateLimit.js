import { createHash } from "crypto";
import { db } from "./requests";

// Write limits per visitor (by IP address), per rolling 60 seconds.
// Generous for a coordinator working normally; stops scripted floods.
export const LIMITS = {
  post: { limit: 5, windowSeconds: 60, label: "new requests" },
  patch: { limit: 15, windowSeconds: 60, label: "status changes" },
};

// Netlify puts the visitor's real IP in x-nf-client-connection-ip.
// Fall back to x-forwarded-for, then "local" for the dev server.
function clientIp(request) {
  const headers = request.headers;
  return (
    headers.get("x-nf-client-connection-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "local"
  );
}

// Returns null if allowed, or a 429 Response if the visitor is over the limit.
export async function rateLimit(request, action) {
  const { limit, windowSeconds, label } = LIMITS[action];

  // Hash the IP so the database never stores raw addresses.
  const visitor = createHash("sha256").update(clientIp(request)).digest("hex").slice(0, 32);

  try {
    const { data: allowed, error } = await db().rpc("check_rate_limit", {
      p_key: `${action}:${visitor}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;

    if (allowed === false) {
      return Response.json(
        {
          error: `Too many ${label} in a short time (limit ${limit} per minute). Please wait a minute and try again.`,
        },
        { status: 429, headers: { "Retry-After": String(windowSeconds) } }
      );
    }
    return null;
  } catch (error) {
    // If the limiter itself breaks (e.g. rate-limit.sql not run yet), log it
    // but let the request through, so a limiter problem can't take the app down.
    console.error("Rate limit check failed (allowing request):", error);
    return null;
  }
}
