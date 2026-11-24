import { getAllRequests, addRequest, findOpenDuplicate } from "../../../lib/requests";

// GET /api/requests — every request, newest first.
export async function GET() {
  try {
    const requests = await getAllRequests();
    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("GET /api/requests failed:", error);
    return Response.json(
      { error: "Could not load requests. Please try again." },
      { status: 500 }
    );
  }
}

const LOCATIONS = ["Minneapolis", "Chicago", "Denver", "Austin"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;

const FIELD_LABELS = {
  requester_name: "Requester name",
  location: "Location",
  description: "Description",
  priority: "Priority",
};

// Returns a plain-English error message, or null if everything is valid.
// Runs on the server so it applies even when someone skips the form.
function validateRequest(fields) {
  const missing = Object.keys(FIELD_LABELS)
    .filter((key) => fields[key] === "")
    .map((key) => FIELD_LABELS[key]);

  if (missing.length === 1) {
    return `${missing[0]} is required.`;
  }
  if (missing.length > 1) {
    const last = missing.pop();
    return `Please fill in all fields: ${missing.join(", ")} and ${last} are required.`;
  }
  if (!LOCATIONS.includes(fields.location)) {
    return "Location must be Minneapolis, Chicago, Denver, or Austin.";
  }
  if (!PRIORITIES.includes(fields.priority)) {
    return "Priority must be Low, Medium, High, or Urgent.";
  }
  if (fields.requester_name.length > MAX_NAME) {
    return `Requester name must be ${MAX_NAME} characters or fewer (it is ${fields.requester_name.length}).`;
  }
  if (fields.description.length > MAX_DESCRIPTION) {
    return `Description must be ${MAX_DESCRIPTION} characters or fewer (it is ${fields.description.length}).`;
  }
  return null;
}

// POST /api/requests — validate, check for an open duplicate, then save.
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "The request body must be valid JSON." },
        { status: 400 }
      );
    }

    const clean = (value) => (typeof value === "string" ? value.trim() : "");

    const fields = {
      requester_name: clean(body?.requester_name),
      location: clean(body?.location),
      description: clean(body?.description),
      priority: clean(body?.priority),
    };

    const error = validateRequest(fields);
    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    const duplicate = await findOpenDuplicate(fields);
    if (duplicate) {
      return Response.json(
        {
          error:
            `This looks like a duplicate of request #${duplicate.id} ` +
            `(same requester, location, and description), which is still ` +
            `${duplicate.status}. Update that request instead of submitting it again.`,
        },
        { status: 409 }
      );
    }

    const saved = await addRequest(fields);

    return Response.json({ request: saved }, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests failed:", error);
    return Response.json(
      { error: "Could not save the request. Please try again." },
      { status: 500 }
    );
  }
}
