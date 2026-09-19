import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type {
  CapturedJobPayload,
  CapturePortalJobResult,
} from "@jobpilot/types";
import { executeCapturePortalJob } from "@jobpilot/use-cases";
import { useAuth } from "../auth/AuthContext";

export type CaptureStatus = "idle" | "persisting" | "success" | "error";

export interface CaptureWorkflowState {
  status: CaptureStatus;
  capturedJob: CapturedJobPayload | null;
  persistedResult: CapturePortalJobResult | null;
  error: string | null;
  clearCapturedJob: () => void;
}

const CaptureWorkflowContext = createContext<CaptureWorkflowState | null>(null);

export function CaptureWorkflowProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const { supabase, status: authStatus } = useAuth();
  const [capturedJob, setCapturedJob] = useState<CapturedJobPayload | null>(
    null,
  );
  const [persistedResult, setPersistedResult] =
    useState<CapturePortalJobResult | null>(null);
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const processCapturedJob = useCallback(
    async (jobPayload: CapturedJobPayload) => {
      setCapturedJob(jobPayload);
      setError(null);

      if (!supabase || authStatus !== "AUTHENTICATED") {
        setStatus("error");
        setError(
          "Job captured, but you must be logged into JobPilot Desktop to save it.",
        );
        return;
      }

      setStatus("persisting");
      try {
        const result = await executeCapturePortalJob(
          { supabase },
          {
            portalCode: jobPayload.portal,
            externalJobId: jobPayload.externalJobId,
            jobTitle: jobPayload.title,
            companyName: jobPayload.company,
            jobUrl: jobPayload.url,
            location: jobPayload.location || null,
            description: jobPayload.description || null,
            capturedAt: jobPayload.capturedAt || new Date().toISOString(),
          },
        );

        setPersistedResult(result);
        setStatus("success");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to persist captured job to workspace.";
        setError(message);
        setStatus("error");
      }
    },
    [supabase, authStatus],
  );

  useEffect(() => {
    // 1. Initial check for in-memory captured job from Electron Main
    if (typeof window !== "undefined" && window.jobPilot?.getCapturedJob) {
      window.jobPilot
        .getCapturedJob()
        .then((initialJob) => {
          if (initialJob && !capturedJob) {
            processCapturedJob(initialJob);
          }
        })
        .catch(() => {});
    }

    // 2. Subscribe to real-time captured job events over IPC
    let unsubscribe: (() => void) | undefined;
    if (typeof window !== "undefined" && window.jobPilot?.onJobCaptured) {
      unsubscribe = window.jobPilot.onJobCaptured((jobPayload) => {
        processCapturedJob(jobPayload);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [processCapturedJob, capturedJob]);

  const clearCapturedJob = useCallback(() => {
    setCapturedJob(null);
    setPersistedResult(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <CaptureWorkflowContext.Provider
      value={{
        status,
        capturedJob,
        persistedResult,
        error,
        clearCapturedJob,
      }}
    >
      {children}
    </CaptureWorkflowContext.Provider>
  );
}

export function useCaptureWorkflow(): CaptureWorkflowState {
  const context = useContext(CaptureWorkflowContext);
  if (!context) {
    throw new Error(
      "useCaptureWorkflow must be used within a CaptureWorkflowProvider",
    );
  }
  return context;
}
