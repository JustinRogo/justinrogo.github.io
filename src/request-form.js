// Shared by the V2 Tools page and the original homepage. Submissions go to the
// Vercel API route (api/requests.mjs), which saves them to Supabase.
const PRODUCTION_ENDPOINT = "https://justinrogo.vercel.app/api/requests";
const LOCAL_API_PORT = "4388"; // npm run dev (scripts/serve-updates.mjs)

// Keep in step with lib/requests.mjs and the Supabase migration.
export const requestLimits = { name: 100, email: 254, subject: 150, details: 5000 };

export function requestEndpoint(loc = globalThis.location) {
  const host = loc?.hostname || "";
  // Same origin on Vercel and on the local API server.
  if (host.endsWith(".vercel.app") || ((host === "127.0.0.1" || host === "localhost") && loc.port === LOCAL_API_PORT)) {
    return "/api/requests";
  }
  // Other local previews use the local API server, so testing never writes to production.
  if (host === "127.0.0.1" || host === "localhost") return `http://127.0.0.1:${LOCAL_API_PORT}/api/requests`;
  return PRODUCTION_ENDPOINT;
}

/**
 * Sends the form's fields. `startedAt` is when the form was shown (spam timing check).
 * Resolves on success; rejects with an Error whose message is safe to show.
 */
export async function submitRequest(form, startedAt) {
  const field = (name) => form.elements[name]?.value ?? "";
  const payload = {
    name: field("name"),
    email: field("email"),
    subject: field("subject"),
    details: field("details"),
    website: field("website"),
    elapsed: Math.round(performance.now() - startedAt),
  };
  let response;
  try {
    response = await fetch(requestEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
    });
  } catch {
    throw new Error("Your request couldn’t be sent. Check your connection and try again.");
  }
  if (response.ok) return;
  const message = await response.json().then((data) => data?.error, () => null);
  throw new Error(message || "Your request couldn’t be sent. Please try again.");
}
