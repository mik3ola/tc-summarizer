import { describe, it, expect } from "vitest";

/**
 * Validation logic for delete account confirmation.
 * Must match the backend expectation: confirmation === "DELETE"
 */
function isValidDeleteConfirmation(value) {
  return (value || "").trim() === "DELETE";
}

describe("isValidDeleteConfirmation", () => {
  it("returns true for exact 'DELETE'", () => {
    expect(isValidDeleteConfirmation("DELETE")).toBe(true);
  });

  it("returns false for case variations", () => {
    expect(isValidDeleteConfirmation("delete")).toBe(false);
    expect(isValidDeleteConfirmation("Delete")).toBe(false);
    expect(isValidDeleteConfirmation("DELET")).toBe(false);
  });

  it("returns true when trimmed value is DELETE (backend also trims)", () => {
    expect(isValidDeleteConfirmation(" DELETE")).toBe(true);
    expect(isValidDeleteConfirmation("DELETE ")).toBe(true);
    expect(isValidDeleteConfirmation("  DELETE  ")).toBe(true);
  });

  it("returns false for empty or null", () => {
    expect(isValidDeleteConfirmation("")).toBe(false);
    expect(isValidDeleteConfirmation(null)).toBe(false);
    expect(isValidDeleteConfirmation(undefined)).toBe(false);
  });
});
