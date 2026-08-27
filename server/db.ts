import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditEvents,
  chatMessages,
  conversations,
  evaluationCases,
  evaluationRuns,
  feedback,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeSources,
  type InsertUser,
  users,
  workflowDrafts,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildAuditEvent, type AuditEventInput } from "./lib/audit";
import type { RetrievalCandidate } from "./lib/knowledge";
import { buildDraftValues, buildWorkflowReview, type DraftReviewStatus } from "./lib/workflow";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function addAuditEvent(input: AuditEventInput) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values(buildAuditEvent(input));
}

export async function listKnowledgeSources(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  return db.select().from(knowledgeSources).where(where).orderBy(desc(knowledgeSources.updatedAt));
}

export async function createKnowledgeSource(input: {
  name: string;
  description?: string;
  classification: "internal" | "confidential" | "restricted";
  accessLevel: "all_users" | "admins_only";
  ownerUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(knowledgeSources).values({
    name: input.name,
    description: input.description ?? null,
    classification: input.classification,
    accessLevel: input.accessLevel,
    ownerUserId: input.ownerUserId,
    approvalStatus: "draft",
  });
  return Number(result[0].insertId);
}

export async function getKnowledgeSource(sourceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId)).limit(1);
  return results[0];
}

export async function setKnowledgeSourceApproval(sourceId: number, status: "approved" | "archived" | "draft") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(knowledgeSources).set({ approvalStatus: status }).where(eq(knowledgeSources.id, sourceId));
}

export async function listKnowledgeDocuments(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  return db
    .select({ document: knowledgeDocuments, sourceName: knowledgeSources.name, sourceApproval: knowledgeSources.approvalStatus })
    .from(knowledgeDocuments)
    .innerJoin(knowledgeSources, eq(knowledgeDocuments.sourceId, knowledgeSources.id))
    .where(where)
    .orderBy(desc(knowledgeDocuments.uploadedAt));
}

export async function createKnowledgeDocument(input: {
  sourceId: number;
  title: string;
  originalFilename: string;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  ownerUserId: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(knowledgeDocuments).values({
    ...input,
    metadata: input.metadata ?? null,
    status: "queued",
  });
  return Number(result[0].insertId);
}

export async function updateDocumentProcessing(input: {
  documentId: number;
  status: "queued" | "processing" | "ready" | "failed" | "archived";
  extractionSummary?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db
    .update(knowledgeDocuments)
    .set({
      status: input.status,
      extractionSummary: input.extractionSummary,
      errorMessage: input.errorMessage,
      processedAt: input.status === "ready" || input.status === "failed" ? new Date() : null,
    })
    .where(eq(knowledgeDocuments.id, input.documentId));
}

export async function replaceDocumentChunks(documentId: number, sourceId: number, chunks: Array<{ content: string; keywordTerms: string; semanticTerms: string; tokenEstimate: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
  if (chunks.length) {
    await db.insert(knowledgeChunks).values(chunks.map((chunk, ordinal) => ({ ...chunk, documentId, sourceId, ordinal })));
  }
}

export async function getAuthorizedCandidates(role: "admin" | "user"): Promise<RetrievalCandidate[]> {
  const db = await getDb();
  if (!db) return [];
  // Administrators may curate draft/archived sources, but retrieval always remains restricted to explicitly approved sources.
  const sourcePermission = role === "admin"
    ? eq(knowledgeSources.approvalStatus, "approved")
    : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  const rows = await db
    .select({
      chunk: knowledgeChunks,
      document: knowledgeDocuments,
      source: knowledgeSources,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .innerJoin(knowledgeSources, eq(knowledgeChunks.sourceId, knowledgeSources.id))
    .where(and(eq(knowledgeDocuments.status, "ready"), sourcePermission));
  return rows.map(row => ({
    chunkId: row.chunk.id,
    documentId: row.document.id,
    documentTitle: row.document.title,
    sourceId: row.source.id,
    sourceName: row.source.name,
    content: row.chunk.content,
    keywordTerms: row.chunk.keywordTerms,
    semanticTerms: row.chunk.semanticTerms,
    ordinal: row.chunk.ordinal,
  }));
}

export async function createConversation(ownerUserId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(conversations).values({ ownerUserId, title });
  return Number(result[0].insertId);
}

export async function listConversations(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.ownerUserId, ownerUserId)).orderBy(desc(conversations.updatedAt));
}

export async function getConversationForUser(conversationId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.ownerUserId, ownerUserId))).limit(1);
  return results[0];
}

