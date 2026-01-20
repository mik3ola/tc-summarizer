// DOM Elements
const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const statusEl = document.getElementById("status");
const saveApiBtn = document.getElementById("saveApi");
const clearApiBtn = document.getElementById("clearApi");
const clearCacheBtn = document.getElementById("clearCache");
const exportDataBtn = document.getElementById("exportData");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const upgradeBtn = document.getElementById("upgradeBtn");
const refreshStatusBtn = document.getElementById("refreshStatusBtn");

// Auth form
const authFormEl = document.getElementById("authForm");
const authEmailEl = document.getElementById("authEmail");
const authPasswordEl = document.getElementById("authPassword");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const cancelAuthBtn = document.getElementById("cancelAuthBtn");
const planHintEl = document.getElementById("planHint");

// Backend config - removed (always use defaults)

// Default Supabase configuration (same as background.js)
const DEFAULT_SUPABASE_URL = "https://rsxvxezucgczesplmjiw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzeHZ4ZXp1Y2djemVzcGxtaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NjcwNjYsImV4cCI6MjA4MzU0MzA2Nn0.1umoIH60gsytGtmfbgfxr1OZJs_L-62wT_BWVaMt5lw";

// Toggles
const autoHoverEl = document.getElementById("autoHover");
const showRedFlagsEl = document.getElementById("showRedFlags");
const showQuotesEl = document.getElementById("showQuotes");
const enableCachingEl = document.getElementById("enableCaching");
const hoverDelayEl = document.getElementById("hoverDelay");

// Stats
const statSummariesEl = document.getElementById("statSummaries");
const statCachedEl = document.getElementById("statCached");
const statSavedEl = document.getElementById("statSaved");
const usageHintEl = document.getElementById("usageHint");

// Subscription elements
const subBadgeEl = document.getElementById("subBadge");
const subStatusEl = document.getElementById("subStatus");
const subActiveEl = document.getElementById("subActive");
const userEmailEl = document.getElementById("userEmail");
const apiCardEl = document.getElementById("apiCard");
const backendCardEl = document.getElementById("backendCard");
const statsCardEl = document.getElementById("statsCard");

// Modal elements
const modalOverlay = document.getElementById("modalOverlay");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalBtn = document.getElementById("modalBtn");

// Modal functions
function showModal(type, title, message) {
  const icons = {
    success: "✅",
    error: "❌",
    loading: "⏳",
    info: "ℹ️"
  };
  
  modalIcon.textContent = icons[type] || "ℹ️";
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  // Add type class for styling
  modalOverlay.querySelector(".modal-box").className = `modal-box modal-${type}`;
  
  // Show/hide button based on type
  if (type === "loading") {
    modalBtn.style.display = "none";
  } else {
    modalBtn.style.display = "inline-block";
  }
  
  modalOverlay.classList.add("show");
}

function hideModal() {
  modalOverlay.classList.remove("show");
}

// Close modal on button click
modalBtn?.addEventListener("click", hideModal);

// Close modal on overlay click (outside the box)
modalOverlay?.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    hideModal();
  }
});

// Legacy status function (still used for minor feedback)
function showStatus(msg, type = "success") {
  statusEl.textContent = msg;
  statusEl.className = `status show ${type}`;
  setTimeout(() => {
    statusEl.className = "status";
  }, 3000);
}

async function loadSettings() {
  const data = await chrome.storage.local.get([
    "openaiApiKey",
    "openaiModel",
    "subscription",
    "subscriptionPlan",
    "userEmail",
    "supabaseSession",
    "preferences",
    "summariesCache",
    "usageStats",
    "monthlyUsage"
  ]);

  // API settings
  apiKeyEl.value = data.openaiApiKey || "";
  modelEl.value = data.openaiModel || "gpt-4o-mini";

  // Preferences
  const prefs = data.preferences || {};
  autoHoverEl.checked = prefs.autoHover !== false;
  showRedFlagsEl.checked = prefs.showRedFlags !== false;
  showQuotesEl.checked = prefs.showQuotes !== false;
  enableCachingEl.checked = prefs.enableCaching !== false; // Default to true
  hoverDelayEl.value = prefs.hoverDelay || "750";

  // Subscription status
  // Prefer real session if present
  await refreshSupabaseStatusIfPossible({ supabaseSession: data.supabaseSession });
  
  // Refresh data after status update
  const refreshedData = await chrome.storage.local.get(["subscription", "subscriptionPlan", "userEmail", "monthlyUsage"]);
  updateSubscriptionUI(refreshedData.subscription, refreshedData.userEmail, refreshedData.subscriptionPlan);

  // Backend config - always use defaults (not user-configurable)

  // Stats - pass monthly usage and plan
  updateStats(data.summariesCache, data.usageStats, refreshedData.monthlyUsage, refreshedData.subscriptionPlan);
}

