/**
 * Universal API Fetcher for Pixel AI
 * When running inside a Chrome Extension content script on an HTTPS site (e.g. YouTube, GitHub),
 * direct fetch() to http://localhost:5001 is blocked by browser Mixed Content security.
 * This helper automatically proxies the call through background.js (which has elevated privileges),
 * while falling back to native fetch() during local web development (http://localhost:5173).
 */
export async function apiFetch(url, options = {}) {
  // 1. Chrome Extension context -> proxy via background worker
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.sendMessage
  ) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "PIXEL_API_REQUEST",
          url,
          options: {
            method: options.method || "GET",
            headers: options.headers || {},
            body: options.body,
          },
        },
        (res) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!res) {
            return reject(new Error("No response from extension background"));
          }
          if (!res.ok) {
            return reject(new Error(res.error || `HTTP ${res.status}`));
          }
          resolve(res.data);
        }
      );
    });
  }

  // 2. Regular browser web app context (localhost:5173)
  const res = await fetch(url, options);
  if (!res.ok) {
    const errPayload = await res.json().catch(() => ({}));
    throw new Error(errPayload.detail || `Server returned ${res.status}`);
  }
  return res.json();
}
