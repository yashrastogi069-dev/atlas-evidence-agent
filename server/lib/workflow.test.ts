import { describe, expect, it } from "vitest";
import { buildDraftValues, buildWorkflowReview } from "./workflow";

describe("controlled workflow behavior", () => {
  it("always creates a draft in the pending approval state", () => {
    expect(buildDraftValues({ title: " Client note ", draftType: "response", content: " Draft response ", targetSystem: "CRM", requestedByUserId: 3 })).toEqual({
      title: "Client note",
      draftType: "response",
      content: "Draft response",
      sourceMessageId: null,
      targetSystem: "CRM",
      requestedByUserId: 3,
      status: "pending_approval",
    });
  });

  it("records an administrator decision without authorizing an external action", () => {
    const result = buildWorkflowReview("admin", "approved", 9, "Ready for a human to use.");
    expect(result).toMatchObject({ status: "approved", reviewedByUserId: 9, reviewerNote: "Ready for a human to use.", externalActionPerformed: false });
    expect(result.reviewedAt).toBeInstanceOf(Date);
  });

  it("blocks ordinary users and empty drafts from controlled workflow transitions", () => {
    expect(() => buildWorkflowReview("user", "approved", 9)).toThrow("Only administrators can review workflow drafts.");
    expect(() => buildDraftValues({ title: " ", draftType: "summary", content: " ", requestedByUserId: 1 })).toThrow("A workflow draft requires a title and content.");
  });
});
