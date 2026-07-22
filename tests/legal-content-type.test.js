import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getLegalContentType, getLegalContentTypeFromSignals } = require(
  "../src/legal-content-type.js"
);

describe("getLegalContentTypeFromSignals", () => {
  it("classifies privacy variants", () => {
    expect(getLegalContentTypeFromSignals({ text: "Privacy Policy", id: "" })).toBe("privacy");
    expect(getLegalContentTypeFromSignals({ text: "", id: "privacyStatement" })).toBe("privacy");
    expect(getLegalContentTypeFromSignals({ text: "See our privacy-statement", id: "" })).toBe(
      "privacy"
    );
  });

  it("classifies terms / EULA / conditions", () => {
    expect(getLegalContentTypeFromSignals({ text: "Terms of Service", id: "" })).toBe("terms");
    expect(getLegalContentTypeFromSignals({ text: "TermsAndConditions", id: "" })).toBe("terms");
    expect(getLegalContentTypeFromSignals({ text: "EULA", id: "" })).toBe("terms");
    expect(getLegalContentTypeFromSignals({ text: "Conditions", id: "footer-link" })).toBe("terms");
  });

  it("classifies cookie, security, and refund families", () => {
    expect(getLegalContentTypeFromSignals({ text: "Cookie Policy", id: "" })).toBe("cookie");
    expect(getLegalContentTypeFromSignals({ text: "Security Notice", id: "" })).toBe("security");
    expect(getLegalContentTypeFromSignals({ text: "Refund Policy", id: "" })).toBe("refund");
    expect(getLegalContentTypeFromSignals({ text: "Cancellation", id: "" })).toBe("refund");
    expect(getLegalContentTypeFromSignals({ text: "Return Policy", id: "" })).toBe("refund");
  });

  it("defaults to generic legal", () => {
    expect(getLegalContentTypeFromSignals({ text: "Learn more", id: "info" })).toBe("legal");
    expect(getLegalContentTypeFromSignals({})).toBe("legal");
  });

  it("prefers privacy over later keywords when both appear", () => {
    // privacy check runs before terms; "privacy terms" should stay privacy
    expect(getLegalContentTypeFromSignals({ text: "Privacy Terms", id: "" })).toBe("privacy");
  });
});

describe("getLegalContentType (element-shaped)", () => {
  it("reads textContent and id attribute", () => {
    const el = {
      textContent: "Cookie Notice",
      getAttribute(name) {
        return name === "id" ? "cookie-link" : null;
      }
    };
    expect(getLegalContentType(el)).toBe("cookie");
  });

  it("returns legal for nullish elements", () => {
    expect(getLegalContentType(null)).toBe("legal");
    expect(getLegalContentType(undefined)).toBe("legal");
  });
});
