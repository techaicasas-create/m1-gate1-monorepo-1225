export async function onRequest(context) {
  const api = context.env.API_BASE_URL || "";
  const body = `window.__APP_CONFIG__ = { API_BASE_URL: ${JSON.stringify(api)} };`;
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
