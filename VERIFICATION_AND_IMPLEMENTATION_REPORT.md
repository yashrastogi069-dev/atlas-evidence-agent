# Atlas Evidence Agent: Implementation & Verification Report

**Report purpose.** This report explains, in practical order, what has been built, how the knowledge agent operates, what was verified in the deep-release review, and the limits that still require real firm data or account authorization. It is public-safe: it contains no credentials, customer data, uploaded firm documents, or connection configuration.

> **Core rule:** Atlas is designed to produce evidence-backed answers from approved firm material and to produce internal drafts—not autonomous external actions.

## 1. What was built

| Area | Delivered capability | Practical outcome |
|---|---|---|
| **Internal access** | Authenticated workspace with administrator and user roles. | Only signed-in users can access protected knowledge functions; administrators manage sources, evaluation, audit review, and draft decisions. |
| **Source governance** | Source register with classification, audience, owner, approval state, archive control, and metadata. | A document collection must be deliberately curated before it can become firm evidence. |
| **Secure ingestion** | PDF, DOCX, XLS/XLSX, CSV, TXT, Markdown, and JSON upload support; original files are stored separately from database metadata. | Documents can be uploaded, processed, status-tracked, and made searchable without storing file bytes in the database. |
| **Hybrid retrieval** | Keyword matching, lightweight semantic-term relevance, bounded query expansion, and evidence reranking. | Retrieval can handle both exact firm vocabulary and related phrasing, while showing the strongest evidence to the answer model. |
| **Evidence-grounded responses** | Cited answer, compare, internal draft, and controlled plan modes; insufficient-evidence response. | The agent can answer from approved passages, compare sources, make internal drafts, or propose controlled next steps. It declines when it lacks sufficient approved evidence. |
| **Permission enforcement** | Retrieval filters by source approval, document readiness, user role, and source audience. | Draft and archived sources never enter retrieval. Administrator-only sources remain unavailable to ordinary users. |
| **Human-controlled workflow** | Draft queue, administrator review, decision state, reviewer note, and no-external-action contract. | Drafts can be reviewed, approved, or returned. Approval records a human decision only; it does not send, post, update, or transact externally. |
| **Quality and governance** | Evaluation lab, feedback capture, serious-issue signal, append-only audit records, and owner notifications. | The firm can test real questions, collect feedback, investigate important events, and bring exceptions to owner attention. |
| **Operational guide** | In-app implementation brief and a separate activation checklist. | The firm has a safe order for piloting sources, creating tests, and connecting systems later. |

## 2. How the agent works, step by step

### Step 1: Curate an evidence boundary

An administrator creates a **source** with a clear purpose, classification (`internal`, `confidential`, or `restricted`), access audience (`all_users` or `admins_only`), and owner. New sources begin in **draft**. They are not retrievable until an administrator explicitly marks them **approved**.

### Step 2: Ingest approved documents

An administrator selects an approved source and uploads a supported document. The original file is written to secure object storage. The application stores only a storage reference, metadata, checksum, owner, processing state, and searchable document details in the relational database. The ingestion process extracts text, creates overlapping chunks, derives keyword and semantic search terms, and writes a concise processing status.

If extraction fails, the document is marked `failed`, a high-severity audit event is written, and an owner-alert payload is prepared. In the deployed environment, the notification helper delivers that alert to the designated owner. A ready document is retrievable only when its source is still approved.

### Step 3: Authorize the request before retrieval

When a user asks a question, the system first determines the user’s role. It filters out documents that are not ready, sources that are draft or archived, and administrator-only sources for ordinary users. This occurs **before** candidate text is passed to the answer model.

### Step 4: Retrieve and rerank evidence

The application normalizes the question, expands it with bounded semantic terms when available, and scores candidate chunks using both keyword overlap and semantic-term relevance. It then reranks evidence using a transparent relevance formula. Only the highest-ranked approved passages are selected for the response context.

### Step 5: Generate a bounded response with citations

The answer model receives the user’s question, the selected passages, and a strict instruction to use only that material. The answer mode supplies a cited answer; compare mode identifies agreement or conflict; draft mode creates internal-only draft content; and plan mode proposes controlled next steps. When the strongest evidence is too weak, the system returns an **insufficient approved evidence** response instead of guessing.

### Step 6: Preserve review and accountability

Each answered question records a conversation message, citation payload, retrieval details, and audit event. The user can mark an answer as useful, insufficient, or a serious issue. Serious issues generate a high-severity audit event and notify the designated owner.

### Step 7: Keep workflows human-controlled

Users can create an internal workflow draft. The draft always begins `pending_approval`. An administrator may approve or reject it once; repeat review of a non-pending draft is rejected. The workflow code explicitly reports `externalActionPerformed: false`. There is no CRM, SharePoint, Google Drive, Slack, Teams, or other business-system write path in this release.

## 3. Deep verification performed

