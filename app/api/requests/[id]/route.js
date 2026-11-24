import { updateRequestStatus } from "../../../../lib/requests";
import { rateLimit } from "../../../../lib/rateLimit";

const STATUSES = ["New", "In Progress", "Complete"];

// PATCH /api/requests/[id] — update one request's status.
export async function PATCH(request, { params }) {
  try {
    const limited = await rateLimit(request, "patch");
    if (limited) return limited;

    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id < 1) {
      return Response.json(
        { error: `No request found with id "${rawId}".` },
        { status: 404 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "The request body must be valid JSON." },
        { status: 400 }
      );
    }

    const status = typeof body?.status === "string" ? body.status.trim() : "";
    if (!STATUSES.includes(status)) {
      return Response.json(
        { error: "Status must be New, In Progress, or Complete." },
        { status: 400 }
      );
    }

    const updated = await updateRequestStatus(id, status);
    if (!updated) {
      return Response.json(
        { error: `No request found with id ${id}.` },
        { status: 404 }
      );
    }

    return Response.json({ request: updated }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/requests/[id] failed:", error);
    return Response.json(
      { error: "Could not update that status. Please try again." },
      { status: 500 }
    );
  }
}
