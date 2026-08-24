import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getPersonalProfile,
  upsertPersonalProfile,
} from "../../src/domain/profile-personal.js";
import {
  listExperiences,
  createExperience,
  updateExperience,
  deleteExperience,
} from "../../src/domain/experiences.js";
import {
  createEducation,
  deleteEducation,
} from "../../src/domain/education.js";
import { createSkill, deleteSkill } from "../../src/domain/skills.js";
import {
  createCertification,
  deleteCertification,
} from "../../src/domain/certifications.js";
import { createLanguage, deleteLanguage } from "../../src/domain/languages.js";
import {
  createProfileLink,
  deleteProfileLink,
} from "../../src/domain/profile-links.js";
import { upsertProfilePreferences } from "../../src/domain/profile-preferences.js";
import {
  listDocuments,
  getDocument,
  listDocumentVersions,
  uploadDocument,
  replaceDocumentVersion,
  deactivateDocument,
  downloadDocument,
} from "../../src/domain/documents.js";
import { listPortals, getPortalByCode } from "../../src/domain/portals.js";
import { getJob, createJob, deleteJob } from "../../src/domain/jobs.js";
import {
  getApplication,
  listDeletedApplications,
  getDeletedApplication,
  createApplication,
  transitionApplicationStatus,
  softDeleteApplication,
  restoreApplication,
} from "../../src/domain/applications.js";
import {
  listApplicationAnswers,
  createApplicationAnswer,
} from "../../src/domain/application-answers.js";
import {
  NotFoundError,
  ValidationError,
  InvalidStateTransitionError,
  ConflictError,
} from "@jobpilot/shared";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://nhbtvffsainbutsdzyht.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYnR2ZmZzYWluYnV0c2R6eWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjIwNDcsImV4cCI6MjEwMjc5ODA0N30.Al24DtjMgYMUASDJUXgVk8Zz7njnduI_SYrZ1DZMZmU";

