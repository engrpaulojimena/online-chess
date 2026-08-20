export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const contentType = response.headers.get('content-type') || 'unknown';
      const looksLikeHtml = text.trimStart().startsWith('<');
      const detail = looksLikeHtml
        ? 'Next.js returned an HTML page instead of JSON. The API route may be missing or the server may have a compile/runtime error.'
        : `Server returned non-JSON content (${contentType}).`;
      throw new Error(`${detail} Request: ${options.method || 'GET'} ${url} — HTTP ${response.status}. Check the terminal running npm run dev.`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: HTTP ${response.status}`);
  }

  return data;
}