function updateSubscriptionUI(subscription, email, plan) {
  const isLoggedIn = !!email;
  // Pro if: (1) subscription is active AND plan is pro, OR (2) plan is pro (fallback for edge cases)
  const isPro = (subscription === "active" && plan === "pro") || plan === "pro";
  
  // API key hint element
  const apiKeyHint = document.getElementById("apiKeyHint");
  const apiKeyBadge = document.getElementById("apiKeyBadge");
  
  if (isPro) {
    // Pro user - logged in with active subscription
    subBadgeEl.textContent = "Pro";
    subBadgeEl.className = "badge badge-success";
    subStatusEl.classList.add("hidden");
    subActiveEl.classList.remove("hidden");
    userEmailEl.textContent = email || "Subscriber";
    planHintEl.textContent = "Pro: 50 summaries/month included. Add your own API key below for unlimited.";
    upgradeBtn.classList.add("hidden");
    refreshStatusBtn.classList.remove("hidden");
    
    // Show stats and API card for Pro users
    statsCardEl?.classList.remove("hidden");
    apiCardEl?.classList.remove("hidden");
    
    // Update API hint for Pro users
    if (apiKeyHint) apiKeyHint.innerHTML = "Your Pro plan is active. Add your own key for <strong>unlimited</strong> usage.";
    if (apiKeyBadge) { apiKeyBadge.textContent = "Optional"; apiKeyBadge.className = "badge badge-info"; }
  } else if (isLoggedIn) {
    // Logged in but not pro → backend free tier available
    subBadgeEl.textContent = "Free";
    subBadgeEl.className = "badge badge-warning";
    subStatusEl.classList.add("hidden");
    subActiveEl.classList.remove("hidden");
    userEmailEl.textContent = email || "User";
    planHintEl.textContent = "Free: 5 summaries/month. Upgrade to Pro for 50/month and API key access.";
    upgradeBtn.classList.remove("hidden");
    refreshStatusBtn.classList.remove("hidden");
    
    // Show stats, HIDE API card for free tier (Pro only feature)
    statsCardEl?.classList.remove("hidden");
    apiCardEl?.classList.add("hidden"); // API key is Pro-only
  } else {
    // Not logged in → prompt to sign in/up
    subBadgeEl.textContent = "Guest";
    subBadgeEl.className = "badge badge-info";
    subStatusEl.classList.remove("hidden");
    subActiveEl.classList.add("hidden");
    
    // Hide stats, API card for guests - they need to sign in first
    statsCardEl?.classList.add("hidden");
    apiCardEl?.classList.add("hidden"); // Must sign in to use API key
  }
}

