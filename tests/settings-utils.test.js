import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_OPENAI_MODEL,
  normalizeOpenaiApiKey,
  normalizeOpenaiModel,
  resolveOptionsOpenaiModelField,
  resolveOptionsOpenaiApiKeyField,
} = require("../src/settings-utils.js");

describe("DEFAULT_OPENAI_MODEL", () => {
  it("is gpt-4o-mini", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-4o-mini");
  });
});

describe("normalizeOpenaiApiKey", () => {
  it("trims strings and maps non-strings to empty", () => {
    expect(normalizeOpenaiApiKey("  sk-abc  ")).toBe("sk-abc");
    expect(normalizeOpenaiApiKey("")).toBe("");
    expect(normalizeOpenaiApiKey("   ")).toBe("");
    expect(normalizeOpenaiApiKey(null)).toBe("");
    expect(normalizeOpenaiApiKey(undefined)).toBe("");
    expect(normalizeOpenaiApiKey(42)).toBe("");
  });
});

describe("normalizeOpenaiModel (background getSettings)", () => {
  it("trims non-empty models and defaults missing/blank/non-string", () => {
    expect(normalizeOpenaiModel(" gpt-4o ")).toBe("gpt-4o");
    expect(normalizeOpenaiModel("gpt-4o-mini")).toBe("gpt-4o-mini");
    expect(normalizeOpenaiModel("")).toBe("gpt-4o-mini");
    expect(normalizeOpenaiModel("   ")).toBe("gpt-4o-mini");
    expect(normalizeOpenaiModel(null)).toBe("gpt-4o-mini");
    expect(normalizeOpenaiModel(undefined)).toBe("gpt-4o-mini");
    expect(normalizeOpenaiModel(123)).toBe("gpt-4o-mini");
  });

  it("accepts an override default", () => {
    expect(normalizeOpenaiModel("", "gpt-4o")).toBe("gpt-4o");
  });
});

describe("resolveOptionsOpenaiModelField (options form)", () => {
  it("uses || default — whitespace-only is preserved (unlike background)", () => {
    expect(resolveOptionsOpenaiModelField(undefined)).toBe("gpt-4o-mini");
    expect(resolveOptionsOpenaiModelField(null)).toBe("gpt-4o-mini");
    expect(resolveOptionsOpenaiModelField("")).toBe("gpt-4o-mini");
    expect(resolveOptionsOpenaiModelField("gpt-4o")).toBe("gpt-4o");
    expect(resolveOptionsOpenaiModelField("   ")).toBe("   ");
  });
});

describe("resolveOptionsOpenaiApiKeyField", () => {
  it("mirrors historical data.openaiApiKey || \"\"", () => {
    expect(resolveOptionsOpenaiApiKeyField(undefined)).toBe("");
    expect(resolveOptionsOpenaiApiKeyField(null)).toBe("");
    expect(resolveOptionsOpenaiApiKeyField("")).toBe("");
    expect(resolveOptionsOpenaiApiKeyField("sk-x")).toBe("sk-x");
  });
});
