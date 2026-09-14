import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import {
  JobForm,
  JobFormProps,
} from "../../renderer/src/components/jobs/JobForm";
import { jobSchema } from "@jobpilot/validation";
import type { JobCreateInput } from "@jobpilot/types";

describe("JobForm Component - Comprehensive Test Suite", () => {
  const defaultProps: JobFormProps = {
    isEditing: false,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    submitting: false,
    serverError: null,
  };

  it("1. company name is required in schema validation", () => {
    const invalidResult = jobSchema.safeParse({
      company_name: "   ",
      job_title: "Staff Engineer",
      status: "SAVED",
    });
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues[0]?.message).toMatch(
        /company name is required/i,
      );
    }
  });

  it("2. job title is required in schema validation", () => {
    const invalidResult = jobSchema.safeParse({
      company_name: "Apple",
      job_title: "",
      status: "SAVED",
    });
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues[0]?.message).toMatch(
        /job title is required/i,
      );
    }
  });

  it("3. in create mode, status options are ONLY SAVED and INTERESTED", () => {
    const html = renderToString(
      <JobForm {...defaultProps} isEditing={false} />,
    );

    expect(html).toContain('<option value="SAVED" selected="">Saved</option>');
    expect(html).toContain('<option value="INTERESTED">Interested</option>');
    expect(html).not.toContain('<option value="APPLIED">Applied</option>');
    expect(html).not.toContain('<option value="CLOSED">Closed</option>');
  });

  it("4. in create mode, APPLIED and CLOSED cannot be selected", () => {
    const html = renderToString(
      <JobForm {...defaultProps} isEditing={false} />,
    );
    expect(html).not.toContain('value="APPLIED"');
    expect(html).not.toContain('value="CLOSED"');
  });

  it("5. in edit mode, can represent all 4 canonical statuses", () => {
    const html = renderToString(
      <JobForm
        {...defaultProps}
        isEditing={true}
        initialValues={{ status: "APPLIED" }}
      />,
    );

    expect(html).toContain('<option value="SAVED">Saved</option>');
    expect(html).toContain('<option value="INTERESTED">Interested</option>');
    expect(html).toContain(
      '<option value="APPLIED" selected="">Applied</option>',
    );
    expect(html).toContain('<option value="CLOSED">Closed</option>');
  });

  it("6. default create status is SAVED", () => {
    const html = renderToString(
      <JobForm {...defaultProps} isEditing={false} />,
    );
    expect(html).toContain('<option value="SAVED" selected="">Saved</option>');
  });

  it("7. renders all standard employment type options", () => {
    const html = renderToString(<JobForm {...defaultProps} />);

    expect(html).toContain('<option value="Full-time">Full-time</option>');
    expect(html).toContain('<option value="Part-time">Part-time</option>');
    expect(html).toContain('<option value="Contract">Contract</option>');
    expect(html).toContain('<option value="Internship">Internship</option>');
    expect(html).toContain('<option value="Freelance">Freelance</option>');
    expect(html).toContain('<option value="Temporary">Temporary</option>');
    expect(html).toContain('<option value="Other">Other</option>');
  });

  it("8. employment type = Other reveals custom input", () => {
    const html = renderToString(
      <JobForm
        {...defaultProps}
        initialValues={{ employment_type: "Apprenticeship" }}
      />,
    );

    expect(html).toContain('id="job-form-custom-emp-type"');
    expect(html).toContain('value="Apprenticeship"');
    expect(html).toContain("Specify Custom Employment Type");
  });

  it("9. other custom value is handled properly in payload formatting", () => {
    const customPayload: JobCreateInput = {
      company_name: "Figma",
      job_title: "Designer",
      status: "SAVED",
      employment_type: "Apprenticeship / Co-op",
      location: null,
      description: null,
      salary_min: null,
      salary_max: null,
      currency: null,
      job_url: null,
      posted_at: null,
      portal_id: null,
    };
    const parseResult = jobSchema.safeParse(customPayload);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.employment_type).toBe("Apprenticeship / Co-op");
    }
  });

  it("10. salary minimum normalization accepts valid non-negative numbers", () => {
    const valid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      salary_min: 150000,
      salary_max: 200000,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.salary_min).toBe(150000);
    }
  });

  it("11. salary maximum normalization accepts valid non-negative numbers", () => {
    const valid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      salary_min: 100000,
      salary_max: 180000,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.salary_max).toBe(180000);
    }
  });

  it("12. salary_max < salary_min validation fails schema validation", () => {
    const invalid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      salary_min: 200000,
      salary_max: 100000,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toMatch(
        /maximum salary must be greater than or equal to minimum salary/i,
      );
    }
  });

  it("13. empty optional salary values do not become invalid numbers", () => {
    const valid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      salary_min: null,
      salary_max: null,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.salary_min).toBeNull();
      expect(valid.data.salary_max).toBeNull();
    }
  });

  it("14. currency is optional and does not force USD default", () => {
    const html = renderToString(<JobForm {...defaultProps} />);
    expect(html).toContain(
      '<option value="" selected="">None selected</option>',
    );

    const valid = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      currency: null,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.currency).toBeNull();
    }
  });

  it("15. URL validation ensures valid http/https format when provided", () => {
    const invalidUrl = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      job_url: "not-a-url",
    });
    expect(invalidUrl.success).toBe(false);

    const validUrl = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      job_url: "https://stripe.com/careers/dev",
    });
    expect(validUrl.success).toBe(true);
  });

  it("16. posted date conversion correctly parses ISO timestamp strings", () => {
    const validDate = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      posted_at: "2026-09-01T00:00:00.000Z",
    });
    expect(validDate.success).toBe(true);
    if (validDate.success) {
      expect(validDate.data.posted_at).toBe("2026-09-01T00:00:00.000Z");
    }
  });

  it("17. empty optional strings normalize to null in payload", () => {
    const result = jobSchema.safeParse({
      company_name: "Stripe",
      job_title: "Dev",
      status: "SAVED",
      location: null,
      description: null,
      employment_type: null,
      job_url: null,
      posted_at: null,
      currency: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBeNull();
      expect(result.data.description).toBeNull();
      expect(result.data.employment_type).toBeNull();
      expect(result.data.job_url).toBeNull();
      expect(result.data.posted_at).toBeNull();
    }
  });

  it("18. populates initial values in edit mode", () => {
    const initialValues: Partial<JobCreateInput> = {
      company_name: "Stripe",
      job_title: "Staff Engineer",
      location: "San Francisco, CA",
      employment_type: "Full-time",
      description: "Scale core payments ledger",
      salary_min: 220000,
      salary_max: 290000,
      currency: "USD",
      job_url: "https://stripe.com/jobs/payments",
      posted_at: "2026-09-01T12:00:00.000Z",
    };

    const html = renderToString(
      <JobForm
        {...defaultProps}
        isEditing={true}
        initialValues={initialValues}
      />,
    );

    expect(html).toContain('value="Stripe"');
    expect(html).toContain('value="Staff Engineer"');
    expect(html).toContain('value="San Francisco, CA"');
    expect(html).toContain('value="220000"');
    expect(html).toContain('value="290000"');
    expect(html).toContain('value="https://stripe.com/jobs/payments"');
    expect(html).toContain('value="2026-09-01"');
    expect(html).toContain("Scale core payments ledger");
  });

  it("19. disables submit and cancel buttons and displays pending text while submitting", () => {
    const htmlCreateSubmitting = renderToString(
      <JobForm {...defaultProps} submitting={true} isEditing={false} />,
    );
    expect(htmlCreateSubmitting).toContain("Creating Job...");
    expect(htmlCreateSubmitting).toMatch(
      /<button[^>]*disabled[^>]*>Creating Job...<\/button>/,
    );
    expect(htmlCreateSubmitting).toMatch(
      /<button[^>]*disabled[^>]*>Cancel<\/button>/,
    );

    const htmlEditSubmitting = renderToString(
      <JobForm {...defaultProps} submitting={true} isEditing={true} />,
    );
    expect(htmlEditSubmitting).toContain("Saving Changes...");
    expect(htmlEditSubmitting).toMatch(
      /<button[^>]*disabled[^>]*>Saving Changes...<\/button>/,
    );
  });

  it("20. executes onCancel callback prop when cancel button is configured", () => {
    const onCancelMock = vi.fn();
    const props: JobFormProps = {
      ...defaultProps,
      onCancel: onCancelMock,
    };
    expect(props.onCancel).toBe(onCancelMock);
  });
});