function updateStats(cache, stats, monthlyUsage, plan) {
  const cacheCount = cache ? Object.keys(cache).length : 0;
  const totalSummaries = stats?.totalSummaries || 0;
  
  // Calculate minutes saved based on actual word count from cached summaries
  // Average reading speed: ~200 words per minute
  let totalWords = 0;
  if (cache) {
    Object.values(cache).forEach(entry => {
      if (entry?.originalTextLength) {
        // Estimate words from character count (average 5 chars per word)
        totalWords += Math.floor(entry.originalTextLength / 5);
      }
    });
  }
  const minutesSaved = Math.floor(totalWords / 200); // 200 words per minute reading speed
  
  // Determine quota based on plan
  let quota = 5; // Free tier default
  if (plan === "pro") quota = 50;
  else if (plan === "enterprise") quota = 5000;
  
  // Use monthly usage if available, otherwise use local stats
  const used = monthlyUsage ?? totalSummaries;
  const remaining = Math.max(0, quota - used);
  
  statSummariesEl.textContent = `${used}/${quota}`;
  statCachedEl.textContent = cacheCount;
  statSavedEl.textContent = `~${minutesSaved}`;
  
  // Update hint
  if (usageHintEl) {
    if (remaining === 0) {
      usageHintEl.textContent = "You've used all your summaries this month. Upgrade for more!";
      usageHintEl.style.color = "#f87171";
    } else if (remaining <= 2) {
      usageHintEl.textContent = `Only ${remaining} ${remaining === 1 ? "summary" : "summaries"} left this month.`;
      usageHintEl.style.color = "#f59e0b";
    } else {
      usageHintEl.textContent = `${remaining} ${remaining === 1 ? "summary" : "summaries"} remaining this month.`;
      usageHintEl.style.color = "var(--text-muted)";
    }
  }
}

// Save API settings
saveApiBtn.addEventListener("click", async () => {
  const openaiApiKey = apiKeyEl.value.trim();
  const openaiModel = modelEl.value;
  
  await chrome.storage.local.set({ openaiApiKey, openaiModel });
  showStatus("API settings saved!");
});

// Clear API key
clearApiBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ openaiApiKey: "" });
  apiKeyEl.value = "";
  showStatus("API key cleared.", "success");
});

// Clear cache
clearCacheBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ summariesCache: {} });
  statCachedEl.textContent = "0";
  statSavedEl.textContent = "~0"; // Also clear minutes saved
  showStatus("Summary cache cleared!");
});

