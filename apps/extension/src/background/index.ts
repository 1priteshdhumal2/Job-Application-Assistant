import { ExtensionBridgeClient } from "./bridge-client.js";
import { ExtensionMessage, ExtensionResponse } from "@jobpilot/types";

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

    default:
      return {
        success: false,
        error: `Unhandled message type: ${message.type}`,
      };
  }
}
