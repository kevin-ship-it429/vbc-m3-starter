import { getAllRequests } from "../../../lib/requests";

// "2026-08-28T17:45:00Z" -> "2026-08" (year-month in UTC)
function monthKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 7);
}

// GET /api/summary — numbers for the three tiles at the top of the page.
export async function GET() {
  try {
    const requests = await getAllRequests();

    const open = requests.filter((r) => r.status !== "Complete");
    const urgentOpen = open.filter((r) => r.priority === "Urgent");

    // "This month" = the month of the most recent request in the data,
    // not today's date. getAllRequests() is newest first, so that's [0].
    let completedThisMonth = 0;
    if (requests.length > 0) {
      const latestMonth = monthKey(requests[0].created_at);
      completedThisMonth = requests.filter(
        (r) => r.status === "Complete" && monthKey(r.created_at) === latestMonth
      ).length;
    }

    return Response.json(
      {
        open_requests: open.length,
        urgent_open: urgentOpen.length,
        completed_this_month: completedThisMonth,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/summary failed:", error);
    return Response.json(
      { error: "Could not load the summary. Please try again." },
      { status: 500 }
    );
  }
}
