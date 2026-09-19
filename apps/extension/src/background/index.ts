import { ExtensionBridgeClient } from "./bridge-client.js";
import {
  ExtensionMessage,
  ExtensionResponse,
  CapturedJobPayload,
} from "@jobpilot/types";

const bridgeClient = new ExtensionBridgeClient();

console.info("[JobPilot Background] Service worker initialized");

// Listen for internal extension messages (from popup or content script)
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExtensionResponse) => void,
    ) => {
      handleExtensionMessage(message)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          }),
        );
      return true; // Keep channel open for async response
    },
  );
}

function validateJobPayload(
  payload: unknown,
): { valid: true; job: CapturedJobPayload } | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid job payload: expected object" };
  }

  const p = payload as Partial<CapturedJobPayload>;

  if (!p.portal || typeof p.portal !== "string" || !p.portal.trim()) {
    return { valid: false, error: "Job portal is required" };
  }

  if (
    !p.externalJobId ||
    typeof p.externalJobId !== "string" ||
    !p.externalJobId.trim()
  ) {
    return { valid: false, error: "External Job ID is required" };
  }

  if (!p.url || typeof p.url !== "string" || !p.url.trim()) {
    return { valid: false, error: "Job URL is required" };
  }

  try {
    new URL(p.url);
  } catch {
    return { valid: false, error: "Job URL is not a valid URL format" };
  }

  if (!p.title || typeof p.title !== "string" || !p.title.trim()) {
    return { valid: false, error: "Job title is required" };
  }

  if (!p.company || typeof p.company !== "string" || !p.company.trim()) {
    return { valid: false, error: "Company name is required" };
  }

  if (!p.location || typeof p.location !== "string" || !p.location.trim()) {
    return { valid: false, error: "Job location is required" };
  }

  if (p.description !== undefined && typeof p.description !== "string") {
    return {
      valid: false,
      error: "Job description must be a string if provided",
    };
  }

  return {
    valid: true,
    job: {
      portal: p.portal.trim(),
      externalJobId: p.externalJobId.trim(),
      url: p.url.trim(),
      title: p.title.trim(),
      company: p.company.trim(),
      location: p.location.trim(),
      description: p.description ? p.description.trim() : undefined,
      capturedAt: p.capturedAt || new Date().toISOString(),
    },
  };
}

export async function handleExtensionMessage(
  message: ExtensionMessage,
  client: ExtensionBridgeClient = bridgeClient,
): Promise<ExtensionResponse> {
  switch (message.type) {
    case "CHECK_CONNECTION": {
      try {
        const health = await client.checkHealth();
        return { success: true, data: health };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Cannot connect to JobPilot Desktop Bridge on 127.0.0.1:4173",
        };
      }
    }

    case "PAIR_BRIDGE": {
      const { pairingCode } = (message.payload || {}) as {
        pairingCode?: string;
      };
      if (!pairingCode) {
        return { success: false, error: "Pairing code is required" };
      }
      try {
        const pairResult = await client.pair(pairingCode);
        return { success: pairResult.success, data: pairResult };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to pair with Desktop",
        };
      }
    }

    case "GET_BRIDGE_STATUS": {
      try {
        const status = await client.getStatus();
        return { success: true, data: status };
      } catch (err: unknown) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to get bridge status",
        };
      }
    }

    case "CAPTURE_JOB_CONTEXT": {
      const validation = validateJobPayload(message.payload);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      try {
        const result = await client.captureJob(validation.job);
        return { success: true, data: result };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to forward captured job to JobPilot Desktop";
        return { success: false, error: errorMsg };
      }
    }

    default:
      return {
        success: false,
        error: `Unhandled message type: ${message.type}`,
      };
  }
}
