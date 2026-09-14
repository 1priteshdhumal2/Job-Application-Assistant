import { useState, useEffect, type ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { JobForm } from "../../components/jobs/JobForm";
import { executeGetJob, executeUpdateJob } from "@jobpilot/use-cases";
import type { Job, JobCreateInput } from "@jobpilot/types";
import { useAuth } from "../../auth/useAuth";

export function EditJobPage(): ReactElement {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { supabase, status: authStatus } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setFetchError("Invalid job identifier.");
      setLoading(false);
      return;
    }

    if (!supabase || authStatus !== "AUTHENTICATED") {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    executeGetJob({ supabase }, jobId)
      .then((data) => {
        if (isMounted) {
          setJob(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load job details.";
          setFetchError(message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobId, supabase, authStatus]);

  const handleSubmit = async (data: JobCreateInput) => {
    if (!jobId || !supabase || authStatus !== "AUTHENTICATED") {
      setUpdateError("Authentication required to update job.");
      return;
    }

    setSubmitting(true);
    setUpdateError(null);

    try {
      await executeUpdateJob({ supabase }, jobId, data);
      navigate(`/app/jobs/${jobId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update job posting.";
      setUpdateError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (jobId) {
      navigate(`/app/jobs/${jobId}`);
    } else {
      navigate("/app/jobs");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader
          title="Edit Job"
          description="Update job posting details."
          breadcrumbs={[{ label: "Jobs", to: "/app/jobs" }, { label: "Edit" }]}
        />
        <LoadingState message="Loading job details for editing..." />
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="page-container">
        <PageHeader
          title="Job Not Found"
          breadcrumbs={[
            { label: "Jobs", to: "/app/jobs" },
            { label: "Not Found" },
          ]}
        />
        <ErrorState
          title="Failed to load job"
          message={fetchError || "The requested job posting does not exist."}
          onRetry={() => navigate("/app/jobs")}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={`Edit ${job.job_title}`}
        description={`Update details for ${job.company_name}.`}
        breadcrumbs={[
          { label: "Jobs", to: "/app/jobs" },
          { label: job.job_title, to: `/app/jobs/${job.id}` },
          { label: "Edit" },
        ]}
      />

      <JobForm
        initialValues={{
          company_name: job.company_name,
          job_title: job.job_title,
          status: job.status,
          location: job.location,
          employment_type: job.employment_type,
          description: job.description,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          currency: job.currency,
          job_url: job.job_url,
          posted_at: job.posted_at,
          portal_id: job.portal_id,
        }}
        isEditing={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
        serverError={updateError}
      />
    </div>
  );
}
