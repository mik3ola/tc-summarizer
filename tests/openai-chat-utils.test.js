import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  EMPTY_MODEL_RESPONSE_ERROR,
  DEFAULT_CHAT_TEMPERATURE,
  buildOwnKeyPrompt,
  buildOpenAiChatCompletionBody,
  resolveOpenAiChatContent,
} = require("../src/openai-chat-utils.js");

describe("buildOwnKeyPrompt", () => {
  it("includes legal-summary system guidance and JSON schema fields", () => {
    const prompt = buildOwnKeyPrompt();
    expect(prompt.system).toContain("legal pages");
    expect(typeof prompt.user).toBe("function");

    const user = prompt.user({
      url: "https://example.com/terms",
      text: "Auto-renew applies.",
    });
    expect(user).toContain("https://example.com/terms");
    expect(user).toContain("Auto-renew applies.");
    expect(user).toContain('"title"');
    expect(user).toContain('"red_flags"');
    expect(user).toContain('"confidence": "low"|"medium"|"high"');
    expect(user).toContain("STRICT JSON");
  });
});

describe("buildOpenAiChatCompletionBody", () => {
  it("builds system+user messages with historical temperature", () => {
    const body = buildOpenAiChatCompletionBody({
      model: "gpt-4o-mini",
      input: { url: "https://ex.com/p", text: "privacy text" },
    });
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBe(DEFAULT_CHAT_TEMPERATURE);
    expect(body.temperature).toBe(0.2);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: buildOwnKeyPrompt().system,
    });
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("https://ex.com/p");
    expect(body.messages[1].content).toContain("privacy text");
  });
});

describe("resolveOpenAiChatContent", () => {
  it("returns assistant content from choices[0].message.content", () => {
    expect(
      resolveOpenAiChatContent({
        choices: [{ message: { content: '{"title":"T"}' } }],
      })
    ).toEqual({ ok: true, content: '{"title":"T"}' });
  });

  it("rejects empty, missing, or blank content with historical error", () => {
    expect(resolveOpenAiChatContent(null)).toEqual({
      ok: false,
      error: EMPTY_MODEL_RESPONSE_ERROR,
      content: null,
    });
    expect(resolveOpenAiChatContent({})).toEqual({
      ok: false,
      error: "Empty model response.",
      content: null,
    });
    expect(
      resolveOpenAiChatContent({ choices: [{ message: { content: "" } }] })
    ).toEqual({
      ok: false,
      error: EMPTY_MODEL_RESPONSE_ERROR,
      content: null,
    });
    expect(
      resolveOpenAiChatContent({ choices: [{ message: {} }] })
    ).toEqual({
      ok: false,
      error: EMPTY_MODEL_RESPONSE_ERROR,
      content: null,
    });
  });
});