// Export data
exportDataBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["summariesCache", "preferences"]);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `termsdigest-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Data exported!");
});

// Save preferences on change
async function savePreferences() {
  const preferences = {
    autoHover: autoHoverEl.checked,
    showRedFlags: showRedFlagsEl.checked,
    showQuotes: showQuotesEl.checked,
    enableCaching: enableCachingEl.checked,
    hoverDelay: hoverDelayEl.value
  };
  await chrome.storage.local.set({ preferences });
}

autoHoverEl.addEventListener("change", savePreferences);
showRedFlagsEl.addEventListener("change", savePreferences);
showQuotesEl.addEventListener("change", savePreferences);
enableCachingEl.addEventListener("change", savePreferences);
hoverDelayEl.addEventListener("change", savePreferences);

async function requireBackendConfigOrThrow() {
  // Always use hardcoded defaults (not user-configurable)
  const url = DEFAULT_SUPABASE_URL.trim();
  const anon = DEFAULT_SUPABASE_ANON_KEY.trim();
  if (!url || !anon) throw new Error("Backend configuration error. Please contact support.");
  return { url, anon };
}

async function signInOrUp(mode) {
  const { url, anon } = await requireBackendConfigOrThrow();
  const email = (authEmailEl.value || "").trim();
  const password = (authPasswordEl.value || "").trim();
  if (!email || !password) throw new Error("Please enter both email and password.");

  if (mode === "signup") {
    showModal("loading", "Creating account...", "Please wait while we create your account.");
    
    const res = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    
    // Check for various error formats Supabase might return
    if (!res.ok) {
      const errorMsg = data?.msg || data?.error_description || data?.message || data?.error?.message || "Signup failed. Please try again.";
      throw new Error(errorMsg);
    }
    
    // Check if user was created (Supabase returns user object on success)
    if (data?.user?.id || data?.id) {
      // Check if email confirmation is required
      if (data?.user?.confirmation_sent_at || data?.confirmation_sent_at) {
        showModal("success", "Account created!", "Please check your email to verify your account, then come back and sign in.");
      } else {
        showModal("success", "Account created!", "You can now sign in with your email and password.");
      }
    } else if (data?.error) {
      throw new Error(data.error.message || data.error);
    } else {
      // Some Supabase configs auto-confirm, so this might still be success
      showModal("success", "Account created!", "Please check your email or try signing in.");
    }
    return;
  }

  // Sign in
  showModal("loading", "Signing in...", "Please wait while we verify your credentials.");
  
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anon },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    const errorMsg = data?.error_description || data?.message || data?.error?.message || "Sign-in failed. Please check your credentials.";
    throw new Error(errorMsg);
  }

  const expiresAt = Date.now() + (Number(data.expires_in || 0) * 1000);
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: data.user ? { id: data.user.id, email: data.user.email } : { email }
  };

  await chrome.storage.local.set({
    supabaseSession: session
  });

  authFormEl.classList.add("hidden");
  showModal("success", "Signed in!", `Welcome back, ${email}!`);
  await refreshSupabaseStatusIfPossible({ supabaseSession: session });
  await loadSettings();
}

loginBtn.addEventListener("click", () => {
  authFormEl.classList.toggle("hidden");
});

cancelAuthBtn?.addEventListener("click", () => {
  authFormEl.classList.add("hidden");
});

signInBtn?.addEventListener("click", async () => {
  try {
    await signInOrUp("signin");
  } catch (e) {
    console.error(e);
    showModal("error", "Sign-in failed", e?.message || "Please check your credentials and try again.");
  }
});

signUpBtn?.addEventListener("click", async () => {
  try {
    await signInOrUp("signup");
  } catch (e) {
    console.error(e);
    showModal("error", "Signup failed", e?.message || "Please try again with a different email.");
  }
});

// Backend settings save removed - always use hardcoded defaults

async function refreshSessionToken(supabaseUrl, anon, session) {
  if (!session?.refresh_token) return null;
  
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.access_token) return null;
    
    const expiresAt = Date.now() + (Number(data.expires_in || 0) * 1000);
    const refreshed = {
      ...session,
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: expiresAt,
      user: data.user ? { id: data.user.id, email: data.user.email } : session.user
    };
    
    await chrome.storage.local.set({ supabaseSession: refreshed });
    return refreshed;
  } catch (e) {
    console.error("[Options] Token refresh failed:", e);
    return null;
  }
}

async function refreshSupabaseStatusIfPossible(data) {
  const supabaseUrl = DEFAULT_SUPABASE_URL.trim();
  const anon = DEFAULT_SUPABASE_ANON_KEY.trim();
  let session = data.supabaseSession;
  if (!session?.access_token) {
    return;
  }

  const userId = session.user?.id;
  if (!userId) {
    return;
  }
  
  // Check if token is expired and refresh if needed
  const isExpired = session.expires_at && (session.expires_at - 300000) < Date.now();
  if (isExpired) {
    const refreshed = await refreshSessionToken(supabaseUrl, anon, session);
    if (refreshed?.access_token) {
      session = refreshed;
    } else {
      return;
    }
  }
  
  // Fetch subscription status (RLS restricts to own row)
  const subQs = `?select=status,plan,current_period_end&user_id=eq.${encodeURIComponent(userId)}`;

  try {
    const subRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions${subQs}`, {
      method: "GET",
      headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` }
    });

    if (!subRes.ok) {
      const errorText = await subRes.text().catch(() => "");
      console.error(`[Options] Failed to fetch subscription (${subRes.status}):`, errorText);
      
      // If 401, try refreshing token once more
      if (subRes.status === 401) {
        const refreshed = await refreshSessionToken(supabaseUrl, anon, session);
        if (refreshed?.access_token) {
          // Retry with new token
          const retryRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions${subQs}`, {
            method: "GET",
            headers: { apikey: anon, Authorization: `Bearer ${refreshed.access_token}` }
          });
          if (retryRes.ok) {
            session = refreshed;
            // Continue with processing below
            const subRows = await retryRes.json().catch(() => []);
            const sub = Array.isArray(subRows) ? subRows[0] : subRows;
            
            if (!sub) {
              await chrome.storage.local.set({
                subscription: null,
                subscriptionPlan: null
              });
              return;
            }
            
            const status = sub?.status || null;
            const plan = sub?.plan || null;
            
            // Fetch monthly usage
            let monthlyUsage = 0;
            const now = new Date();
            const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
            const usageQs = `?select=summaries_count&user_id=eq.${encodeURIComponent(userId)}&month_start=eq.${monthStart}`;
            
            try {
              const usageRes = await fetch(`${supabaseUrl}/rest/v1/usage_counters_monthly${usageQs}`, {
                method: "GET",
                headers: { apikey: anon, Authorization: `Bearer ${refreshed.access_token}` }
              });
              
              if (usageRes.ok) {
                const usageRows = await usageRes.json().catch(() => []);
                const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows;
                monthlyUsage = usage?.summaries_count || 0;
              }
            } catch (e) {
              // Silently fail - usage is optional
            }

            await chrome.storage.local.set({
              subscription: status,
              subscriptionPlan: plan,
              userEmail: refreshed.user?.email || null,
              monthlyUsage: monthlyUsage
            });
            return;
          }
        }
      }
      
      return;
    }
    
    const subRows = await subRes.json().catch(() => []);
    const sub = Array.isArray(subRows) ? subRows[0] : subRows;
    
    if (!sub) {
      // Clear subscription data if no row exists
      await chrome.storage.local.set({
        subscription: null,
        subscriptionPlan: null
      });
      return;
    }
    
    const status = sub?.status || null;
    const plan = sub?.plan || null;

    // Fetch monthly usage (current month)
    let monthlyUsage = 0;
    const now = new Date();
    const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const usageQs = `?select=summaries_count&user_id=eq.${encodeURIComponent(userId)}&month_start=eq.${monthStart}`;
    
    try {
      const usageRes = await fetch(`${supabaseUrl}/rest/v1/usage_counters_monthly${usageQs}`, {
        method: "GET",
        headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` }
      });
      
      if (usageRes.ok) {
        const usageRows = await usageRes.json().catch(() => []);
        const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows;
        monthlyUsage = usage?.summaries_count || 0;
      }
    } catch (e) {
      // Silently fail - usage is optional
    }

    // Store the updated subscription data
    await chrome.storage.local.set({
      subscription: status,
      subscriptionPlan: plan,
      userEmail: session.user?.email || null,
      monthlyUsage: monthlyUsage
    });
  } catch (e) {
    console.error("[Options] Error refreshing subscription status:", e);
    throw e; // Re-throw so caller can handle it
  }
}

upgradeBtn?.addEventListener("click", async () => {
  try {
    const { supabaseSession } = await chrome.storage.local.get(["supabaseSession"]);
    if (!supabaseSession?.access_token) {
      throw new Error("Please sign in first.");
    }
    const supabaseUrl = DEFAULT_SUPABASE_URL.trim();
    const supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY.trim();

    showModal("loading", "Preparing checkout...", "Please wait while we create your payment link.");

    const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseSession.access_token}`
      },
      body: JSON.stringify({})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to create checkout session.");
    if (!data?.url) throw new Error("Checkout URL missing.");

    hideModal();
    window.open(data.url, "_blank", "noopener,noreferrer");
    
    // Show info modal
    showModal("info", "Checkout opened", "Complete your payment in the new tab. We'll automatically detect when payment is complete.");
    
    // Poll for subscription status changes (payment webhook may take a few seconds)
    // Stripe redirects to success page, doesn't close window, so we just poll periodically
    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 20 checks (every 3 seconds = 60 seconds total)
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        // Refresh subscription status from backend
        await refreshSupabaseStatusIfPossible({ supabaseSession });
        
        // Get updated data immediately after refresh
        const updated = await chrome.storage.local.get(["subscription", "subscriptionPlan", "userEmail", "monthlyUsage"]);
        
        // Check if subscription is now active (be flexible - plan="pro" is enough)
        if ((updated.subscription === "active" && updated.subscriptionPlan === "pro") || updated.subscriptionPlan === "pro") {
          clearInterval(pollInterval);
          window.removeEventListener("focus", focusHandler);
          
          // Force UI update with latest data
          updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan);
          updateStats(
            (await chrome.storage.local.get(["summariesCache"])).summariesCache,
            (await chrome.storage.local.get(["usageStats"])).usageStats,
            updated.monthlyUsage,
            updated.subscriptionPlan
          );
          
          // Show success
          showModal("success", "Payment successful!", "Your Pro subscription is now active! You can start using all Pro features.");
          return;
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          window.removeEventListener("focus", focusHandler);
          // Don't show error - user might have completed payment, just remind them to refresh
          showModal("info", "Payment check complete", "If you completed payment, click 'Refresh status' to see your Pro subscription.");
        }
      } catch (err) {
        console.error("Error polling subscription status:", err);
      }
    }, 3000); // Poll every 3 seconds
    
    // Also listen for window focus (user might have switched back after payment)
    const focusHandler = async () => {
      try {
        await refreshSupabaseStatusIfPossible({ supabaseSession });
        const updated = await chrome.storage.local.get(["subscription", "subscriptionPlan", "userEmail", "monthlyUsage"]);
        
        // Check if subscription is now active (be flexible - plan="pro" is enough)
        if ((updated.subscription === "active" && updated.subscriptionPlan === "pro") || updated.subscriptionPlan === "pro") {
          clearInterval(pollInterval);
          window.removeEventListener("focus", focusHandler);
          
          // Force UI update
          updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan);
          updateStats(
            (await chrome.storage.local.get(["summariesCache"])).summariesCache,
            (await chrome.storage.local.get(["usageStats"])).usageStats,
            updated.monthlyUsage,
            updated.subscriptionPlan
          );
          
          showModal("success", "Payment successful!", "Your Pro subscription is now active!");
        }
      } catch (err) {
        console.error("[Options] Error checking subscription on focus:", err);
      }
    };
    window.addEventListener("focus", focusHandler);
  } catch (e) {
    console.error(e);
    showModal("error", "Upgrade failed", e?.message || "Please try again later.");
  }
});

