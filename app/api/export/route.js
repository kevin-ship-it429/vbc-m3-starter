import { getAllRequests, toCsvField } from "../../../lib/requests";

const COLUMNS = [
  "id",
  "created_at",
  "requester_name",
  "location",
  "description",
  "priority",
  "status",
];

// GET /api/export — download every request (newest first) as a CSV file.
export async function GET() {
  try {
    const requests = await getAllRequests();

    const lines = [
      COLUMNS.join(","),
      ...requests.map((r) => COLUMNS.map((c) => toCsvField(r[c])).join(",")),
    ];
    // Leading BOM so Excel reads the em dash and other characters as UTF-8.
    const csv = "﻿" + lines.join("\r\n") + "\r\n";

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="morrowlane-requests.csv"',
      },
    });
  } catch (error) {
    console.error("GET /api/export failed:", error);
    return Response.json(
      { error: "Could not export requests. Please try again." },
      { status: 500 }
    );
  }
}
