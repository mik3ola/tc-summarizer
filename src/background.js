// Configuration
const DEFAULT_MODEL = "gpt-4o-mini";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const MAX_TEXT_CHARS = 45_000; // keep request size reasonable
const DEFAULT_SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
// Anon key is safe to expose - it's a public key meant for client-side use
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNjMwNjYsImV4cCI6MjA1MTgzOTA2Nn0.1umoIHDTHX8NXU_5JlVJMx14LvxOIGXiZOg2wFHqfBE";

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
    "subscriptionPlan",
    "supabaseSession",
    "preferences"
  ]);
  
  const session = data.supabaseSession || null;
  
  // Check if session is expired (with 5 minute buffer)
  const isSessionExpired = session?.expires_at && (session.expires_at - 300000) < Date.now();
  
  return {
    openaiApiKey: typeof data.openaiApiKey === "string" ? data.openaiApiKey.trim() : "",
    openaiModel: typeof data.openaiModel === "string" && data.openaiModel.trim() ? data.openaiModel.trim() : DEFAULT_MODEL,
    supabaseUrl: DEFAULT_SUPABASE_URL.trim(), // Always use default
    supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY.trim(), // Always use default
    session: session,
    isSessionExpired: isSessionExpired,
    subscription: data.subscription || null,
    subscriptionPlan: data.subscriptionPlan || null,
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
async function callSupabaseFunction({ supabaseUrl, anonKey, accessToken, input }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      url: input.url,
      text: input.text
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    // Try to parse error as JSON to preserve quotaExceeded flag
    let errorData = null;
    try {
      errorData = JSON.parse(txt);
    } catch {}
    
    // Create error with both message and structured data
    const error = new Error(`Backend error (${res.status}): ${txt.slice(0, 200)}`);
    error.status = res.status;
    error.data = errorData;
    error.quotaExceeded = errorData?.quotaExceeded === true;
    throw error;
  }

  const data = await res.json();
  return data.summary || data;
}

