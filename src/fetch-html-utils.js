/**
 * Pure helpers for background fetch_html: request init + response shaping.
 * Dual export: CommonJS for Node/Vitest; globalThis + importScripts for MV3 worker.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module != null && module.exports) {
    module.exports = api;
  }
  root.TermsDigestFetchHtmlUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Stable fetch init for legal-page HTML retrieval (redirect + cookie credentials). */
  const FETCH_HTML_INIT = {
    method: "GET",
    redirect: "follow",
    credentials: "include",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  };

  /**
   * Map a completed Response + body text into the shape content.js expects
   * from the fetch_html message (`ok`, `status`, `finalUrl`, `contentType`, `html`, `htmlLength`).
   */
  function mapFetchHtmlResponse(res, html, fallbackUrl) {
    const body = typeof html === "string" ? html : "";
    const contentType =
      (res && typeof res.headers?.get === "function"
        ? res.headers.get("content-type")
        : null) || "";
    return {
      ok: !!(res && res.ok),
      status: res?.status,
      finalUrl: (res && res.url) || fallbackUrl,
      contentType,
      html: body,
      htmlLength: body.length,
    };
  }

  /**
   * Fetch page HTML with injectable fetch (unit tests) and stable init/shape.
   */
  async function fetchHtml(url, { fetchImpl } = {}) {
    const doFetch = fetchImpl || fetch;
    const res = await doFetch(url, FETCH_HTML_INIT);
    const html = await res.text();
    return mapFetchHtmlResponse(res, html, url);
  }

  return {
    FETCH_HTML_INIT,
    mapFetchHtmlResponse,
    fetchHtml,
  };
});