refreshStatusBtn?.addEventListener("click", async () => {
  try {
    showModal("loading", "Refreshing...", "Checking your subscription status.");
    const data = await chrome.storage.local.get(["supabaseSession"]);
    
    // Force refresh from backend
    await refreshSupabaseStatusIfPossible(data);
    
    // Get the updated data
    const updated = await chrome.storage.local.get(["subscription", "subscriptionPlan", "userEmail", "monthlyUsage"]);
    
    // Reload all settings to update UI
    await loadSettings();
    
    // Show appropriate message based on subscription status
    if (updated.subscription === "active" && updated.subscriptionPlan === "pro") {
      showModal("success", "Status refreshed", "Your Pro subscription is active!");
    } else {
      showModal("success", "Status refreshed", "Your subscription status has been updated.");
    }
  } catch (e) {
    console.error("[Options] Refresh error:", e);
    showModal("error", "Refresh failed", e?.message || "Failed to refresh status. Please try again.");
  }
});

// Logout button
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ 
    subscription: null, 
    subscriptionPlan: null,
    userEmail: null,
    supabaseSession: null
  });
  updateSubscriptionUI(null, null, null);
  showModal("success", "Logged out", "You have been logged out successfully.");
});

// Check for query parameters (e.g., ?upgrade=true)
function handleQueryParams() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get("upgrade") === "true") {
    // Wait a moment for the page to load, then trigger upgrade
    setTimeout(async () => {
      // Check if user is logged in
      const { supabaseSession } = await chrome.storage.local.get(["supabaseSession"]);
      
      if (supabaseSession?.access_token) {
        // User is logged in, trigger upgrade flow
        upgradeBtn?.click();
      } else {
        // User not logged in, show login form and info
        authFormEl?.classList.remove("hidden");
        showModal("info", "Sign in to upgrade", "Please sign in or create an account first, then click the 'Upgrade to Pro' button.");
      }
      
      // Clear the query param from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 500);
  }
}

// Initialize logo
const logoImg = document.getElementById("logoImg");
if (logoImg) {
  logoImg.src = chrome.runtime.getURL("icons/icon48.png");
}

// Initialize
loadSettings().then(() => {
  // Check for query params after settings are loaded
  handleQueryParams();
}).catch((e) => {
  console.error("Failed to load settings:", e);
  showStatus(e?.message || "Failed to load settings", "error");
});
