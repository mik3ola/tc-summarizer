import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  FETCH_HTML_INIT,
  mapFetchHtmlResponse,
  fetchHtml,
} = require("../src/fetch-html-utils.js");

describe("FETCH_HTML_INIT", () => {
  it("follows redirects, includes credentials, and prefers HTML Accept", () => {
    expect(FETCH_HTML_INIT.method).toBe("GET");
    expect(FETCH_HTML_INIT.redirect).toBe("follow");
    expect(FETCH_HTML_INIT.credentials).toBe("include");
    expect(FETCH_HTML_INIT.headers.Accept).toContain("text/html");
    expect(FETCH_HTML_INIT.headers["Accept-Language"]).toContain("en");
  });
});

describe("mapFetchHtmlResponse", () => {
  it("maps ok response fields and htmlLength", () => {
    const res = {
      ok: true,
      status: 200,
      url: "https://example.com/terms",
      headers: { get: (k) => (k === "content-type" ? "text/html; charset=utf-8" : null) },
    };
    expect(mapFetchHtmlResponse(res, "<html>hi</html>", "https://fallback")).toEqual({
      ok: true,
      status: 200,
      finalUrl: "https://example.com/terms",
      contentType: "text/html; charset=utf-8",
      html: "<html>hi</html>",
      htmlLength: 15,
    });
  });

  it("falls back to request url when Response.url is empty and treats missing content-type as empty", () => {
    const res = {
      ok: false,
      status: 403,
      url: "",
      headers: { get: () => null },
    };
    expect(mapFetchHtmlResponse(res, "blocked", "https://example.com/a")).toEqual({
      ok: false,
      status: 403,
      finalUrl: "https://example.com/a",
      contentType: "",
      html: "blocked",
      htmlLength: 7,
    });
  });

  it("coerces non-string html to empty body", () => {
    const res = {
      ok: true,
      status: 200,
      url: "https://example.com",
      headers: { get: () => "text/html" },
    };
    expect(mapFetchHtmlResponse(res, null, "https://example.com").html).toBe("");
    expect(mapFetchHtmlResponse(res, null, "https://example.com").htmlLength).toBe(0);
  });
});

describe("fetchHtml", () => {
  it("calls injectable fetch with FETCH_HTML_INIT and returns mapped shape", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      url: "https://shop.example/privacy",
      headers: { get: () => "text/html" },
      text: async () => "<body>Privacy</body>",
    }));

    const result = await fetchHtml("https://shop.example/privacy", { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://shop.example/privacy",
      FETCH_HTML_INIT
    );
    expect(result).toEqual({
      ok: true,
      status: 200,
      finalUrl: "https://shop.example/privacy",
      contentType: "text/html",
      html: "<body>Privacy</body>",
      htmlLength: 20,
    });
  });
});