describe("Real Remote Supabase Integration & Security Suite (Phase 2C-2)", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId: string;
  let userBId: string;

  const emailA = "test_user_a@jobpilot.internal";
  const emailB = "test_user_b@jobpilot.internal";
  const password = "TestPassword123!";

  /**
   * Idempotent test-user authentication helper.
   * Attempts sign-in first; if the user does not exist (e.g. fresh DB without seed migration 00006),
   * provisions the account dynamically via auth.signUp() in test setup.
   */
  async function ensureTestUserSession(
    client: SupabaseClient,
    email: string,
    pass: string,
  ): Promise<string> {
    const signInRes = await client.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (signInRes.data?.user) {
      return signInRes.data.user.id;
    }

    // Provision test user if not present
    const signUpRes = await client.auth.signUp({ email, password: pass });
    if (signUpRes.data?.user) {
      if (signUpRes.data.session) {
        return signUpRes.data.user.id;
      }
    }

    // Final sign-in retry
    const retryRes = await client.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (retryRes.data?.user) {
      return retryRes.data.user.id;
    }

    throw new Error(
      `Test user authentication failed for ${email}: ${retryRes.error?.message || signInRes.error?.message}`,
    );
  }

  beforeAll(async () => {
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    userAId = await ensureTestUserSession(clientA, emailA, password);
    userBId = await ensureTestUserSession(clientB, emailB, password);
  });

  afterAll(async () => {
    // Cleanup User A & User B data safely
    if (clientA && userAId) {
      await clientA.from("applications").delete().eq("user_id", userAId);
      await clientA.from("jobs").delete().eq("user_id", userAId);
      await clientA.from("documents").delete().eq("user_id", userAId);
      await clientA.from("answer_bank").delete().eq("user_id", userAId);
      await clientA.from("skills").delete().eq("user_id", userAId);
      await clientA.from("languages").delete().eq("user_id", userAId);
      await clientA.from("experiences").delete().eq("user_id", userAId);
      await clientA.from("education").delete().eq("user_id", userAId);
      await clientA.from("certifications").delete().eq("user_id", userAId);
      await clientA.from("profile_links").delete().eq("user_id", userAId);
      await clientA.from("profile_preferences").delete().eq("user_id", userAId);
      await clientA.from("profile_personal").delete().eq("user_id", userAId);
    }
    if (clientB && userBId) {
      await clientB.from("applications").delete().eq("user_id", userBId);
      await clientB.from("jobs").delete().eq("user_id", userBId);
      await clientB.from("documents").delete().eq("user_id", userBId);
      await clientB.from("answer_bank").delete().eq("user_id", userBId);
      await clientB.from("skills").delete().eq("user_id", userBId);
      await clientB.from("languages").delete().eq("user_id", userBId);
      await clientB.from("experiences").delete().eq("user_id", userBId);
      await clientB.from("education").delete().eq("user_id", userBId);
      await clientB.from("certifications").delete().eq("user_id", userBId);
      await clientB.from("profile_links").delete().eq("user_id", userBId);
      await clientB.from("profile_preferences").delete().eq("user_id", userBId);
      await clientB.from("profile_personal").delete().eq("user_id", userBId);
    }
  });

  it("1. Profile Personal & Profile Preferences domain service end-to-end", async () => {
    const profile = await upsertPersonalProfile(clientA, {
      first_name: "Alice",
      last_name: "Tester",
      professional_title: "Senior Engineer",
    });
    expect(profile.first_name).toBe("Alice");

    const fetched = await getPersonalProfile(clientA);
    expect(fetched?.last_name).toBe("Tester");

    // Cross-tenant check: User B cannot fetch User A's profile
    const fetchedB = await getPersonalProfile(clientB);
    expect(fetchedB).toBeNull();

    const prefs = await upsertProfilePreferences(clientA, {
      remote_preference: "REMOTE",
      preferred_currency: "USD",
    });
    expect(prefs.remote_preference).toBe("REMOTE");
  });

  it("2. Experiences, Education, Certifications, Profile Links CRUD", async () => {
    const exp = await createExperience(clientA, {
      company_name: "Acme Corp",
      job_title: "Developer",
      start_date: "2022-01-01",
      is_current: true,
    });
    expect(exp.company_name).toBe("Acme Corp");

    const expList = await listExperiences(clientA);
    expect(expList.length).toBeGreaterThanOrEqual(1);

    await updateExperience(clientA, exp.id, { job_title: "Lead Developer" });
    await deleteExperience(clientA, exp.id);

    // Education
    const edu = await createEducation(clientA, {
      institution: "MIT",
      degree: "B.S. CS",
    });
    expect(edu.institution).toBe("MIT");
    await deleteEducation(clientA, edu.id);

    // Certifications
    const cert = await createCertification(clientA, {
      name: "AWS Solutions Architect",
    });
    expect(cert.name).toBe("AWS Solutions Architect");
    await deleteCertification(clientA, cert.id);

    // Profile Links
    const link = await createProfileLink(clientA, {
      link_type: "GITHUB",
      url: "https://github.com/alice",
    });
    expect(link.url).toBe("https://github.com/alice");
    await deleteProfileLink(clientA, link.id);
  }, 30000);

  it("3. Case-insensitive duplicate skills and languages produce ConflictError", async () => {
    const skill1 = await createSkill(clientA, {
      skill_name: "TypeScript",
      proficiency: "EXPERT",
    });
    expect(skill1.skill_name).toBe("TypeScript");

    await expect(
      createSkill(clientA, { skill_name: "typescript" }),
    ).rejects.toThrow(ConflictError);

    await deleteSkill(clientA, skill1.id);

    const lang1 = await createLanguage(clientA, {
      language: "English",
      proficiency: "NATIVE",
    });
    expect(lang1.language).toBe("English");

    await expect(
      createLanguage(clientA, { language: "ENGLISH" }),
    ).rejects.toThrow(ConflictError);

    await deleteLanguage(clientA, lang1.id);
  });

  it("4. Global Portals catalog", async () => {
    const portals = await listPortals(clientA);
    expect(portals.length).toBeGreaterThanOrEqual(7);

    const linkedin = await getPortalByCode(clientA, "LINKEDIN");
    expect(linkedin.name).toBe("LinkedIn");
  });

  it("5. Jobs & Applications lifecycle: atomic status transition & soft-delete", async () => {
    // 1. Create Job for User A
    const jobA = await createJob(clientA, {
      company_name: "Tech Corp",
      job_title: "Software Engineer",
      status: "SAVED",
    });
    expect(jobA.company_name).toBe("Tech Corp");

    // RLS: User B cannot fetch User A's job
    await expect(getJob(clientB, jobA.id)).rejects.toThrow(NotFoundError);

    // 2. Create Application for User A
    const appA = await createApplication(clientA, {
      job_id: jobA.id,
      status: "SAVED",
      notes: "Initial draft",
    });
    expect(appA.status).toBe("SAVED");

    // 3. Composite FK Isolation: User B cannot link an application to User A's job
    await expect(
      createApplication(clientB, {
        job_id: jobA.id,
        status: "SAVED",
      }),
    ).rejects.toThrow(ValidationError);

    // 4. Atomic Status Transitions: SAVED -> INTERESTED -> APPLIED -> ASSESSMENT -> INTERVIEW -> OFFER -> REJECTED
    const t1 = await transitionApplicationStatus(
      clientA,
      appA.id,
      "INTERESTED",
    );
    expect(t1.status).toBe("INTERESTED");

    // Idempotent same-status transition is a successful no-op
    const t1Same = await transitionApplicationStatus(
      clientA,
      appA.id,
      "INTERESTED",
    );
    expect(t1Same.status).toBe("INTERESTED");

    const t2 = await transitionApplicationStatus(clientA, appA.id, "APPLIED");
    expect(t2.status).toBe("APPLIED");
    expect(t2.applied_at).not.toBeNull();

    const t3 = await transitionApplicationStatus(
      clientA,
      appA.id,
      "ASSESSMENT",
    );
    expect(t3.status).toBe("ASSESSMENT");

    const t4 = await transitionApplicationStatus(clientA, appA.id, "INTERVIEW");
    expect(t4.status).toBe("INTERVIEW");

    const t5 = await transitionApplicationStatus(clientA, appA.id, "OFFER");
    expect(t5.status).toBe("OFFER");

    const t6 = await transitionApplicationStatus(clientA, appA.id, "REJECTED");
    expect(t6.status).toBe("REJECTED");

    // Terminal state: REJECTED cannot transition to anything
    await expect(
      transitionApplicationStatus(clientA, appA.id, "APPLIED"),
    ).rejects.toThrow(InvalidStateTransitionError);

    // 5. Application Soft Deletion & Restoration
    const appForDelete = await createApplication(clientA, {
      job_id: jobA.id,
      status: "SAVED",
    });
    await softDeleteApplication(clientA, appForDelete.id);

    // Normal getApplication excludes deleted
    await expect(getApplication(clientA, appForDelete.id)).rejects.toThrow(
      NotFoundError,
    );

    // Deleted application cannot be transitioned
    await expect(
      transitionApplicationStatus(clientA, appForDelete.id, "APPLIED"),
    ).rejects.toThrow(NotFoundError);

    // Deleted application listed under deletedApplications
    const deletedList = await listDeletedApplications(clientA);
    expect(deletedList.data.some((a) => a.id === appForDelete.id)).toBe(true);

    const deletedApp = await getDeletedApplication(clientA, appForDelete.id);
    expect(deletedApp.deleted_at).not.toBeNull();

    // Restore application
    const restored = await restoreApplication(clientA, appForDelete.id);
    expect(restored.deleted_at).toBeNull();

    const activeApp = await getApplication(clientA, appForDelete.id);
    expect(activeApp.id).toBe(appForDelete.id);

    // Verify Job deletion is restricted when applications exist
    await expect(deleteJob(clientA, jobA.id)).rejects.toThrow(ConflictError);

    // Cleanup soft-deleted application
    await softDeleteApplication(clientA, appForDelete.id);
  }, 30000);

  it("6. Application Answers Immutability at PostgreSQL Grant and Trigger level", async () => {
    const job = await createJob(clientA, {
      company_name: "Answer Co",
      job_title: "Backend Dev",
    });
    const app = await createApplication(clientA, {
      job_id: job.id,
      status: "APPLIED",
    });

    const answer = await createApplicationAnswer(clientA, {
      application_id: app.id,
      question_text: "Years of Experience?",
      answer_value: "5 years",
      answer_type: "TEXT",
      source_type: "USER",
    });
    expect(answer.answer_value).toBe("5 years");

    const answersList = await listApplicationAnswers(clientA, app.id);
    expect(answersList.length).toBe(1);

    // Direct UPDATE query on application_answers is rejected by trigger / grant
    const { error: updateError } = await clientA
      .from("application_answers")
      .update({ answer_value: "10 years" })
      .eq("id", answer.id);
    expect(updateError).not.toBeNull();
    expect(updateError?.message).toMatch(/permission denied|immutable/i);

    // Direct DELETE query on application_answers is rejected by trigger / grant
    const { error: deleteError } = await clientA
      .from("application_answers")
      .delete()
      .eq("id", answer.id);
    expect(deleteError).not.toBeNull();
    expect(deleteError?.message).toMatch(/permission denied|immutable/i);
  });

  it("7. Document Logical Group Versioning, Active Constraint & Cross-Tenant Security", async () => {
    // 1. Initial upload creates document group with version 1
    const file1 = new Blob(["Resume Content V1"], { type: "application/pdf" });
    const docV1 = await uploadDocument(clientA, {
      file: file1,
      fileName: "resume_v1.pdf",
      category: "resumes",
      documentType: "RESUME",
    });
    expect(docV1.version).toBe(1);
    expect(docV1.is_active).toBe(true);

    const groupId = docV1.document_group_id;
    expect(groupId).toBeDefined();

    // 2. Cross-tenant attack check: User B tries to replace version on User A's document group
    const fileB = new Blob(["Hacked Resume"], { type: "application/pdf" });
    await expect(
      replaceDocumentVersion(clientB, groupId, {
        file: fileB,
        fileName: "hacked_resume.pdf",
      }),
    ).rejects.toThrow();

    // 3. Document replacement by User A creates version 2 and deactivates version 1
    const file2 = new Blob(["Resume Content V2"], { type: "application/pdf" });
    const docV2 = await replaceDocumentVersion(clientA, groupId, {
      file: file2,
      fileName: "resume_v2.pdf",
    });
    expect(docV2.version).toBe(2);
    expect(docV2.is_active).toBe(true);

    const oldV1 = await getDocument(clientA, docV1.id);
    expect(oldV1.is_active).toBe(false);

    // Verify historical version audit list
    const versions = await listDocumentVersions(clientA, groupId);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);

    // 4. Deactivation sets active version to is_active = false
    await deactivateDocument(clientA, groupId);

    const activeList = await listDocuments(clientA, {
      document_group_id: groupId,
      is_active: true,
    });
    expect(activeList.data.length).toBe(0);

    // Download binary check
    const downloadedBlob = await downloadDocument(clientA, docV2.id);
    expect(downloadedBlob).toBeDefined();

    // Storage compensation: upload invalid metadata triggers binary cleanup
    const badFile = new Blob(["Test"], { type: "application/pdf" });
    await expect(
      uploadDocument(clientA, {
        file: badFile,
        fileName: "invalid_doc.pdf",
        category: "resumes",
        documentType:
          "INVALID_TYPE" as unknown as import("@jobpilot/types").DocumentType,
      }),
    ).rejects.toThrow();
  }, 30000);

  it("8. Job deletion restriction invariant & cross-tenant isolation", async () => {
    // A. Job without applications -> physical delete is allowed
    const emptyJob = await createJob(clientA, {
      company_name: "Empty Job Corp",
      job_title: "Draft Position",
    });
    await deleteJob(clientA, emptyJob.id);
    await expect(getJob(clientA, emptyJob.id)).rejects.toThrow(NotFoundError);

    // B. Job with Application -> physical delete rejected with ConflictError
    const jobWithApp = await createJob(clientA, {
      company_name: "App Co",
      job_title: "Frontend Lead",
    });
    const app = await createApplication(clientA, {
      job_id: jobWithApp.id,
      status: "SAVED",
    });

    await expect(deleteJob(clientA, jobWithApp.id)).rejects.toThrow(
      ConflictError,
    );

    // Verify Job and Application still exist
    const fetchedJob = await getJob(clientA, jobWithApp.id);
    expect(fetchedJob.id).toBe(jobWithApp.id);

    const fetchedApp = await getApplication(clientA, app.id);
    expect(fetchedApp.id).toBe(app.id);

    // C. Job with Application Answer -> physical delete rejected & answers remain intact
    const answer = await createApplicationAnswer(clientA, {
      application_id: app.id,
      question_text: "Notice period?",
      answer_value: "30 days",
      answer_type: "TEXT",
      source_type: "USER",
    });
    expect(answer.answer_value).toBe("30 days");

    await expect(deleteJob(clientA, jobWithApp.id)).rejects.toThrow(
      ConflictError,
    );

    const answersList = await listApplicationAnswers(clientA, app.id);
    expect(answersList.length).toBe(1);

    // D. Cross-tenant job deletion attempt by User B
    await expect(deleteJob(clientB, jobWithApp.id)).rejects.toThrow(
      NotFoundError,
    );
    const jobStillExists = await getJob(clientA, jobWithApp.id);
    expect(jobStillExists.id).toBe(jobWithApp.id);
  }, 30000);
});
