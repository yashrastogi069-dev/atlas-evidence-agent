import {
  boolean,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** A curated container of documents that is explicitly approved for retrieval. */
export const knowledgeSources = mysqlTable("knowledgeSources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  sourceType: mysqlEnum("sourceType", ["upload", "connector", "manual"]).default("upload").notNull(),
  classification: mysqlEnum("classification", ["internal", "confidential", "restricted"]).default("internal").notNull(),
  accessLevel: mysqlEnum("accessLevel", ["all_users", "admins_only"]).default("all_users").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["draft", "approved", "archived"]).default("draft").notNull(),
  externalConnection: varchar("externalConnection", { length: 120 }),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Metadata for uploaded or connected firm documents; content bytes stay in object storage. */
export const knowledgeDocuments = mysqlTable("knowledgeDocuments", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 768 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  checksum: varchar("checksum", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "ready", "failed", "archived"]).default("queued").notNull(),
  metadata: json("metadata"),
  extractionSummary: text("extractionSummary"),
  errorMessage: text("errorMessage"),
  ownerUserId: int("ownerUserId").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Searchable text fragments. semanticTerms contains LLM-extracted concepts used in semantic expansion. */
export const knowledgeChunks = mysqlTable("knowledgeChunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  sourceId: int("sourceId").notNull(),
  ordinal: int("ordinal").notNull(),
  content: mediumtext("content").notNull(),
  keywordTerms: text("keywordTerms").notNull(),
  semanticTerms: text("semanticTerms").notNull(),
  tokenEstimate: int("tokenEstimate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: mediumtext("content").notNull(),
  citationPayload: json("citationPayload"),
  retrievalPayload: json("retrievalPayload"),
  status: mysqlEnum("status", ["answered", "insufficient_evidence", "error"]).default("answered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  rating: mysqlEnum("rating", ["helpful", "not_helpful", "serious_issue"]).notNull(),
  comment: text("comment"),
  reporterUserId: int("reporterUserId").notNull(),
  reviewed: boolean("reviewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Append-only operational event record. Application code intentionally exposes insert-only helpers. */
export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  severity: mysqlEnum("severity", ["info", "warning", "high"]).default("info").notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evaluationCases = mysqlTable("evaluationCases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  question: text("question").notNull(),
  expectedAnswer: text("expectedAnswer"),
  expectedDocumentId: int("expectedDocumentId"),
  expectedBehavior: mysqlEnum("expectedBehavior", ["answer", "decline"]).default("answer").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const evaluationRuns = mysqlTable("evaluationRuns", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  answer: mediumtext("answer").notNull(),
  retrievedDocumentIds: json("retrievedDocumentIds").notNull(),
  retrievalPass: boolean("retrievalPass").notNull(),
  behaviorPass: boolean("behaviorPass").notNull(),
  notes: text("notes"),
  runByUserId: int("runByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Drafts never perform external actions. They await a human decision by design. */
export const workflowDrafts = mysqlTable("workflowDrafts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  draftType: mysqlEnum("draftType", ["response", "summary", "record_update", "other"]).default("response").notNull(),
  content: mediumtext("content").notNull(),
  sourceMessageId: int("sourceMessageId"),
  targetSystem: varchar("targetSystem", { length: 100 }),
  status: mysqlEnum("status", ["pending_approval", "approved", "rejected", "cancelled"]).default("pending_approval").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewerNote: text("reviewerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
