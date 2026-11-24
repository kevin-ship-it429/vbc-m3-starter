import { readFile, appendFile, writeFile } from "fs/promises";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "data", "seed-requests.csv");

// Parse CSV text into an array of rows (each row is an array of strings).
// Handles quoted fields containing commas, escaped quotes (""), and
// both Windows (\r\n) and Unix (\n) line endings.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Last line may not end with a newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop blank lines.
  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

// Load all requests from the seed CSV, assign ids, and return newest first.
// Ids follow file order (oldest = 1), so they stay the same on every load.
export async function getAllRequests() {
  let text = await readFile(CSV_PATH, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM if present

  const [header, ...dataRows] = parseCsv(text);
  const columns = header.map((name) => name.trim());

  const requests = dataRows.map((values, index) => {
    const record = { id: index + 1 };
    columns.forEach((column, i) => {
      record[column] = (values[i] ?? "").trim();
    });
    return record;
  });

  return requests.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

// Wrap a value in quotes if it contains a comma, quote, or line break,
// doubling any quotes inside — so it can't break the CSV columns.
export function toCsvField(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

// Append a new request as a row at the end of the CSV and return it with its id.
export async function addRequest({ requester_name, location, description, priority }) {
  const record = {
    // Match the seed format: no milliseconds, e.g. 2026-11-23T15:04:00Z
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    requester_name,
    location,
    description,
    priority,
    status: "New",
  };

  const row = [
    record.created_at,
    record.requester_name,
    record.location,
    record.description,
    record.priority,
    record.status,
  ]
    .map(toCsvField)
    .join(",");

  // Make sure the new row starts on its own line, using the file's CRLF style.
  const existing = await readFile(CSV_PATH, "utf8");
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\r\n" : "";
  await appendFile(CSV_PATH, prefix + row + "\r\n", "utf8");

  // Ids follow file order, so the new row's id is the new total count.
  const all = await getAllRequests();
  return { id: all.length, ...record };
}

// Change one request's status and rewrite the CSV.
// Returns the updated request, or null if no request has that id.
export async function updateRequestStatus(id, status) {
  let text = await readFile(CSV_PATH, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const [header, ...dataRows] = parseCsv(text);
  const columns = header.map((name) => name.trim());

  // Ids follow file order: id 1 is the first data row.
  const index = id - 1;
  if (!Number.isInteger(id) || index < 0 || index >= dataRows.length) {
    return null;
  }

  const statusColumn = columns.indexOf("status");
  dataRows[index][statusColumn] = status;

  const output =
    [header, ...dataRows]
      .map((row) => row.map(toCsvField).join(","))
      .join("\r\n") + "\r\n";
  await writeFile(CSV_PATH, output, "utf8");

  const record = { id };
  columns.forEach((column, i) => {
    record[column] = (dataRows[index][i] ?? "").trim();
  });
  return record;
}
