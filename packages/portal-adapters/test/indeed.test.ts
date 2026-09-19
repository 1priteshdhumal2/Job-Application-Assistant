import { describe, it, expect } from "vitest";
import { indeedPortalAdapter } from "../src/indeed.js";
import { getPortalAdapter } from "../src/registry.js";

describe("IndeedPortalAdapter", () => {
  describe("URL & Domain Detection", () => {
    it("matches indeed.com viewjob URLs with jk parameter", () => {
      const url = "https://www.indeed.com/viewjob?jk=abcdef1234567890";
      expect(indeedPortalAdapter.isJobPage(url)).toBe(true);
    });

    it("matches search results with vjk parameter", () => {
      const url =
        "https://www.indeed.com/jobs?q=engineer&l=Remote&vjk=9876543210fedcba";
      expect(indeedPortalAdapter.isJobPage(url)).toBe(true);
    });

    it("matches international indeed domains (co.uk, ca, in)", () => {
      expect(
        indeedPortalAdapter.isJobPage(
          "https://uk.indeed.com/viewjob?jk=1234567890abcdef",
        ),
      ).toBe(true);
      expect(
        indeedPortalAdapter.isJobPage(
          "https://in.indeed.com/jobs?vjk=1234567890abcdef",
        ),
      ).toBe(true);
      expect(
        indeedPortalAdapter.isJobPage(
          "https://ca.indeed.com/job/software-dev-1234567890abcdef",
        ),
      ).toBe(true);
    });

    it("rejects non-job pages on indeed without job markers", () => {
      expect(
        indeedPortalAdapter.isJobPage("https://www.indeed.com/companies"),
      ).toBe(false);
      expect(
        indeedPortalAdapter.isJobPage("https://www.indeed.com/salaries"),
      ).toBe(false);
    });

    it("rejects non-indeed URLs", () => {
      expect(
        indeedPortalAdapter.isJobPage("https://www.linkedin.com/jobs/view/123"),
      ).toBe(false);
      expect(indeedPortalAdapter.isJobPage("https://google.com")).toBe(false);
    });
  });

  describe("External Job ID Extraction", () => {
    it("extracts jk parameter from viewjob URL", () => {
      const url = "https://www.indeed.com/viewjob?jk=abcd1234efgh5678";
      expect(indeedPortalAdapter.extractExternalJobId(url)).toBe(
        "abcd1234efgh5678",
      );
    });

    it("extracts vjk parameter from search result URL", () => {
      const url = "https://www.indeed.com/jobs?q=dev&vjk=fedcba9876543210";
      expect(indeedPortalAdapter.extractExternalJobId(url)).toBe(
        "fedcba9876543210",
      );
    });

    it("extracts ID from DOM data-jk attribute when URL has no query params", () => {
      const mockDoc = {
        querySelector: (selector: string) => {
          if (selector === "[data-jk]") {
            return {
              getAttribute: (attr: string) =>
                attr === "data-jk" ? "dom1234567890abc" : null,
            };
          }
          return null;
        },
      };

      const url = "https://www.indeed.com/viewjob";
      expect(indeedPortalAdapter.extractExternalJobId(url, mockDoc)).toBe(
        "dom1234567890abc",
      );
    });

    it("returns null if no ID exists anywhere", () => {
      const mockDoc = {
        querySelector: () => null,
      };
      expect(
        indeedPortalAdapter.extractExternalJobId(
          "https://www.indeed.com/about",
          mockDoc,
        ),
      ).toBeNull();
    });
  });

  describe("Metadata Extraction", () => {
    it("extracts full job details from valid DOM elements", () => {
      const mockElements: Record<
        string,
        { textContent: string; getAttribute?: (attr: string) => string | null }
      > = {
        "[data-testid='jobsearch-JobInfoHeader-title']": {
          textContent: "Senior Software Engineer - Full Stack  \n",
        },
        "[data-testid='inlineHeader-companyName']": {
          textContent: "  Acme Corp Technologies  ",
        },
        "[data-testid='inlineHeader-companyLocation']": {
          textContent: "San Francisco, CA (Remote)",
        },
        "#jobDescriptionText": {
          textContent:
            "We are seeking a talented Senior Software Engineer with Node.js and React expertise.",
        },
        "[data-jk]": {
          textContent: "",
          getAttribute: (attr: string) =>
            attr === "data-jk" ? "acme9876543210ab" : null,
        },
      };

      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };

      const url = "https://www.indeed.com/viewjob?jk=acme9876543210ab";
      const result = indeedPortalAdapter.extractJobDetails(mockDoc, url);

      expect(result).not.toBeNull();
      expect(result).toEqual({
        portal: "indeed",
        externalJobId: "acme9876543210ab",
        url,
        title: "Senior Software Engineer - Full Stack",
        company: "Acme Corp Technologies",
        location: "San Francisco, CA (Remote)",
        description:
          "We are seeking a talented Senior Software Engineer with Node.js and React expertise.",
        portalCode: "indeed",
        jobUrl: url,
      });
    });

    it("normalizes and removes trailing '- Job Post' suffix from title", () => {
      const mockElements: Record<string, { textContent: string }> = {
        "[data-testid='jobsearch-JobInfoHeader-title']": {
          textContent: "Lead Backend Developer - Job Post",
        },
        "[data-testid='inlineHeader-companyName']": {
          textContent: "Stripe",
        },
        "[data-testid='inlineHeader-companyLocation']": {
          textContent: "Seattle, WA",
        },
      };

      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };

      const url = "https://www.indeed.com/viewjob?jk=stripe123456789";
      const result = indeedPortalAdapter.extractJobDetails(mockDoc, url);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Lead Backend Developer");
      expect(result?.company).toBe("Stripe");
      expect(result?.location).toBe("Seattle, WA");
    });

    it("returns null when title is missing", () => {
      const mockElements: Record<string, { textContent: string }> = {
        "[data-testid='inlineHeader-companyName']": { textContent: "Google" },
        "[data-testid='inlineHeader-companyLocation']": {
          textContent: "Mountain View, CA",
        },
      };
      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };
      const result = indeedPortalAdapter.extractJobDetails(
        mockDoc,
        "https://www.indeed.com/viewjob?jk=goog12345",
      );
      expect(result).toBeNull();
    });

    it("returns null when company is missing", () => {
      const mockElements: Record<string, { textContent: string }> = {
        "[data-testid='jobsearch-JobInfoHeader-title']": {
          textContent: "Software Engineer",
        },
        "[data-testid='inlineHeader-companyLocation']": {
          textContent: "Remote",
        },
      };
      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };
      const result = indeedPortalAdapter.extractJobDetails(
        mockDoc,
        "https://www.indeed.com/viewjob?jk=goog12345",
      );
      expect(result).toBeNull();
    });

    it("returns null when location is missing", () => {
      const mockElements: Record<string, { textContent: string }> = {
        "[data-testid='jobsearch-JobInfoHeader-title']": {
          textContent: "Software Engineer",
        },
        "[data-testid='inlineHeader-companyName']": { textContent: "Meta" },
      };
      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };
      const result = indeedPortalAdapter.extractJobDetails(
        mockDoc,
        "https://www.indeed.com/viewjob?jk=goog12345",
      );
      expect(result).toBeNull();
    });

    it("returns null when external job ID cannot be found", () => {
      const mockElements: Record<string, { textContent: string }> = {
        "[data-testid='jobsearch-JobInfoHeader-title']": {
          textContent: "Software Engineer",
        },
        "[data-testid='inlineHeader-companyName']": { textContent: "Meta" },
        "[data-testid='inlineHeader-companyLocation']": {
          textContent: "Remote",
        },
      };
      const mockDoc = {
        querySelector: (selector: string) => mockElements[selector] || null,
      };
      const result = indeedPortalAdapter.extractJobDetails(
        mockDoc,
        "https://www.indeed.com/somepage",
      );
      expect(result).toBeNull();
    });
  });

  describe("Portal Registry", () => {
    it("resolves IndeedPortalAdapter for indeed.com URLs", () => {
      const adapter = getPortalAdapter("https://www.indeed.com/viewjob?jk=123");
      expect(adapter).toBeDefined();
      expect(adapter?.code).toBe("indeed");
    });

    it("resolves IndeedPortalAdapter for country-specific indeed domains", () => {
      const adapter = getPortalAdapter("https://in.indeed.com/jobs?vjk=456");
      expect(adapter).toBeDefined();
      expect(adapter?.code).toBe("indeed");
    });

    it("returns null for unsupported domains", () => {
      const adapter = getPortalAdapter("https://example.com/jobs/123");
      expect(adapter).toBeNull();
    });
  });
});