async function refreshSessionIfPossible({ supabaseUrl, anonKey, session }) {
  if (!session?.refresh_token) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anonKey },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;

  const expiresAt = Date.now() + (Number(data.expires_in || 0) * 1000);
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: data.user ? { id: data.user.id, email: data.user.email } : session.user
  };
  await chrome.storage.local.set({
    supabaseSession: next,
    userEmail: next.user?.email || null
  });
  return next;
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

      // Open options page
      if (message.type === "open_options") {
        chrome.tabs.create({ url: chrome.runtime.getURL("src/options.html") });
        sendResponse({ ok: true });
        return;
      }

      // Open options page with upgrade intent
      if (message.type === "open_options_upgrade") {
        chrome.tabs.create({ url: chrome.runtime.getURL("src/options.html?upgrade=true") });
        sendResponse({ ok: true });
        return;
      }

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

        let settings = await getSettings();

        // If session is expired, try to refresh proactively
        if (settings.session?.access_token && settings.isSessionExpired && settings.supabaseAnonKey) {
          const refreshed = await refreshSessionIfPossible({
            supabaseUrl: settings.supabaseUrl,
            anonKey: settings.supabaseAnonKey,
            session: settings.session
          });
          if (refreshed?.access_token) {
            // Reload settings with new session
            settings = await getSettings();
          } else {
            // Clear expired session
            await chrome.storage.local.set({ supabaseSession: null, subscription: null, subscriptionPlan: null });
            settings.session = null;
          }
        }

        // AUTHENTICATION REQUIRED - guests cannot use the service
        const isLoggedIn = !!settings.session?.access_token;
        
        if (!isLoggedIn) {
          sendResponse({
            ok: false,
            error: "Please sign in to use TermsDigest!"
          });
          return;
        }

        // User is logged in - determine API access
        const hasOwnApiKey = !!settings.openaiApiKey;
        const isPro = settings.subscription === "active" && settings.subscriptionPlan === "pro";
        const hasBackendAccess = !!settings.supabaseAnonKey;
        
        // Priority: Pro users should use backend first (to consume their 50/month quota)
        // Only fall back to their own API key when quota is exhausted or backend fails
        // Free users must use backend (quota enforced server-side)
        const shouldTryBackendFirst = hasBackendAccess;
        const canFallbackToOwnKey = isPro && hasOwnApiKey;

        if (!shouldTryBackendFirst && !canFallbackToOwnKey) {
          sendResponse({
            ok: false,
            error: "Backend configuration error. Please contact support."
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
        let usedBackend = false;

        // Always try backend first (for Pro users to consume quota, Free users have no choice)
        if (shouldTryBackendFirst) {
          console.log("[TermsDigest] Using backend with:", {
            supabaseUrl: settings.supabaseUrl,
            hasAnonKey: !!settings.supabaseAnonKey,
            hasAccessToken: !!settings.session?.access_token,
            tokenPreview: settings.session?.access_token?.slice(0, 20) + "...",
            isPro,
            canFallbackToOwnKey
          });
          
          try {
            summary = await callSupabaseFunction({
              supabaseUrl: settings.supabaseUrl,
              anonKey: settings.supabaseAnonKey,
              accessToken: settings.session.access_token,
              input: { url, text }
            });
            usedBackend = true;
          } catch (e) {
            // On 401/unauthorized, try refresh once then retry
            const msg = e?.message || String(e);
            // Check if error has quotaExceeded flag (from callSupabaseFunction)
            const isQuotaExceeded = e?.quotaExceeded === true || e?.status === 429 || msg.includes("Quota exceeded") || msg.includes("quota exceeded");
            
            // If quota exceeded and Pro user has own API key, fall back to it
            if (isQuotaExceeded && canFallbackToOwnKey) {
              const outputText = await callOpenAI({
                apiKey: settings.openaiApiKey,
                model: settings.openaiModel,
                input: { url, text }
              });
              const parsed = safeJsonParse(outputText);
              summary = parsed.ok ? parsed.value : {
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
            } else if (msg.includes("401") || msg.includes("Invalid JWT") || msg.includes("Unauthorized") || msg.includes("Auth failed")) {
              const refreshed = await refreshSessionIfPossible({
                supabaseUrl: settings.supabaseUrl,
                anonKey: settings.supabaseAnonKey,
                session: settings.session
              });
              if (refreshed?.access_token) {
                summary = await callSupabaseFunction({
                  supabaseUrl: settings.supabaseUrl,
                  anonKey: settings.supabaseAnonKey,
                  accessToken: refreshed.access_token,
                  input: { url, text }
                });
                usedBackend = true;
              } else {
                // Token refresh failed - if Pro user has own API key, use that as fallback
                if (canFallbackToOwnKey) {
                  const outputText = await callOpenAI({
                    apiKey: settings.openaiApiKey,
                    model: settings.openaiModel,
                    input: { url, text }
                  });
                  const parsed = safeJsonParse(outputText);
                  summary = parsed.ok ? parsed.value : {
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
                } else {
                  await chrome.storage.local.set({ 
                    supabaseSession: null, 
                    subscription: null, 
                    subscriptionPlan: null,
                    userEmail: null,
                    monthlyUsage: null
                  });
                  throw new Error("Please sign in again");
                }
              }
            } else {
              // Other backend errors - if Pro user has own API key, fall back to it
              if (canFallbackToOwnKey) {
                const outputText = await callOpenAI({
                  apiKey: settings.openaiApiKey,
                  model: settings.openaiModel,
                  input: { url, text }
                });
                const parsed = safeJsonParse(outputText);
                summary = parsed.ok ? parsed.value : {
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
              } else {
                throw e;
              }
            }
          }
        } else if (canFallbackToOwnKey) {
          // No backend access but Pro user has own API key - use it directly
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

        // Cache the result (store original text length for minutes saved calculation)
        await setCache(cacheKey, { 
          createdAt: nowMs(), 
          summary,
          originalTextLength: text.length 
        });
        
        // Increment usage stats
        await incrementStats();

        sendResponse({ ok: true, fromCache: false, summary });
        return;
      }
    } catch (e) {
      console.error("[TermsDigest] Error:", e);
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
      userEmail: message.email || "Subscriber"
    }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
