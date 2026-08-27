# Atlas Evidence Agent: Firm Activation & Connection Checklist

**Purpose.** The core workspace is built. This checklist identifies only the remaining firm-specific inputs, account connections, and approvals needed to move from the empty secure workspace to a controlled pilot. Do **not** place credentials, client documents, API tokens, user lists, database exports, or other confidential material in this public repository. Supply sensitive access through the platform’s secure connection or secret-management flow when requested.

> **Recommended activation order:** begin with one approved, low-risk document collection and a limited user group. Validate retrieval and review controls before adding any connected business system.

## 1. Minimum information needed to begin the pilot

| Needed from the firm | Why it is needed | Recommended first choice |
|---|---|---|
| **Pilot use case** | Defines the answer style, test cases, and success measures. | One repetitive internal policy, operations, product, or project-knowledge question set. |
| **Named business owner** | Accepts the source scope, evaluates answers, and decides whether to expand. | The manager responsible for the underlying process. |
| **First approved source collection** | Gives the agent permitted evidence to retrieve. | 10–30 current, non-sensitive or low-risk PDFs/DOCX/CSV files. |
| **Source classification and audience** | Controls who can retrieve the information. | Start with `Internal` and “All signed-in users” only if every pilot user is entitled to view it. |
| **Expected questions and answers** | Builds the evaluation set before wider access. | 30–50 real questions, including 5–10 that should result in “insufficient evidence.” |
| **Human reviewers** | Provide content validation and workflow approvals. | One subject-matter reviewer and one administrator. |
| **Pilot success threshold** | Makes the scale/stop decision objective. | Agree a target for source correctness, reviewer acceptance, time saved, and incident-free use. |

## 2. Knowledge-source readiness

The built-in **Approved Sources** workspace already supports the first phase. An administrator should create a source boundary, identify its owner and audience, upload documents, confirm ingestion, and then approve the source. Draft and archived sources remain excluded from retrieval for all roles, including administrators.

| Check | What to confirm before approving a source |
|---|---|
| **Authority** | The documents are current and are the firm’s authoritative reference for the selected topic. |
| **Permission** | Each proposed user is already permitted to read the material outside the agent. |
| **Classification** | The source is correctly labelled Internal, Confidential, or Restricted. For the first pilot, avoid Restricted material unless security and compliance approve the scope. |
| **Owner** | A named person or team accepts responsibility for currency, updates, and archival. |
| **Scope** | The source has a clear topic boundary; do not upload an entire file estate or mixed uncurated folders. |
| **Quality** | Scanned and image-only documents are reviewed for extractable text; PDFs, DOCX, XLS/XLSX, CSV, TXT, Markdown, and JSON are currently supported. |
| **Review cadence** | Decide when the source owner will re-check content, for example after a policy change or at a defined interval. |

## 3. Account connections to add after the knowledge pilot

Do not connect all systems at once. Select one connection whose value directly supports the approved pilot workflow. Every first connection should be **read-only** for retrieval or **draft-only** for workflow assistance. No current workspace capability will write to an external system.

| System | Information or approval to provide | Initial scope to authorize | Do not authorize initially |
|---|---|---|---|
| **Microsoft SharePoint** | The selected site or document library, its business owner, and an approved Microsoft 365 administrator. | Read the named approved library only; preserve existing user/group permissions where possible. | Tenant-wide file access, personal OneDrive content, edit/delete permissions. |
| **Google Drive** | The selected Shared Drive or folder, Drive owner, and Google Workspace administrator if organizational approval is needed. | Read selected shared folders only; use an approved dedicated integration identity where policy allows. | Personal drives, unrestricted domain-wide access, file modification. |
| **CRM** | CRM provider, approved sandbox/read-only environment, business owner, and the exact fields permitted for lookup. | Read-only account/contact/case lookup; create internal draft record-update proposals in Atlas. | Create/update/delete records, send communications, opportunity changes, finance fields. |
| **Slack** | Workspace administrator approval, named channel(s), and an agreed use case such as drafting a channel response. | Read approved reference channels only, or draft a response for an employee to post. | Automatic posting, direct-message access, broad workspace search without approval. |
| **Microsoft Teams** | Microsoft 365 administrator approval, selected team/channel, and agreed permitted content. | Read approved channel files or prepare a draft for a human to post. | Automatic message posting, broad chat access, calendar or user-directory changes. |
| **Identity provider / SSO** | Identity owner, group-to-role mapping, and offboarding requirements. | Map named administrator and pilot-user groups to application roles. | Broad privileged role assignment or unmanaged external access. |

## 4. Security, privacy, and governance decisions

Before adding Confidential or Restricted data, the firm should provide a written or recorded decision on the following matters. The answers do not need to be placed in GitHub; they should be maintained in the firm’s normal security and compliance record.

| Decision | Firm input needed |
|---|---|
| **Permitted data** | Which categories of data may be sent to the application and model service, and which are prohibited? |
| **Retention** | How long should original files, extracted passages, conversations, audit records, and feedback remain available? |
| **Jurisdiction and regulatory obligations** | Any applicable client confidentiality, contractual, privacy, records-management, or industry requirements. |
| **Access administration** | Who can grant or remove the `admin` and `user` roles, and how will leavers or role changes be handled? |
| **Incident owner** | Who investigates incorrect access, problematic output, unexpected source content, or suspected data exposure? |
| **Workflow authority** | Which actions must always require human approval, and which can never be automated? |
| **External vendor review** | Whether the company has approved the relevant model, storage, and identity services for the selected data class. |

## 5. How to begin safely in the current workspace

1. Sign in as an administrator and open **Approved Sources**.
2. Create one narrow source with its classification, permitted audience, and business purpose.
3. Upload the approved initial documents. Confirm that each document’s ingestion state is `Ready`.
4. Approve the source only after the source owner verifies the uploaded corpus.
5. Open **Evaluation Lab** and add realistic questions, including questions that should be declined due to absent evidence.
6. Use **Knowledge Agent** in evidence-answer mode. Review citations and record feedback on errors or uncertainty.
7. Use draft and plan modes only for internal content. Route every draft through **Draft Workflow** for human review.
8. Review the **Audit & Controls** activity record and owner notifications during the pilot.
9. Hold a pilot decision meeting with the business owner, administrator, and relevant security/compliance representatives before connecting a business system.

## 6. What to send next

When you are ready, you only need to reply with the following non-sensitive summary. I will then tailor the next build phase and request any secure account authorization only when it is specifically necessary.

| Reply item | Example format |
|---|---|
| Firm type and pilot department | “Professional-services firm; Operations team.” |
| First use case | “Answer staff questions from our approved travel and onboarding policies.” |
| First source type | “A SharePoint library” or “15 PDFs we will upload manually.” |
| Pilot users | “One administrator, two policy owners, and ten staff users.” |
| Data sensitivity | “Internal only” or “Confidential; no client data in phase one.” |
| Primary success measure | “Reduce time to find an approved policy answer while every response cites a valid source.” |
| First desired connection, if any | “Google Drive shared folder, read-only” or “No connection until the manual-upload pilot passes.” |

## 7. Public-repository safeguard

The public repository is for code and public documentation only. Never upload firm documents, screenshots containing sensitive data, exported audit logs, `.env` files, credentials, connection configuration exports, database backups, client names, or real evaluation examples to the repository. Review `git status` before each push and keep live firm data only in the secured application storage and database.
