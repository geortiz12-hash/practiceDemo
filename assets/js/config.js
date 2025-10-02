/**
 * API base configuration.
 * - Defaults to localhost for local development.
 * - You can override at runtime by setting window.API_BASE before this script loads,
 *   or by adding ?api=https://your-server-url to the URL.
 */
(function () {
  const urlParam = new URLSearchParams(location.search).get("api");
  const hinted = (typeof window !== "undefined" && window.API_BASE) ? window.API_BASE : null;

  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname) || location.origin === "null" || location.protocol === "file:";

  const defaultLocal = "http://localhost:3000";
  // TODO: Replace this with your deployed server base URL (e.g., Render / Railway)
  const defaultProd  = "https://REPLACE_WITH_YOUR_SERVER_URL";

  const base = urlParam || hinted || (isLocal ? defaultLocal : defaultProd);
  window.API_BASE = base;
  console.log("[TranscriptEase] API_BASE =", window.API_BASE);
})();