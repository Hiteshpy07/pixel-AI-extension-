// Ensure process polyfill for browser content script environment
if (typeof window !== "undefined") {
  window.process = window.process || { env: { NODE_ENV: "production" } };
}

import React from "react";
import ReactDOM from "react-dom/client";
import FloatingPixelAssistant from "./components/FloatingPixelAssistant";
import cssText from "./index.css?inline";

function initPixelExtension() {
  // Prevent duplicate mounts on SPAs or navigation
  if (document.getElementById("pixel-assistant-host-root")) {
    return;
  }

  // Ensure DOM container exists
  const parent = document.body || document.documentElement;
  if (!parent) return;

  // 1. Create Host Element attached to page
  const host = document.createElement("div");
  host.id = "pixel-assistant-host-root";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "0";
  host.style.height = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";
  parent.appendChild(host);

  // 2. Create Shadow Root for complete CSS isolation
  const shadow = host.attachShadow({ mode: "open" });

  // 3. Inject Tailwind CSS into Shadow DOM
  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  // 4. Create Mount Container
  const mountPoint = document.createElement("div");
  mountPoint.id = "pixel-mount-point";
  mountPoint.style.pointerEvents = "auto";
  shadow.appendChild(mountPoint);

  // 5. Mount React Application
  const root = ReactDOM.createRoot(mountPoint);
  root.render(<FloatingPixelAssistant isExtension={true} />);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPixelExtension);
} else {
  initPixelExtension();
}

// Watch for SPA page navigation (e.g. YouTube, Twitter, GitHub client routing)
window.addEventListener("popstate", () => {
  setTimeout(initPixelExtension, 300);
});

// Observe DOM to re-attach if removed by dynamic SPA resets
if (typeof MutationObserver !== "undefined") {
  const observer = new MutationObserver(() => {
    if (!document.getElementById("pixel-assistant-host-root")) {
      initPixelExtension();
    }
  });

  const target = document.documentElement || document.body;
  if (target) {
    observer.observe(target, { childList: true });
  }
}