| Verification area | Method | Result |
|---|---|---|
| **Automated unit and procedure tests** | Vitest suite across logout, authorization, controls, hybrid retrieval, audit construction, owner-alert triggers, workflow state logic, source lifecycle, and evaluation-route scenarios. | **28 of 28 tests passed** across 9 test files. |
| **Authorization boundaries** | Added procedure-level tests for unauthenticated access and an ordinary user attempting source creation, evaluation creation, and draft approval. | Protected procedures reject unsigned users; administrator-only operations reject ordinary users before database operations run. |
| **Retrieval normalization** | Tested hybrid ranking, low-relevance decline behavior, chunk overlap, stop-word removal, and semantic-term indexing. | A stemming defect affecting `expenses` was discovered and corrected so its root remains `expense`. |
| **Workflow state integrity** | Tested draft creation, administrator decision, no-external-action result, ordinary-user rejection, blank-draft rejection, and repeated-review rejection. | A missing precondition was strengthened: only a pending draft can now be reviewed. |
| **Source-governance boundaries** | Tested the approval-state and audience matrix used by retrieval filtering. | Draft and archived sources remain unavailable to all users; administrator-only approved sources remain unavailable to ordinary users. |
| **Owner-alert triggers** | Tested alert construction for ingestion failure, serious feedback, and draft-ready review. | Every operational alert carries a specific review reason; the draft-ready message explicitly confirms that no external action occurred. |
| **Route-level escalation and governance** | Exercised administrator procedures with mocked storage and database boundaries: source creation, source approval and archival, archived-source upload refusal, unsupported-file refusal, ingestion failure, serious feedback, and draft creation. | The tested paths record required audit data and invoke the owner-alert helper. Archived or unsupported uploads are rejected before any storage or metadata write occurs. |
| **Evaluation route** | Exercised administrator-only evaluation-case creation and both grounded-answer and expected-decline paths. | Evaluation records retrieval and behavior outcomes; a missing-evidence test does not call the answer generator. |
| **Database schema** | Queried the live schema without inserting test data. | All 10 knowledge-agent tables are present with required source, document, chunk, conversation, feedback, evaluation, workflow, and audit fields. |
| **Database cleanliness** | Counted record totals without reading records. | All knowledge-agent registers are empty, as expected: no fabricated documents, chats, test cases, or firm data were introduced. |
| **Outbound-action audit** | Inspected the agent-specific server-side calls. | Current agent routes call only the model service, secure storage, and owner notification helper. No connected CRM, collaboration, or messaging write action exists. |
| **Type safety and production build** | Ran TypeScript validation and a production build. | Both completed successfully. |
| **Desktop experience** | Rendered Knowledge Agent, Sources, Workflows, Evaluation, Controls, and Guide at 1440 × 960. | All pages rendered with the refined evidence-led visual system. |
| **Mobile experience** | Rendered Sources, Workflows, Evaluation, Controls, and Guide at 390 × 844. | Forms, state controls, registers, and guidance cards remained readable and usable in a single-column layout. |
| **Current runtime health** | Restarted the development server after all changes and reviewed browser/server logs. | The current server starts cleanly; the browser console has no active errors. Historical development errors remain in the old log history but were resolved before this release. |

## 4. Improvements made during this review

The review was not only a checklist; it produced corrective changes. The interface was refined from a generic green dashboard into an **evidence-led firm workspace**. It now uses an Atlas evidence mark, provenance-oriented labels, citation-ledger treatment, audit and decision-register patterns, an amber draft/caution state, clearer hierarchy, and explicit setup paths rather than blank operational screens.

The deep tests also found three implementation improvements. First, the lightweight stemming rule was adjusted so plural terms such as “expenses” retain their useful searchable root. Second, workflow review logic now checks that a draft is still pending before a decision is recorded, preventing duplicate or stale review transitions. Third, the server now validates the document type before storing the original file or creating metadata. The final route-level tests verify that source approval or archival transitions are auditable, archived or unsupported uploads stop before any write, the three owner-alert triggers are invoked with review-specific context, and evaluation preserves the distinction between an evidence-backed answer and a deliberate decline.

## 5. Important limits and what cannot yet be verified

The architecture, permissions, build, zero-data state, and automated core behavior have been verified. However, a genuine end-to-end answer from firm knowledge cannot be verified until the firm provides approved documents; the database intentionally contains no seeded or fabricated content. Likewise, delivery of an owner notification needs a real operational event and the designated owner’s live notification settings.

Connected SharePoint, Google Drive, CRM, Slack, Teams, and identity-provider behavior is intentionally **not present** yet. This is a security boundary, not a missing implementation defect: each connection needs a business owner, least-privilege scope, and the firm’s secure authorization before it can be added and tested.

The production build emits a non-blocking bundle-size advisory. It does not prevent operation, but a later performance pass can code-split less frequently visited administration pages if initial-load speed becomes a concern at scale.

## 6. Practical pilot sequence

1. Start with 10–30 current, low-risk approved documents in one narrow business domain.
2. Assign a source owner and make the source classification and audience explicit.
3. Create 30–50 evaluation questions, including questions that must decline for lack of evidence.
4. Have subject-matter experts judge citations, answer usefulness, and missed evidence.
5. Use draft mode for internal content only, and require reviewer approval before a human takes any real action.
6. Review the audit trail and feedback signals weekly during the pilot.
7. Add exactly one read-only or draft-only system connection only after the pilot meets its agreed quality threshold.

## 7. Repository and release status

The public, source-only repository is [Atlas Evidence Agent](https://github.com/yashrastogi069-dev/atlas-evidence-agent). It contains code and public documentation only. The project’s ignore rules and activation guidance prohibit credentials, firm documents, database exports, connection configuration, and other sensitive material from being committed.

The main limitations to address next are not code changes that can safely be guessed: they are the firm’s first approved source collection, roles and source owners, evaluation questions, data classification policy, and approved account connection scope. The accompanying `CONNECTION_CHECKLIST.md` lists these inputs in the required order.
