/**
 * JobPilot Content Script (Phase 2D-3 Slice A)
 *
 * Runs inside matching portal pages (e.g. https://*.indeed.com/*).
 * In Slice A, confirms content script injection and communication readiness with background service worker.
 */

import type { ExtensionResponse } from "@jobpilot/types";

console.info(
  "[JobPilot Content] Content script active on:",
  window.location.href,
);

// Ping background worker to verify extension connection
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.sendMessage
) {
  chrome.runtime.sendMessage(
    { type: "CHECK_CONNECTION" },
    (response: ExtensionResponse | undefined) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[JobPilot Content] Background worker unreachable:",
          chrome.runtime.lastError.message,
        );
        return;
      }
      if (response?.success) {
        console.info(
          "[JobPilot Content] JobPilot Desktop Bridge verified connected:",
          response.data,
        );
      } else {
        console.info(
          "[JobPilot Content] JobPilot Desktop Bridge not currently connected:",
          response?.error,
        );
      }
    },
  );
}
