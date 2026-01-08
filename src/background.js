// Configuration
const DEFAULT_MODEL = "gpt-4o-mini";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const MAX_TEXT_CHARS = 45_000; // keep request size reasonable

// Backend URL - update this when you deploy your backend
const BACKEND_URL = "https://your-backend-url.com/api"; // TODO: Update with your actual backend URL

function nowMs() {
  return Date.now();
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

async function getSettings() {
  const data = await chrome.storage.local.get([
    "openaiApiKey",
    "openaiModel",
    "subscription",
    "authToken",
    "preferences"
  ]);
  
  return {
    openaiApiKey: typeof data.openaiApiKey === "string" ? data.openaiApiKey.trim() : "",
    openaiModel: typeof data.openaiModel === "string" && data.openaiModel.trim() ? data.openaiModel.trim() : DEFAULT_MODEL,
    isSubscribed: data.subscription === "active",
    authToken: data.authToken || null,
    preferences: data.preferences || {}
  };
}

async function getCache(cacheKey) {
  // Check if caching is enabled
  const settings = await getSettings();
  if (settings.preferences?.enableCaching === false) {
    return null; // Caching disabled
  }
  
  const { summariesCache } = await chrome.storage.local.get(["summariesCache"]);
  if (!summariesCache || typeof summariesCache !== "object") return null;
  const entry = summariesCache[cacheKey];
  if (!entry || typeof entry !== "object") return null;
  if (!entry.createdAt || typeof entry.createdAt !== "number") return null;
  if (nowMs() - entry.createdAt > CACHE_TTL_MS) return null;
  return entry;
}

async function setCache(cacheKey, entry) {
  // Check if caching is enabled
  const settings = await getSettings();
  if (settings.preferences?.enableCaching === false) {
    return; // Don't cache if disabled
  }
  
  const { summariesCache } = await chrome.storage.local.get(["summariesCache"]);
  const next = summariesCache && typeof summariesCache === "object" ? { ...summariesCache } : {};
  next[cacheKey] = entry;
  
  // Cap to avoid unbounded growth
  const keys = Object.keys(next);
  if (keys.length > 200) {
    keys
      .sort((a, b) => (next[a]?.createdAt ?? 0) - (next[b]?.createdAt ?? 0))
      .slice(0, keys.length - 200)
      .forEach((k) => delete next[k]);
  }
  await chrome.storage.local.set({ summariesCache: next });
}

async function incrementStats() {
  const { usageStats } = await chrome.storage.local.get(["usageStats"]);
  const stats = usageStats || { totalSummaries: 0 };
  stats.totalSummaries = (stats.totalSummaries || 0) + 1;
  await chrome.storage.local.set({ usageStats: stats });
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    credentials: "include",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5"
    }
  });
  const contentType = res.headers.get("content-type") || "";
  const html = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    finalUrl: res.url || url,
    contentType,
    html,
    htmlLength: html.length
  };
}

function buildPrompt() {
  return {
    system:
      "You summarize website legal pages (terms, privacy, refund, billing). Be concise, cautious, and highlight potentially costly clauses. If unsure, say so.",
    user: (input) => `Summarize this page for a normal user.

Requirements:
- Output STRICT JSON only (no markdown, no extra text).
- Be factual; do not invent clauses.
- Focus on costs/renewals, cancellation/refunds, liability, arbitration/jurisdiction, data sharing/ads, auto-renew, trials, termination, and unusual restrictions.
- Include a short list of quotes to support the biggest risks.

Return JSON with this schema:
{
  "title": string,
  "tldr": string,
  "costs_and_renewal": string[],
  "cancellation_and_refunds": string[],
  "liability_and_disputes": string[],
  "privacy_and_data": string[],
  "red_flags": string[],
  "quotes": { "quote": string, "why_it_matters": string }[],
  "confidence": "low"|"medium"|"high"
}

Page URL: ${input.url}
Page text:
${input.text}
`
  };
}

// Call via backend proxy (for subscribers)
async function callBackendProxy({ authToken, input }) {
  const res = await fetch(`${BACKEND_URL}/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify({
      url: input.url,
      text: input.text
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 401) {
      // Token expired, clear subscription
      await chrome.storage.local.set({ subscription: null, authToken: null });
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(`Backend error (${res.status}): ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.summary || data;
}

// Call OpenAI directly (for free tier with own API key)
async function callOpenAI({ apiKey, model, input }) {
  const prompt = buildPrompt();
  const body = {
    model,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user(input) }
    ],
    temperature: 0.2
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${txt.slice(0, 500)}`);
  }

  const data = await res.json();
  const outputText = data?.choices?.[0]?.message?.content || "";

  if (!outputText) throw new Error("Empty model response.");
  return outputText;
}

function safeJsonParse(maybeJson) {
  try {
    // Handle potential markdown code blocks
    let cleaned = maybeJson.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return { ok: true, value: JSON.parse(cleaned.trim()) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (!message || typeof message !== "object") return;

      // Fetch HTML for a URL
      if (message.type === "fetch_html") {
        const url = normalizeUrl(message.url);
        const result = await fetchHtml(url);
        sendResponse({ ok: true, result });
        return;
      }

      // Get preferences
      if (message.type === "get_preferences") {
        const settings = await getSettings();
        sendResponse({ ok: true, preferences: settings.preferences });
        return;
      }

      // Summarize text
      if (message.type === "summarize_text") {
        const url = normalizeUrl(message.url);
        const cacheKey = `summary:${url}`;

        // Check cache first
        const cached = await getCache(cacheKey);
        if (cached) {
          sendResponse({ ok: true, fromCache: true, summary: cached.summary });
          return;
        }

        const settings = await getSettings();

        // Determine which API to use
        const useBackend = settings.isSubscribed && settings.authToken;
        const useDirectApi = !useBackend && settings.openaiApiKey;

        if (!useBackend && !useDirectApi) {
          sendResponse({
            ok: false,
            error: "No API access. Please login to subscribe or add your own OpenAI API key in Settings."
          });
          return;
        }

        const rawText = typeof message.text === "string" ? message.text : "";
        const text = rawText.length > MAX_TEXT_CHARS ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;
        if (!text.trim()) {
          sendResponse({ ok: false, error: "No text extracted from page." });
          return;
        }

        let summary;

        if (useBackend) {
          // Use backend proxy (subscriber)
          summary = await callBackendProxy({
            authToken: settings.authToken,
            input: { url, text }
          });
        } else {
          // Use direct OpenAI API (free tier)
          const outputText = await callOpenAI({
            apiKey: settings.openaiApiKey,
            model: settings.openaiModel,
            input: { url, text }
          });

          const parsed = safeJsonParse(outputText);
          summary = parsed.ok
            ? parsed.value
            : {
                title: "",
                tldr: outputText.trim(),
                costs_and_renewal: [],
                cancellation_and_refunds: [],
                liability_and_disputes: [],
                privacy_and_data: [],
                red_flags: [],
                quotes: [],
                confidence: "low",
                _note: "Model did not return valid JSON; showing raw output."
              };
        }

        // Cache the result
        await setCache(cacheKey, { createdAt: nowMs(), summary });
        
        // Increment usage stats
        await incrementStats();

        sendResponse({ ok: true, fromCache: false, summary });
        return;
      }
    } catch (e) {
      console.error("[T&C Summarizer] Error:", e);
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();

  return true; // keep the message channel open for async sendResponse
});

// Listen for auth callback from your backend (when implementing OAuth)
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  if (message.type === "auth_callback" && message.token) {
    chrome.storage.local.set({
      subscription: "active",
      authToken: message.token,
      userEmail: message.email || "Subscriber"
    }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