export async function listConversationMessages(conversationId: number, ownerUserId: number) {
  const conversation = await getConversationForUser(conversationId, ownerUserId);
  if (!conversation) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
}

export async function createChatMessage(input: {
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "answered" | "insufficient_evidence" | "error";
  citationPayload?: unknown;
  retrievalPayload?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(chatMessages).values({
    ...input,
    status: input.status ?? "answered",
    citationPayload: input.citationPayload ?? null,
    retrievalPayload: input.retrievalPayload ?? null,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
  return Number(result[0].insertId);
}

export async function getMessageForUser(messageId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ message: chatMessages })
    .from(chatMessages)
    .innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
    .where(and(eq(chatMessages.id, messageId), eq(conversations.ownerUserId, ownerUserId)))
    .limit(1);
  return rows[0]?.message;
}

export async function addFeedback(input: { messageId: number; rating: "helpful" | "not_helpful" | "serious_issue"; comment?: string; reporterUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(feedback).values({ ...input, comment: input.comment ?? null });
  return Number(result[0].insertId);
}

export async function createWorkflowDraft(input: { title: string; draftType: "response" | "summary" | "record_update" | "other"; content: string; sourceMessageId?: number; targetSystem?: string; requestedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(workflowDrafts).values(buildDraftValues(input));
  return Number(result[0].insertId);
}

export async function listWorkflowDrafts(role: "admin" | "user", userId: number) {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : eq(workflowDrafts.requestedByUserId, userId);
  return db.select().from(workflowDrafts).where(where).orderBy(desc(workflowDrafts.createdAt));
}

export async function reviewWorkflowDraft(draftId: number, reviewerUserId: number, status: DraftReviewStatus, reviewerNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const review = buildWorkflowReview("admin", status, reviewerUserId, reviewerNote);
  await db.update(workflowDrafts).set({ status: review.status, reviewedByUserId: review.reviewedByUserId, reviewerNote: review.reviewerNote, reviewedAt: review.reviewedAt }).where(eq(workflowDrafts.id, draftId));
  return review;
}

export async function listEvaluationCases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evaluationCases).where(eq(evaluationCases.status, "active")).orderBy(desc(evaluationCases.updatedAt));
}

export async function createEvaluationCase(input: { name: string; question: string; expectedAnswer?: string; expectedDocumentId?: number; expectedBehavior: "answer" | "decline"; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(evaluationCases).values({
    ...input,
    expectedAnswer: input.expectedAnswer ?? null,
    expectedDocumentId: input.expectedDocumentId ?? null,
  });
  return Number(result[0].insertId);
}

export async function createEvaluationRun(input: { caseId: number; answer: string; retrievedDocumentIds: number[]; retrievalPass: boolean; behaviorPass: boolean; notes?: string; runByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(evaluationRuns).values({ ...input, notes: input.notes ?? null });
}

export async function listAuditEvents(limit = 80) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
}

export async function getWorkspaceSummary(role: "admin" | "user", userId: number) {
  const sources = await listKnowledgeSources(role);
  const documents = await listKnowledgeDocuments(role);
  const drafts = await listWorkflowDrafts(role, userId);
  const readyDocuments = documents.filter(row => row.document.status === "ready").length;
  return {
    approvedSources: sources.filter(source => source.approvalStatus === "approved").length,
    readyDocuments,
    processingDocuments: documents.filter(row => row.document.status === "processing" || row.document.status === "queued").length,
    pendingDrafts: drafts.filter(draft => draft.status === "pending_approval").length,
  };
}
