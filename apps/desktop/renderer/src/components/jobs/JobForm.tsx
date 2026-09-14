import { useState, useEffect, type ReactElement, type FormEvent } from "react";
import type { JobCreateInput, JobStatus } from "@jobpilot/types";
import { jobSchema } from "@jobpilot/validation";

export interface JobFormProps {
  initialValues?: Partial<JobCreateInput>;
  isEditing?: boolean;
  onSubmit: (data: JobCreateInput) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  serverError?: string | null;
}

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Temporary",
  "Other",
] as const;

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"] as const;

export function JobForm({
  initialValues = {},
  isEditing = false,
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}: JobFormProps): ReactElement {
  const [companyName, setCompanyName] = useState(
    initialValues.company_name || "",
  );
  const [jobTitle, setJobTitle] = useState(initialValues.job_title || "");
  const [status, setStatus] = useState<JobStatus>(
    initialValues.status || "SAVED",
  );
  const [location, setLocation] = useState(initialValues.location || "");

  // Employment type state & "Other" custom input
  const initialEmpType = initialValues.employment_type || "";
  const isKnownEmpType = (EMPLOYMENT_TYPES as readonly string[]).includes(
    initialEmpType,
  );
  const [selectedEmpType, setSelectedEmpType] = useState<string>(() => {
    if (!initialEmpType) return "";
    return isKnownEmpType ? initialEmpType : "Other";
  });
  const [customEmpType, setCustomEmpType] = useState<string>(() => {
    return !isKnownEmpType && initialEmpType ? initialEmpType : "";
  });

  const [description, setDescription] = useState(
    initialValues.description || "",
  );
  const [salaryMin, setSalaryMin] = useState<string>(
    initialValues.salary_min != null ? String(initialValues.salary_min) : "",
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    initialValues.salary_max != null ? String(initialValues.salary_max) : "",
  );
  const [currency, setCurrency] = useState(initialValues.currency || "");
  const [jobUrl, setJobUrl] = useState(initialValues.job_url || "");
  const [postedAt, setPostedAt] = useState<string>(() => {
    if (initialValues.posted_at) {
      try {
        const d = new Date(initialValues.posted_at);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split("T")[0] || "";
        }
      } catch {
        return "";
      }
    }
    return "";
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Sync state if initialValues change in Edit mode
  useEffect(() => {
    if (initialValues.company_name !== undefined) {
      setCompanyName(initialValues.company_name || "");
    }
    if (initialValues.job_title !== undefined) {
      setJobTitle(initialValues.job_title || "");
    }
    if (initialValues.status !== undefined) {
      setStatus(initialValues.status || "SAVED");
    }
    if (initialValues.location !== undefined) {
      setLocation(initialValues.location || "");
    }
    if (initialValues.employment_type !== undefined) {
      const empType = initialValues.employment_type || "";
      const isKnown = (EMPLOYMENT_TYPES as readonly string[]).includes(empType);
      setSelectedEmpType(empType ? (isKnown ? empType : "Other") : "");
      setCustomEmpType(!isKnown && empType ? empType : "");
    }
    if (initialValues.description !== undefined) {
      setDescription(initialValues.description || "");
    }
    if (initialValues.salary_min !== undefined) {
      setSalaryMin(
        initialValues.salary_min != null
          ? String(initialValues.salary_min)
          : "",
      );
    }
    if (initialValues.salary_max !== undefined) {
      setSalaryMax(
        initialValues.salary_max != null
          ? String(initialValues.salary_max)
          : "",
      );
    }
    if (initialValues.currency !== undefined) {
      setCurrency(initialValues.currency || "");
    }
    if (initialValues.job_url !== undefined) {
      setJobUrl(initialValues.job_url || "");
    }
    if (initialValues.posted_at !== undefined) {
      if (initialValues.posted_at) {
        try {
          const d = new Date(initialValues.posted_at);
          if (!isNaN(d.getTime())) {
            setPostedAt(d.toISOString().split("T")[0] || "");
          } else {
            setPostedAt("");
          }
        } catch {
          setPostedAt("");
        }
      } else {
        setPostedAt("");
      }
    }
  }, [initialValues]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const trimmedCompany = companyName.trim();
    const trimmedTitle = jobTitle.trim();
    const trimmedLocation = location.trim() || null;
    const trimmedUrl = jobUrl.trim() || null;
    const trimmedDesc = description.trim() || null;

    let finalEmpType: string | null = null;
    if (selectedEmpType === "Other") {
      finalEmpType = customEmpType.trim() || null;
    } else if (selectedEmpType) {
      finalEmpType = selectedEmpType;
    }

    const parsedSalaryMin =
      salaryMin.trim() !== "" ? Number(salaryMin.trim()) : null;
    const parsedSalaryMax =
      salaryMax.trim() !== "" ? Number(salaryMax.trim()) : null;
    const trimmedCurrency = currency.trim() || null;

    let parsedPostedAt: string | null = null;
    if (postedAt.trim() !== "") {
      try {
        const d = new Date(postedAt.trim());
        if (!isNaN(d.getTime())) {
          parsedPostedAt = d.toISOString();
        }
      } catch {
        parsedPostedAt = null;
      }
    }

    const payload: JobCreateInput = {
      company_name: trimmedCompany,
      job_title: trimmedTitle,
      status,
      location: trimmedLocation,
      employment_type: finalEmpType,
      description: trimmedDesc,
      salary_min: parsedSalaryMin,
      salary_max: parsedSalaryMax,
      currency: trimmedCurrency,
      job_url: trimmedUrl,
      posted_at: parsedPostedAt,
      portal_id: null,
    };

    // Client-side schema validation
    const result = jobSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setValidationErrors(fieldErrors);
      return;
    }

    await onSubmit(payload);
  };

  return (
    <form className="job-form-container" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="alert alert-error" role="alert">
          {serverError}
        </div>
      )}

      {/* SECTION 1: BASIC INFORMATION */}
      <div className="card form-section">
        <h2 className="form-section-title">1. Basic Information</h2>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="job-form-company" className="form-label">
              Company Name <span className="required-star">*</span>
            </label>
            <input
              id="job-form-company"
              type="text"
              className={`form-input ${validationErrors.company_name ? "input-error" : ""}`}
              placeholder="e.g. Stripe, Google"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={submitting}
              required
            />
            {validationErrors.company_name && (
              <span className="field-error-message">
                {validationErrors.company_name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="job-form-title" className="form-label">
              Job Title <span className="required-star">*</span>
            </label>
            <input
              id="job-form-title"
              type="text"
              className={`form-input ${validationErrors.job_title ? "input-error" : ""}`}
              placeholder="e.g. Senior Backend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={submitting}
              required
            />
            {validationErrors.job_title && (
              <span className="field-error-message">
                {validationErrors.job_title}
              </span>
            )}
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: "300px" }}>
          <label htmlFor="job-form-status" className="form-label">
            Job Status
          </label>
          <select
            id="job-form-status"
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
            disabled={submitting}
          >
            {isEditing ? (
              <>
                <option value="SAVED">Saved</option>
                <option value="INTERESTED">Interested</option>
                <option value="APPLIED">Applied</option>
                <option value="CLOSED">Closed</option>
              </>
            ) : (
              <>
                <option value="SAVED">Saved</option>
                <option value="INTERESTED">Interested</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* SECTION 2: WORK DETAILS */}
      <div className="card form-section">
        <h2 className="form-section-title">2. Work Details</h2>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="job-form-location" className="form-label">
              Location
            </label>
            <input
              id="job-form-location"
              type="text"
              className="form-input"
              placeholder="e.g. San Francisco, CA / Remote"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="job-form-employment-type" className="form-label">
              Employment Type
            </label>
            <select
              id="job-form-employment-type"
              className="form-input"
              value={selectedEmpType}
              onChange={(e) => setSelectedEmpType(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select type...</option>
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEmpType === "Other" && (
          <div className="form-group" style={{ marginTop: "0.25rem" }}>
            <label htmlFor="job-form-custom-emp-type" className="form-label">
              Specify Custom Employment Type
            </label>
            <input
              id="job-form-custom-emp-type"
              type="text"
              className="form-input"
              placeholder="e.g. Part-time / Apprenticeship"
              value={customEmpType}
              onChange={(e) => setCustomEmpType(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="job-form-description" className="form-label">
            Job Description & Notes
          </label>
          <textarea
            id="job-form-description"
            className="form-input form-textarea"
            placeholder="Paste or write key responsibilities, requirements, tech stack..."
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      {/* SECTION 3: COMPENSATION */}
      <div className="card form-section">
        <h2 className="form-section-title">3. Compensation (Optional)</h2>
        <div className="form-row-3">
          <div className="form-group">
            <label htmlFor="job-form-salary-min" className="form-label">
              Minimum Salary
            </label>
            <input
              id="job-form-salary-min"
              type="number"
              min="0"
              step="1000"
              className={`form-input ${validationErrors.salary_min ? "input-error" : ""}`}
              placeholder="e.g. 120000"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              disabled={submitting}
            />
            {validationErrors.salary_min && (
              <span className="field-error-message">
                {validationErrors.salary_min}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="job-form-salary-max" className="form-label">
              Maximum Salary
            </label>
            <input
              id="job-form-salary-max"
              type="number"
              min="0"
              step="1000"
              className={`form-input ${validationErrors.salary_max ? "input-error" : ""}`}
              placeholder="e.g. 180000"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              disabled={submitting}
            />
            {validationErrors.salary_max && (
              <span className="field-error-message">
                {validationErrors.salary_max}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="job-form-currency" className="form-label">
              Currency
            </label>
            <select
              id="job-form-currency"
              className="form-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={submitting}
            >
              <option value="">None selected</option>
              {CURRENCY_OPTIONS.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 4: SOURCE & POSTING */}
      <div className="card form-section">
        <h2 className="form-section-title">4. Source Details (Optional)</h2>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="job-form-url" className="form-label">
              Job Posting URL
            </label>
            <input
              id="job-form-url"
              type="url"
              className={`form-input ${validationErrors.job_url ? "input-error" : ""}`}
              placeholder="https://example.com/careers/job-123"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={submitting}
            />
            {validationErrors.job_url && (
              <span className="field-error-message">
                {validationErrors.job_url}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="job-form-posted-at" className="form-label">
              Date Posted
            </label>
            <input
              id="job-form-posted-at"
              type="date"
              className="form-input"
              value={postedAt}
              onChange={(e) => setPostedAt(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* FORM ACTIONS */}
      <div className="form-actions-container">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting
            ? isEditing
              ? "Saving Changes..."
              : "Creating Job..."
            : isEditing
              ? "Save Changes"
              : "Create Job"}
        </button>
      </div>
    </form>
  );
}
