import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  executePrepareApplication,
  executeTransitionApplicationStatus,
  executeArchiveApplication,
  executeRestoreApplication,
  executeUploadUserDocument,
  executeReplaceDocumentVersion,
  UseCaseContext,
} from "../../src/index.js";
import {
  createJob,
  uploadDocument,
  getApplication,
  listApplicationPreparations,
} from "@jobpilot/database";
import { NotFoundError } from "@jobpilot/shared";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://nhbtvffsainbutsdzyht.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYnR2ZmZzYWluYnV0c2R6eWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIwNDcsImV4cCI6MjEwMjc5ODA0N30.Al24DtjMgYMUASDJUXgVk8Zz7njnduI_SYrZ1DZMZmU";

const TEST_USER_A_EMAIL = "test_user_a@jobpilot.internal";
const TEST_USER_B_EMAIL = "test_user_b@jobpilot.internal";
const TEST_PASSWORD = "TestPassword123!";

describe("Use-Cases Package Remote Supabase Integration & Concurrency Suite", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let contextA: UseCaseContext;
  let contextB: UseCaseContext;

  const ensureAuth = async () => {
    const { data: sessionA } = await clientA.auth.getSession();
    if (!sessionA?.session) {
      const { error: errA } = await clientA.auth.signInWithPassword({
        email: TEST_USER_A_EMAIL,
        password: TEST_PASSWORD,
      });
      if (errA) throw new Error(`User A login failed: ${errA.message}`);
    }

    const { data: sessionB } = await clientB.auth.getSession();
    if (!sessionB?.session) {
      const { error: errB } = await clientB.auth.signInWithPassword({
        email: TEST_USER_B_EMAIL,
        password: TEST_PASSWORD,
      });
      if (errB) throw new Error(`User B login failed: ${errB.message}`);
    }

    contextA = { supabase: clientA };
    contextB = { supabase: clientB };
  };

  beforeAll(async () => {
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await ensureAuth();
  }, 30000);

  beforeEach(async () => {
    await ensureAuth();
  });

  it("1. Orchestrates Document Upload & Version Replacement Use Cases", async () => {
    const file1 = new Blob(
      [`Use Case Resume v1 ${Date.now()}_${crypto.randomUUID()}`],
      { type: "application/pdf" },
    );
    const doc1 = await executeUploadUserDocument(contextA, {
      file: file1,
      fileName: "uc_resume_v1.pdf",
      category: "resumes",
      documentType: "RESUME",
    });

    expect(doc1.id).toBeDefined();
    expect(doc1.version).toBe(1);

    const file2 = new Blob(
      [`Use Case Resume v2 ${Date.now()}_${crypto.randomUUID()}`],
      { type: "application/pdf" },
    );
    const doc2 = await executeReplaceDocumentVersion(
      contextA,
      doc1.document_group_id,
      {
        file: file2,
        fileName: "uc_resume_v2.pdf",
      },
    );

    expect(doc2.version).toBe(2);
    expect(doc2.is_active).toBe(true);
  }, 30000);

  it("2. Orchestrates Application Preparation, Idempotency & Re-Preparation Use Cases", async () => {
    const job = await createJob(clientA, {
      company_name: "Fintech Innovations",
      job_title: "Staff Platform Engineer",
    });

    const file = new Blob(
      [`Resume for Fintech ${Date.now()}_${crypto.randomUUID()}`],
      { type: "application/pdf" },
    );
    const resume = await executeUploadUserDocument(contextA, {
      file,
      fileName: "fintech_resume.pdf",
      category: "resumes",
      documentType: "RESUME",
    });

    const key = crypto.randomUUID();

    // First preparation
    const app1 = await executePrepareApplication(contextA, {
      job_id: job.id,
      status: "INTERESTED",
      resume_document_id: resume.id,
      notes: "Prepared for Fintech",
      idempotency_key: key,
      answers: [
        {
          concept_key: "k8s_experience",
          question_text: "Years with Kubernetes?",
          answer_value: "6",
        },
      ],
    });

    expect(app1.status).toBe("INTERESTED"); // Status preserved
    expect(app1.latest_preparation_id).toBeDefined();

    // Idempotent retry
    const appRetry = await executePrepareApplication(contextA, {
      application_id: app1.id,
      job_id: job.id,
      status: "INTERESTED",
      resume_document_id: resume.id,
      notes: "Prepared for Fintech",
      idempotency_key: key,
      answers: [
        {
          concept_key: "k8s_experience",
          question_text: "Years with Kubernetes?",
          answer_value: "6",
        },
      ],
    });
    expect(appRetry.id).toBe(app1.id);

    // Re-preparation with new key
    const appPrep2 = await executePrepareApplication(contextA, {
      application_id: app1.id,
      resume_document_id: resume.id,
      notes: "Updated answers",
      idempotency_key: crypto.randomUUID(),
      answers: [
        {
          concept_key: "k8s_experience",
          question_text: "Years with Kubernetes?",
          answer_value: "7",
        },
      ],
    });
    expect(appPrep2.latest_preparation_id).not.toBe(app1.latest_preparation_id);

    const preps = await listApplicationPreparations(clientA, app1.id);
    expect(preps.length).toBe(2);
  }, 30000);

  it("3. Orchestrates Status Transition, Archival & Restoration Use Cases", async () => {
    const job = await createJob(clientA, {
      company_name: "Cloud Native Co",
      job_title: "DevOps Engineer",
    });

    const app = await executePrepareApplication(contextA, {
      job_id: job.id,
      status: "SAVED",
      notes: "Initial draft",
    });

    // Transition to APPLIED
    const appliedApp = await executeTransitionApplicationStatus(
      contextA,
      app.id,
      "APPLIED",
    );
    expect(appliedApp.status).toBe("APPLIED");

    // Archive application
    await executeArchiveApplication(contextA, app.id);
    await expect(getApplication(clientA, app.id)).rejects.toThrow(
      NotFoundError,
    );

    // Attempting preparation on archived app is rejected
    await expect(
      executePrepareApplication(contextA, {
        application_id: app.id,
        notes: "Trying to prep archived app",
      }),
    ).rejects.toThrow();

    // Restore application
    const restoredApp = await executeRestoreApplication(contextA, app.id);
    expect(restoredApp.deleted_at).toBeNull();
    expect(restoredApp.status).toBe("APPLIED");
  }, 30000);

  it("4. Document Category Rejection & Cross-Tenant Isolation", async () => {
    const jobA = await createJob(clientA, {
      company_name: "Tenant A Corp",
      job_title: "Architect",
    });

    // Upload a CERTIFICATE (category 'certificates')
    const certBlob = new Blob([`Cert ${Date.now()}_${crypto.randomUUID()}`], {
      type: "application/pdf",
    });
    const certDoc = await uploadDocument(clientA, {
      file: certBlob,
      fileName: "cert.pdf",
      category: "certificates",
      documentType: "CERTIFICATE",
    });

    // Attempting to pass a CERTIFICATE as resume_document_id is rejected by RPC
    await expect(
      executePrepareApplication(contextA, {
        job_id: jobA.id,
        resume_document_id: certDoc.id,
      }),
    ).rejects.toThrow();

    // Cross-tenant check: User B tries to prepare application with User A's job
    await expect(
      executePrepareApplication(contextB, {
        job_id: jobA.id,
      }),
    ).rejects.toThrow();
  }, 30000);

  it("5. Concurrent Same-Key Preparation Race Safety", async () => {
    const job = await createJob(clientA, {
      company_name: "Race Corp",
      job_title: "Concurrency Specialist",
    });

    const sharedKey = crypto.randomUUID();

    // Execute two concurrent preparations with the exact same idempotency key
    const [res1, res2] = await Promise.all([
      executePrepareApplication(contextA, {
        job_id: job.id,
        status: "SAVED",
        notes: "Concurrent Intent",
        idempotency_key: sharedKey,
        answers: [{ question_text: "Ready?", answer_value: "Yes" }],
      }),
      executePrepareApplication(contextA, {
        job_id: job.id,
        status: "SAVED",
        notes: "Concurrent Intent",
        idempotency_key: sharedKey,
        answers: [{ question_text: "Ready?", answer_value: "Yes" }],
      }),
    ]);

    expect(res1.id).toBe(res2.id);

    const preps = await listApplicationPreparations(clientA, res1.id);
    expect(preps.length).toBe(1); // Exactly 1 preparation committed
  }, 30000);
});
