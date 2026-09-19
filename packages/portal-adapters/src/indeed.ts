import type { ExtractedJobMetadata, PortalAdapter } from "./types.js";

/**
 * Normalizes multi-line whitespace and consecutive spaces into single spaces.
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Helper to safely query text content from an unknown DOM document/node.
 */
interface QueryableNode {
  querySelector(selector: string): {
    textContent?: string | null;
    innerText?: string | null;
    getAttribute?(attr: string): string | null;
  } | null;
  querySelectorAll?(selector: string): ArrayLike<{
    textContent?: string | null;
    innerText?: string | null;
    getAttribute?(attr: string): string | null;
  }>;
}

function isQueryable(doc: unknown): doc is QueryableNode {
  return (
    typeof doc === "object" &&
    doc !== null &&
    typeof (doc as QueryableNode).querySelector === "function"
  );
}

export class IndeedPortalAdapter implements PortalAdapter {
  public readonly code = "indeed";
  public readonly name = "Indeed";
  public readonly baseUrl = "https://www.indeed.com";
  public readonly supportedHostnames = Object.freeze([
    "indeed.com",
    "www.indeed.com",
    "indeed.co.uk",
    "www.indeed.co.uk",
    "indeed.ca",
    "www.indeed.ca",
    "in.indeed.com",
    "indeed.co.in",
    "fr.indeed.com",
    "de.indeed.com",
    "au.indeed.com",
  ]);

  /**
   * Determines if the given URL or current DOM represents an Indeed job posting.
   */
  public isJobPage(url: string, document?: unknown): boolean {
    if (!url) return false;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isIndeedDomain =
      hostname === "indeed.com" ||
      hostname.endsWith(".indeed.com") ||
      hostname.endsWith(".indeed.co.uk") ||
      hostname.endsWith(".indeed.ca") ||
      hostname.endsWith(".indeed.co.in");

    if (!isIndeedDomain) {
      return false;
    }

    // 1. URL search params check (jk or vjk)
    if (parsedUrl.searchParams.has("jk") || parsedUrl.searchParams.has("vjk")) {
      return true;
    }

    // 2. Specific job URL paths
    const pathname = parsedUrl.pathname.toLowerCase();
    if (
      pathname.startsWith("/viewjob") ||
      pathname.startsWith("/rc/clk") ||
      pathname.startsWith("/job/") ||
      pathname.includes("/viewjob")
    ) {
      return true;
    }

    // 3. DOM fallback check (SPA search pane or detailed job view)
    if (isQueryable(document)) {
      const hasJobHeader =
        Boolean(
          document.querySelector(
            "[data-testid='jobsearch-JobInfoHeader-title']",
          ),
        ) ||
        Boolean(document.querySelector("h1.jobsearch-JobInfoHeader-title")) ||
        Boolean(document.querySelector("#jobDescriptionText")) ||
        Boolean(document.querySelector("[data-jk]"));
      if (hasJobHeader) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extracts the canonical Indeed external job ID (e.g. jk/vjk).
   */
  public extractExternalJobId(url: string, document?: unknown): string | null {
    // 1. Try URL search params
    try {
      const parsedUrl = new URL(url);
      const vjk = parsedUrl.searchParams.get("vjk");
      if (vjk && vjk.trim()) return vjk.trim();

      const jk = parsedUrl.searchParams.get("jk");
      if (jk && jk.trim()) return jk.trim();

      // Check regex in pathname (e.g. /job/...-1234567890abcdef)
      const pathMatch = parsedUrl.pathname.match(/([a-fA-F0-9]{16})/);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
    } catch {
      // Ignore URL parse failures and fallback to DOM
    }

    // 2. Try DOM attributes
    if (isQueryable(document)) {
      const dataJkEl = document.querySelector("[data-jk]");
      const dataJk = dataJkEl?.getAttribute?.("data-jk");
      if (dataJk && dataJk.trim()) {
        return dataJk.trim();
      }

      const jobKeyEl = document.querySelector("[data-jobkey]");
      const jobKey = jobKeyEl?.getAttribute?.("data-jobkey");
      if (jobKey && jobKey.trim()) {
        return jobKey.trim();
      }

      const jobIdEl = document.querySelector("[data-job-id]");
      const jobId = jobIdEl?.getAttribute?.("data-job-id");
      if (jobId && jobId.trim()) {
        return jobId.trim();
      }
    }

    return null;
  }

  /**
   * Extracts complete job metadata from the active Indeed page.
   * Returns null if any required field is missing or invalid.
   */
  public extractJobDetails(
    document: unknown,
    url: string,
  ): ExtractedJobMetadata | null {
    if (!isQueryable(document)) {
      return null;
    }

    const externalJobId = this.extractExternalJobId(url, document);
    if (!externalJobId) {
      return null;
    }

    // 1. Extract Job Title
    const titleSelectors = [
      "[data-testid='jobsearch-JobInfoHeader-title']",
      "h1.jobsearch-JobInfoHeader-title",
      "h1[class*='jobsearch-JobInfoHeader-title']",
      "h2.jobTitle",
      "[data-testid='simpler-job-title']",
      ".jobsearch-JobInfoHeader-title",
      "h1.jobTitle",
      "h1",
    ];

    let rawTitle = "";
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || el?.innerText;
      if (text && text.trim()) {
        rawTitle = text;
        break;
      }
    }

    let title = normalizeText(rawTitle);
    // Remove trailing "- job post" if present
    title = title.replace(/\s*-\s*job post$/i, "").trim();

    if (!title) {
      return null;
    }

    // 2. Extract Company Name
    const companySelectors = [
      "[data-testid='inlineHeader-companyName']",
      "[data-testid='jobsearch-CompanyInfoContainer'] [data-testid='inlineHeader-companyName']",
      "[data-company-name='true']",
      ".jobsearch-InlineCompanyRating div",
      ".jobsearch-CompanyInfoContainer a",
      "[data-testid='jobsearch-CompanyInfoContainer'] a",
      ".jobsearch-InlineCompanyRating",
      "[data-testid='company-name']",
    ];

    let rawCompany = "";
    for (const selector of companySelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || el?.innerText;
      if (text && text.trim()) {
        rawCompany = text;
        break;
      }
    }

    const company = normalizeText(rawCompany);
    if (!company) {
      return null;
    }

    // 3. Extract Location
    const locationSelectors = [
      "[data-testid='inlineHeader-companyLocation']",
      "[data-testid='jobsearch-JobInfoHeader-companyLocation']",
      ".jobsearch-JobInfoHeader-companyLocation",
      "[data-testid='job-location']",
      "#jobLocationText",
      "div[data-testid='inlineHeader-companyLocation'] div",
    ];

    let rawLocation = "";
    for (const selector of locationSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || el?.innerText;
      if (text && text.trim()) {
        rawLocation = text;
        break;
      }
    }

    const location = normalizeText(rawLocation);
    if (!location) {
      return null;
    }

    // 4. Extract Description (Optional)
    const descriptionSelectors = [
      "#jobDescriptionText",
      "[data-testid='jobDescriptionText']",
      ".jobsearch-jobDescriptionText",
    ];

    let rawDescription = "";
    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent || el?.innerText;
      if (text && text.trim()) {
        rawDescription = text;
        break;
      }
    }

    const description = rawDescription.trim()
      ? normalizeText(rawDescription)
      : undefined;

    return {
      portal: "indeed",
      externalJobId,
      url,
      title,
      company,
      location,
      description,
      portalCode: "indeed",
      jobUrl: url,
    };
  }
}

export const indeedPortalAdapter = new IndeedPortalAdapter();
