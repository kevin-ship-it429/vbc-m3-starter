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

// Spreadsheet apps (Excel, Google Sheets) treat a cell starting with
// = + - @ (or a tab/carriage return) as a formula. A request like
// =HYPERLINK("https://evil.example", "Click") would become a live link.
// Prefixing a ' makes the spreadsheet show the text as plain text.
// Only the export is changed; the saved data stays exactly as entered.
function neutralizeFormula(value) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

// GET /api/export — download every request (newest first) as a CSV file.
export async function GET() {
  try {
    const requests = await getAllRequests();

    const lines = [
      COLUMNS.join(","),
      ...requests.map((r) =>
        COLUMNS.map((c) => toCsvField(neutralizeFormula(r[c]))).join(",")
      ),
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
