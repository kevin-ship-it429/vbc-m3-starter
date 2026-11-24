import { createClient } from "@supabase/supabase-js";

// Requests are stored in the Supabase "requests" table (see supabase/setup.sql).
// The CSV file can't be used for storage once deployed: Netlify runs the API as
// serverless functions whose files are read-only and temporary.

const COLUMNS = "id, created_at, requester_name, location, description, priority, status";

let client = null;

// Create the Supabase client on first use, with a clear error if keys are missing.
function db() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in .env.local (local) " +
        "and in Netlify's environment variables (live site)."
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

// Supabase returns "2026-08-28T17:45:00+00:00"; keep the same
// "2026-08-28T17:45:00Z" format the app has used all along.
function normalize(row) {
  return {
    ...row,
    created_at: new Date(row.created_at).toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
}

// All requests, newest first.
export async function getAllRequests() {
  const { data, error } = await db()
    .from("requests")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return data.map(normalize);
}

// Save a new request (status "New") and return it with its database id.
export async function addRequest({ requester_name, location, description, priority }) {
  const { data, error } = await db()
    .from("requests")
    .insert({ requester_name, location, description, priority, status: "New" })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return normalize(data);
}

// Change one request's status. Returns the updated request, or null if no
// request has that id.
export async function updateRequestStatus(id, status) {
  const { data, error } = await db()
    .from("requests")
    .update({ status })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
  return data ? normalize(data) : null;
}

// Wrap a value in quotes if it contains a comma, quote, or line break,
// doubling any quotes inside, so it can't break the CSV columns.
// Used by the CSV export.
export function toCsvField(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}
