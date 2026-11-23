/**
 * Shared frontend HTTP client.
 * Provides consistent credentials, JSON handling and safe errors.
 */
export async function request(url, options = {}) {
  const headers = {
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin"
    });
  } catch {
    throw new Error("Network error. Please check your connection and try again.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Request failed. Please try again.");
  }
  return data;
}
