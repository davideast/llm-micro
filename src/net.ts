/**
 * Makes HTTP POST request
 * Showcases: Fetch API - modern promise-based HTTP with clean options object
 */
export async function post(url: URL, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}
