import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { JobForm } from "../../components/jobs/JobForm";
import { executeCreateJob } from "@jobpilot/use-cases";
import type { JobCreateInput } from "@jobpilot/types";
import { useAuth } from "../../auth/useAuth";

export function CreateJobPage(): ReactElement {
  const navigate = useNavigate();
  const { supabase, status } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (data: JobCreateInput) => {
    if (!supabase || status !== "AUTHENTICATED") {
      setServerError("Authentication required to create a job.");
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const createdJob = await executeCreateJob({ supabase }, data);
      navigate(`/app/jobs/${createdJob.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create job posting.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/app/jobs");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Add New Job"
        description="Track a new job opportunity and prepare application materials."
        breadcrumbs={[{ label: "Jobs", to: "/app/jobs" }, { label: "New Job" }]}
      />

      <JobForm
        isEditing={false}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
        serverError={serverError}
      />
    </div>
  );
}
