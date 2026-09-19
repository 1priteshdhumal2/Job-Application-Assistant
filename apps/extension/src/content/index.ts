/**
 * JobPilot Content Script (Phase 2D-3 Slice B - Indeed Detection & Job Capture)
 *
 * Responsibilities:
 * - Detect Indeed job postings using @jobpilot/portal-adapters
 * - Mount a single floating "⚡ Apply with JobPilot" badge
 * - Trigger metadata extraction strictly upon explicit user click
 * - Transmit captured metadata via chrome.runtime messaging to background worker
 * - Handle SPA navigation and clean up UI when leaving job pages
 */

import {
  getPortalAdapter,
  indeedPortalAdapter,
} from "@jobpilot/portal-adapters";
import type { ExtensionResponse } from "@jobpilot/types";

const BADGE_ID = "jobpilot-apply-badge-root";

type BadgeState = "idle" | "capturing" | "success" | "error";

interface BadgeConfig {
  state: BadgeState;
  message?: string;
}

let currentBadgeConfig: BadgeConfig = { state: "idle" };
let badgeResetTimer: ReturnType<typeof setTimeout> | null = null;
let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentObservedUrl: string = "";

/**
 * Returns the current active portal adapter for the page, defaulting to Indeed adapter.
 */
function getActiveAdapter() {
  return getPortalAdapter(window.location.href) || indeedPortalAdapter;
}

/**
 * Checks if the current page and DOM represent an active job detail view.
 */
export function isCurrentPageJobPosting(): boolean {
  const adapter = getActiveAdapter();
  return adapter.isJobPage(window.location.href, document);
}

/**
 * Removes the floating badge from the DOM.
 */
export function removeFloatingBadge(): void {
  const existingBadge = document.getElementById(BADGE_ID);
  if (existingBadge) {
    existingBadge.remove();
  }
}

/**
 * Updates or renders the floating badge based on current state.
 */
export function renderFloatingBadge(
  config: BadgeConfig = currentBadgeConfig,
): void {
  currentBadgeConfig = config;

  // If not a job page, ensure badge is removed
  if (!isCurrentPageJobPosting()) {
    removeFloatingBadge();
    return;
  }

  let badgeContainer = document.getElementById(BADGE_ID);
  if (!badgeContainer) {
    badgeContainer = document.createElement("div");
    badgeContainer.id = BADGE_ID;
    badgeContainer.setAttribute("data-testid", "jobpilot-apply-badge");
    badgeContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483640;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      user-select: none;
    `;
    document.body.appendChild(badgeContainer);
  }

  // Render badge content
  let buttonBg = "linear-gradient(135deg, #0ea5e9, #0284c7)";
  let buttonText = "⚡ Apply with JobPilot";
  let buttonDisabled = false;

  if (config.state === "capturing") {
    buttonBg = "linear-gradient(135deg, #64748b, #475569)";
    buttonText = "⏳ Capturing Job...";
    buttonDisabled = true;
  } else if (config.state === "success") {
    buttonBg = "linear-gradient(135deg, #10b981, #059669)";
    buttonText = "✓ Sent to JobPilot Desktop";
    buttonDisabled = true;
  } else if (config.state === "error") {
    buttonBg = "linear-gradient(135deg, #ef4444, #dc2626)";
    buttonText = config.message || "⚠️ Job Details Unavailable";
    buttonDisabled = false;
  }

  badgeContainer.innerHTML = `
    <button
      id="jobpilot-apply-button"
      data-testid="jobpilot-apply-button"
      ${buttonDisabled ? "disabled" : ""}
      style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${buttonBg};
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 10px 18px;
        border-radius: 9999px;
        font-size: 14px;
        font-weight: 600;
        cursor: ${buttonDisabled ? "default" : "pointer"};
        box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.35);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        outline: none;
      "
    >
      ${buttonText}
    </button>
  `;

  const button = badgeContainer.querySelector<HTMLButtonElement>(
    "#jobpilot-apply-button",
  );
  if (button && !buttonDisabled) {
    button.addEventListener("click", handleBadgeClick);
    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 20px 0 rgba(0, 0, 0, 0.45)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "none";
      button.style.boxShadow = "0 4px 14px 0 rgba(0, 0, 0, 0.35)";
    });
  }
}

/**
 * Handles explicit user click on the floating badge.
 */
export async function handleBadgeClick(): Promise<void> {
  const adapter = getActiveAdapter();
  renderFloatingBadge({ state: "capturing" });

  const metadata = adapter.extractJobDetails(document, window.location.href);

  if (!metadata) {
    renderFloatingBadge({
      state: "error",
      message: "⚠️ Job details unavailable",
    });
    scheduleBadgeReset(3500);
    return;
  }

  // Communicate strictly with the background service worker
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.sendMessage
  ) {
    chrome.runtime.sendMessage(
      {
        type: "CAPTURE_JOB_CONTEXT",
        payload: metadata,
      },
      (response: ExtensionResponse | undefined) => {
        if (chrome.runtime.lastError) {
          renderFloatingBadge({
            state: "error",
            message: "⚠️ Extension background unavailable",
          });
          scheduleBadgeReset(4000);
          return;
        }

        if (response?.success) {
          renderFloatingBadge({ state: "success" });
          scheduleBadgeReset(3000);
        } else {
          const errorMsg = response?.error || "⚠️ Failed to send to Desktop";
          renderFloatingBadge({
            state: "error",
            message:
              errorMsg.length > 35
                ? `${errorMsg.substring(0, 32)}...`
                : errorMsg,
          });
          scheduleBadgeReset(4500);
        }
      },
    );
  } else {
    renderFloatingBadge({
      state: "error",
      message: "⚠️ Extension runtime unavailable",
    });
    scheduleBadgeReset(3500);
  }
}

function scheduleBadgeReset(ms: number): void {
  if (badgeResetTimer) {
    clearTimeout(badgeResetTimer);
  }
  badgeResetTimer = setTimeout(() => {
    if (isCurrentPageJobPosting()) {
      renderFloatingBadge({ state: "idle" });
    } else {
      removeFloatingBadge();
    }
  }, ms);
}

/**
 * Evaluates current page and manages badge lifecycle on navigation or DOM changes.
 */
export function handlePageEvaluation(): void {
  const currentUrl = window.location.href;
  if (currentUrl !== currentObservedUrl) {
    currentObservedUrl = currentUrl;
  }

  if (isCurrentPageJobPosting()) {
    // Only re-render if in idle state to avoid clobbering active feedback
    if (currentBadgeConfig.state === "idle") {
      renderFloatingBadge({ state: "idle" });
    }
  } else {
    removeFloatingBadge();
  }
}

/**
 * Initializes SPA observation and initial page check.
 */
export function initContentScript(): void {
  handlePageEvaluation();

  // 1. Observe popstate (browser back/forward)
  window.addEventListener("popstate", handlePageEvaluation);

  // 2. Intercept history API for SPA navigation
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    setTimeout(handlePageEvaluation, 50);
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    origReplaceState.apply(this, args);
    setTimeout(handlePageEvaluation, 50);
  };

  // 3. Lightweight debounced MutationObserver for dynamic React/SPA panel changes
  const observer = new MutationObserver(() => {
    if (mutationDebounceTimer) {
      clearTimeout(mutationDebounceTimer);
    }
    mutationDebounceTimer = setTimeout(() => {
      handlePageEvaluation();
    }, 300);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

// Automatically start if executing in browser context
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContentScript);
  } else {
    initContentScript();
  }
}
