import type { PortalAdapter } from "./types.js";
import { indeedPortalAdapter } from "./indeed.js";

const registeredAdapters: PortalAdapter[] = [indeedPortalAdapter];

/**
 * Returns the matching PortalAdapter for a given URL, or null if unsupported.
 */
export function getPortalAdapter(url: string): PortalAdapter | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    for (const adapter of registeredAdapters) {
      const matchesHostname = adapter.supportedHostnames.some(
        (supported) =>
          hostname === supported ||
          hostname.endsWith(`.${supported}`) ||
          hostname.endsWith(`.${adapter.code}.com`),
      );
      if (matchesHostname) {
        return adapter;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Returns all currently registered portal adapters.
 */
export function getAllPortalAdapters(): readonly PortalAdapter[] {
  return registeredAdapters;
}
