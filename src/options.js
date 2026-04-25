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
  modalMessage.innerHTML = message;
  
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
  if (!statusEl) return;
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

  // API settings (options page only; popup has no API card)
  if (apiKeyEl) apiKeyEl.value = data.openaiApiKey || "";
  if (modelEl) modelEl.value = data.openaiModel || "gpt-4o-mini";

  // Preferences
  const prefs = data.preferences || {};
  if (autoHoverEl) autoHoverEl.checked = prefs.autoHover !== false;
  if (showRedFlagsEl) showRedFlagsEl.checked = prefs.showRedFlags !== false;
  if (showQuotesEl) showQuotesEl.checked = prefs.showQuotes !== false;
  if (enableCachingEl) enableCachingEl.checked = prefs.enableCaching !== false; // Default to true
  if (hoverDelayEl) hoverDelayEl.value = prefs.hoverDelay || "750";

  // Subscription status
  // Prefer real session if present
  await refreshSupabaseStatusIfPossible({ supabaseSession: data.supabaseSession });
  
  // Refresh data after status update
  const refreshedData = await chrome.storage.local.get([
    "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
    "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd",
    "cycleAnchorDate"
  ]);
  updateSubscriptionUI(refreshedData.subscription, refreshedData.userEmail, refreshedData.subscriptionPlan, refreshedData);

  // Backend config - always use defaults (not user-configurable)

  // Stats - pass monthly usage, plan, and cycle anchor for correct reset date
  updateStats(data.summariesCache, data.usageStats, refreshedData.monthlyUsage, refreshedData.subscriptionPlan, refreshedData.cycleAnchorDate);
}

function formatSubStatusLine(currentPeriodEnd) {
  if (!currentPeriodEnd) return "Subscription: Pro";
  const d = new Date(currentPeriodEnd);
  const fmt = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `Subscription: Pro (expires ${fmt})`;
}
function formatSubAutoRenewLine(autoRenew, downgradeScheduledFor) {
  if (!autoRenew) {
    if (downgradeScheduledFor) {
      const d = new Date(downgradeScheduledFor);
      const fmt = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      return `Auto-renewal: Disabled. Access until ${fmt}.`;
    }
    return "Auto-renewal: Disabled";
  }
  return "Auto-renewal: Enabled";
}

function updateSubscriptionUI(subscription, email, plan, extra = {}) {
  const isLoggedIn = !!email;
  // Pro if: (1) subscription is active AND plan is pro, OR (2) plan is pro (fallback for edge cases)
  const isPro = (subscription === "active" && plan === "pro") || plan === "pro";
  const autoRenew = extra.subscriptionAutoRenew !== false;
  const downgradeScheduledFor = extra.subscriptionDowngradeScheduledFor || null;
  const currentPeriodEnd = extra.currentPeriodEnd || null;

  // API key hint element
  const apiKeyHint = document.getElementById("apiKeyHint");
  const apiKeyBadge = document.getElementById("apiKeyBadge");
  const subManagementEl = document.getElementById("subManagement");
  const subStatusLineEl = document.getElementById("subStatusLine");
  const autoRenewLineEl = document.getElementById("autoRenewLine");
  const cancelAutoRenewBtn = document.getElementById("cancelAutoRenewBtn");
  const reEnableAutoRenewBtn = document.getElementById("reEnableAutoRenewBtn");
  const downgradeNowBtn = document.getElementById("downgradeNowBtn");

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

    document.getElementById("dangerZone")?.classList.remove("hidden");
    document.getElementById("dataCacheCard")?.classList.remove("hidden");
    // Subscription management section (Pro only)
    if (subManagementEl) {
      subManagementEl.classList.remove("hidden");
      if (subStatusLineEl) subStatusLineEl.textContent = formatSubStatusLine(currentPeriodEnd);
      if (autoRenewLineEl) autoRenewLineEl.textContent = formatSubAutoRenewLine(autoRenew, downgradeScheduledFor);
      if (cancelAutoRenewBtn) cancelAutoRenewBtn.style.display = autoRenew ? "inline-block" : "none";
      if (reEnableAutoRenewBtn) reEnableAutoRenewBtn.style.display = autoRenew ? "none" : "inline-block";
      if (downgradeNowBtn) downgradeNowBtn.style.display = "inline-block";
    }
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
    
    // Show stats, HIDE API card and subscription management for free tier
    statsCardEl?.classList.remove("hidden");
    apiCardEl?.classList.add("hidden"); // API key is Pro-only
    subManagementEl?.classList.add("hidden");
    document.getElementById("dangerZone")?.classList.remove("hidden");
    document.getElementById("dataCacheCard")?.classList.remove("hidden");
  } else {
    // Not logged in → prompt to sign in/up
    subBadgeEl.textContent = "Guest";
    subBadgeEl.className = "badge badge-info";
    subStatusEl.classList.remove("hidden");
    subActiveEl.classList.add("hidden");
    
    // Hide stats, API card for guests - they need to sign in first
    statsCardEl?.classList.add("hidden");
    apiCardEl?.classList.add("hidden"); // Must sign in to use API key
    subManagementEl?.classList.add("hidden");
    document.getElementById("dangerZone")?.classList.add("hidden");
    document.getElementById("dataCacheCard")?.classList.add("hidden");
  }
}

/**
 * Returns a Date representing the start of the user's current 30-day quota period.
 * Falls back to the 1st of the current calendar month if anchorDate is unavailable.
 */
function computePeriodStart(anchorDate) {
  if (!anchorDate) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const anchorMs = new Date(anchorDate + "T00:00:00Z").getTime();
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const msPerPeriod = 30 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, todayMs - anchorMs);
  const periodsElapsed = Math.floor(elapsed / msPerPeriod);
  return new Date(anchorMs + periodsElapsed * msPerPeriod);
}

function updateStats(cache, stats, monthlyUsage, plan, cycleAnchorDate) {
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
  
  // Update hint (include reset date based on user's rolling 30-day cycle)
  if (usageHintEl) {
    const now = new Date();
    const periodStartMs = computePeriodStart(cycleAnchorDate).getTime();
    const nextReset = new Date(periodStartMs + 30 * 24 * 60 * 60 * 1000);
    const resetFmt = nextReset.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const daysUntilReset = Math.ceil((nextReset - now) / (24 * 60 * 60 * 1000));
    const resetText = daysUntilReset <= 1 ? `Resets ${daysUntilReset === 1 ? "tomorrow" : "today"} (${resetFmt})` : `Resets ${resetFmt} (in ${daysUntilReset} days)`;

    if (remaining === 0) {
      usageHintEl.textContent = `You've used all your inclusive summaries this month. ${resetText}. Upgrade for more!`;
      usageHintEl.style.color = "#f87171";
    } else if (remaining <= 2) {
      usageHintEl.textContent = `Only ${remaining} ${remaining === 1 ? "summary" : "summaries"} left this month. ${resetText}`;
      usageHintEl.style.color = "#f59e0b";
    } else {
      usageHintEl.textContent = `${remaining} ${remaining === 1 ? "summary" : "summaries"} remaining this month. ${resetText}`;
      usageHintEl.style.color = "var(--text-muted)";
    }
  }
}

// Save API settings (options page only)
saveApiBtn?.addEventListener("click", async () => {
  const openaiApiKey = apiKeyEl.value.trim();
  const openaiModel = modelEl.value;
  
  await chrome.storage.local.set({ openaiApiKey, openaiModel });
  showStatus("API settings saved!");
});

// Clear API key (options page only)
clearApiBtn?.addEventListener("click", async () => {
  await chrome.storage.local.set({ openaiApiKey: "" });
  apiKeyEl.value = "";
  showStatus("API key cleared.", "success");
});

// Clear cache (options page only)
clearCacheBtn?.addEventListener("click", async () => {
  await chrome.storage.local.set({ summariesCache: {} });
  statCachedEl.textContent = "0";
  statSavedEl.textContent = "~0"; // Also clear minutes saved
  showStatus("Summary cache cleared!");
});

// Export data (options page only)
exportDataBtn?.addEventListener("click", async () => {
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

autoHoverEl?.addEventListener("change", savePreferences);
showRedFlagsEl?.addEventListener("change", savePreferences);
showQuotesEl?.addEventListener("change", savePreferences);
enableCachingEl?.addEventListener("change", savePreferences);
hoverDelayEl?.addEventListener("change", savePreferences);

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

document.getElementById("forgotPasswordLink")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = (authEmailEl?.value || "").trim();
  if (!email) {
    showModal("info", "Enter your email", "Please enter your email address in the field above, then click \"Forgot password?\".");
    return;
  }
  try {
    showModal("loading", "Sending reset email…", "Please wait.");
    const { url, anon } = await requireBackendConfigOrThrow();
    const res = await fetch(`${url}/auth/v1/recover?redirect_to=https://termsdigest.com/auth/reset-password`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      showModal("success", "Reset email sent!", "Check your inbox for a link to reset your password. The link expires in 1 hour.");
    } else {
      showModal("error", "Could not send email", "Please try again or contact <a href=\"https://termsdigest.com/support\" target=\"_blank\">support</a>.");
    }
  } catch {
    showModal("error", "Something went wrong", "Please try again.");
  }
});

signInBtn?.addEventListener("click", async () => {
  try {
    await signInOrUp("signin");
  } catch (e) {
    console.error(e);
    showModal("error", "Sign-in failed", "Please check your email and password. If the problem persists, contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

signUpBtn?.addEventListener("click", async () => {
  try {
    await signInOrUp("signup");
  } catch (e) {
    console.error(e);
    showModal("error", "Signup failed", "Please try again with a different email. If the problem persists, contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
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
  const subQs = `?select=status,plan,current_period_end,auto_renew,downgrade_scheduled_for&user_id=eq.${encodeURIComponent(userId)}`;

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
            const autoRenew = sub?.auto_renew !== false;
            const downgradeScheduledFor = sub?.downgrade_scheduled_for || null;
            const currentPeriodEnd = sub?.current_period_end || null;

            // Fetch the user's quota cycle anchor date from their profile
            let cycleAnchorDate = null;
            try {
              const profileRes = await fetch(
                `${supabaseUrl}/rest/v1/profiles?select=cycle_anchor_date&user_id=eq.${encodeURIComponent(userId)}`,
                { method: "GET", headers: { apikey: anon, Authorization: `Bearer ${refreshed.access_token}` } }
              );
              if (profileRes.ok) {
                const profileRows = await profileRes.json().catch(() => []);
                const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
                cycleAnchorDate = profile?.cycle_anchor_date || null;
              }
            } catch (e) {
              // Silently fail
            }

            // Fetch usage for the current 30-day period
            let monthlyUsage = 0;
            const retryPeriodStart = computePeriodStart(cycleAnchorDate).toISOString().slice(0, 10);
            const usageQs = `?select=summaries_count&user_id=eq.${encodeURIComponent(userId)}&month_start=eq.${retryPeriodStart}`;
            
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
              monthlyUsage: monthlyUsage,
              cycleAnchorDate: cycleAnchorDate,
              subscriptionAutoRenew: autoRenew,
              subscriptionDowngradeScheduledFor: downgradeScheduledFor,
              currentPeriodEnd: currentPeriodEnd
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
    const autoRenew = sub?.auto_renew !== false;
    const downgradeScheduledFor = sub?.downgrade_scheduled_for || null;
    const currentPeriodEnd = sub?.current_period_end || null;

    // Fetch the user's quota cycle anchor date from their profile
    let cycleAnchorDate = null;
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=cycle_anchor_date&user_id=eq.${encodeURIComponent(userId)}`,
        { method: "GET", headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` } }
      );
      if (profileRes.ok) {
        const profileRows = await profileRes.json().catch(() => []);
        const profile = Array.isArray(profileRows) ? profileRows[0] : profileRows;
        cycleAnchorDate = profile?.cycle_anchor_date || null;
      }
    } catch (e) {
      // Silently fail - will fall back to calendar-month logic in updateStats
    }

    // Fetch usage for the current 30-day period
    let monthlyUsage = 0;
    const periodStart = computePeriodStart(cycleAnchorDate).toISOString().slice(0, 10);
    const usageQs = `?select=summaries_count&user_id=eq.${encodeURIComponent(userId)}&month_start=eq.${periodStart}`;
    
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
      monthlyUsage: monthlyUsage,
      cycleAnchorDate: cycleAnchorDate,
      subscriptionAutoRenew: autoRenew,
      subscriptionDowngradeScheduledFor: downgradeScheduledFor,
      currentPeriodEnd: currentPeriodEnd
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
        const updated = await chrome.storage.local.get([
          "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
          "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd",
          "cycleAnchorDate"
        ]);
        
        // Check if subscription is now active (be flexible - plan="pro" is enough)
        if ((updated.subscription === "active" && updated.subscriptionPlan === "pro") || updated.subscriptionPlan === "pro") {
          clearInterval(pollInterval);
          window.removeEventListener("focus", focusHandler);
          
          // Force UI update with latest data
          updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
          updateStats(
            (await chrome.storage.local.get(["summariesCache"])).summariesCache,
            (await chrome.storage.local.get(["usageStats"])).usageStats,
            updated.monthlyUsage,
            updated.subscriptionPlan,
            updated.cycleAnchorDate
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
          showModal("info", "Payment check complete", "If you completed payment, your Pro subscription will activate automatically within a minute. Click 'Refresh' if it hasn't appeared by then.");
        }
      } catch (err) {
        console.error("Error polling subscription status:", err);
      }
    }, 3000); // Poll every 3 seconds
    
    // Also listen for window focus (user might have switched back after payment)
    const focusHandler = async () => {
      try {
        await refreshSupabaseStatusIfPossible({ supabaseSession });
        const updated = await chrome.storage.local.get([
          "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
          "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd",
          "cycleAnchorDate"
        ]);
        
        // Check if subscription is now active (be flexible - plan="pro" is enough)
        if ((updated.subscription === "active" && updated.subscriptionPlan === "pro") || updated.subscriptionPlan === "pro") {
          clearInterval(pollInterval);
          window.removeEventListener("focus", focusHandler);
          
          // Force UI update
          updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
          updateStats(
            (await chrome.storage.local.get(["summariesCache"])).summariesCache,
            (await chrome.storage.local.get(["usageStats"])).usageStats,
            updated.monthlyUsage,
            updated.subscriptionPlan,
            updated.cycleAnchorDate
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
    showModal("error", "Something went wrong", "We couldn't open the checkout. Please try again or contact our support team at termsdigest.com/support.");
  }
});

refreshStatusBtn?.addEventListener("click", async () => {
  try {
    showModal("loading", "Refreshing...", "Updating your account info.");
    const data = await chrome.storage.local.get(["supabaseSession"]);
    await refreshSupabaseStatusIfPossible(data);
    const updated = await chrome.storage.local.get([
      "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
      "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd",
      "cycleAnchorDate"
    ]);
    updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
    updateStats(
      (await chrome.storage.local.get(["summariesCache"])).summariesCache,
      (await chrome.storage.local.get(["usageStats"])).usageStats,
      updated.monthlyUsage,
      updated.subscriptionPlan,
      updated.cycleAnchorDate
    );
    const isPro = updated.subscription === "active" && updated.subscriptionPlan === "pro";
    showModal("success", "Up to date", isPro ? "Your Pro subscription is active!" : "Your account is up to date.");
  } catch (e) {
    console.error("[Options] Refresh error:", e);
    showModal("error", "Something went wrong", "We couldn't refresh right now. Please try again or contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

// Logout button
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ 
    subscription: null, 
    subscriptionPlan: null,
    userEmail: null,
    supabaseSession: null,
    subscriptionAutoRenew: null,
    subscriptionDowngradeScheduledFor: null,
    currentPeriodEnd: null
  });
  updateSubscriptionUI(null, null, null);
  showModal("success", "Logged out", "You have been logged out successfully.");
});

// Confirmation modal helpers
let confirmResolve = null;
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalMessage").textContent = message;
    document.getElementById("confirmModalOverlay").classList.add("show");
  });
}
function hideConfirmModal() {
  document.getElementById("confirmModalOverlay").classList.remove("show");
  confirmResolve = null;
}
document.getElementById("confirmModalCancel")?.addEventListener("click", () => {
  if (confirmResolve) confirmResolve(false);
  hideConfirmModal();
});
document.getElementById("confirmModalConfirm")?.addEventListener("click", () => {
  if (confirmResolve) confirmResolve(true);
  hideConfirmModal();
});
document.getElementById("confirmModalOverlay")?.addEventListener("click", (e) => {
  if (e.target.id === "confirmModalOverlay") {
    if (confirmResolve) confirmResolve(false);
    hideConfirmModal();
  }
});

// Downgrade API call
async function callDowngradeSubscription(action) {
  const { supabaseSession } = await chrome.storage.local.get(["supabaseSession"]);
  if (!supabaseSession?.access_token) throw new Error("Please sign in first.");
  const supabaseUrl = DEFAULT_SUPABASE_URL.trim();
  const anon = DEFAULT_SUPABASE_ANON_KEY.trim();
  const res = await fetch(`${supabaseUrl}/functions/v1/downgrade-subscription`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${supabaseSession.access_token}`
    },
    body: JSON.stringify({ action, reason: "user_requested" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[downgrade-subscription] error:", res.status, data);
    throw new Error("SUBSCRIPTION_REQUEST_FAILED");
  }
  return data;
}

// Cancel Auto-Renewal button
document.getElementById("cancelAutoRenewBtn")?.addEventListener("click", async () => {
  const confirmed = await showConfirmModal(
    "Cancel Auto-Renewal",
    "Your subscription will end at the end of the current billing period. You will keep Pro access until then. You can resubscribe anytime."
  );
  if (!confirmed) return;
  try {
    showModal("loading", "Updating...", "Canceling auto-renewal.");
    const result = await callDowngradeSubscription("cancel_auto_renew");
    await chrome.storage.local.set({
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: result.subscription.downgrade_scheduled_for || null,
      currentPeriodEnd: result.subscription.current_period_end || null
    });
    const updated = await chrome.storage.local.get([
      "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
      "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd"
    ]);
    hideModal();
    updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
    showModal("success", "Auto-renewal canceled", "Your subscription will not renew. You will keep Pro access until the end of the current period.");
  } catch (e) {
    console.error(e);
    hideModal();
    showModal("error", "Something went wrong", "We couldn't update your subscription. Please try again or contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

// Re-enable Auto-Renewal button
document.getElementById("reEnableAutoRenewBtn")?.addEventListener("click", async () => {
  const confirmed = await showConfirmModal(
    "Re-enable Auto-Renewal",
    "Your subscription will automatically renew at the end of the current billing period."
  );
  if (!confirmed) return;
  try {
    showModal("loading", "Updating...", "Re-enabling auto-renewal.");
    await callDowngradeSubscription("re_enable_auto_renew");
    await chrome.storage.local.set({
      subscriptionAutoRenew: true,
      subscriptionDowngradeScheduledFor: null
    });
    const updated = await chrome.storage.local.get([
      "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
      "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd"
    ]);
    hideModal();
    updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
    showModal("success", "Auto-renewal re-enabled", "Your subscription will automatically renew at the end of the current period.");
  } catch (e) {
    console.error(e);
    hideModal();
    showModal("error", "Something went wrong", "We couldn't update your subscription. Please try again or contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

// Downgrade Now button
document.getElementById("downgradeNowBtn")?.addEventListener("click", async () => {
  const confirmed = await showConfirmModal(
    "Downgrade Now",
    "You will lose Pro access immediately. Your subscription will be canceled and you will be moved to the free plan. This cannot be undone for the current billing period."
  );
  if (!confirmed) return;
  try {
    showModal("loading", "Downgrading...", "Please wait.");
    const result = await callDowngradeSubscription("downgrade_now");
    // Apply the API response to storage so the UI reflects the confirmed state
    await chrome.storage.local.set({
      subscription: result.subscription.status,
      subscriptionPlan: result.subscription.plan,
      subscriptionAutoRenew: false,
      subscriptionDowngradeScheduledFor: null,
      currentPeriodEnd: null
    });
    const updated = await chrome.storage.local.get([
      "subscription", "subscriptionPlan", "userEmail", "monthlyUsage",
      "subscriptionAutoRenew", "subscriptionDowngradeScheduledFor", "currentPeriodEnd"
    ]);
    hideModal();
    updateSubscriptionUI(updated.subscription, updated.userEmail, updated.subscriptionPlan, updated);
    showModal("success", "Downgraded", "You have been moved to the free plan. You can upgrade again anytime.");
  } catch (e) {
    console.error(e);
    hideModal();
    showModal("error", "Something went wrong", "We couldn't complete your request. Please try again or contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

// Delete Account modal and handler
const deleteAccountModalOverlay = document.getElementById("deleteAccountModalOverlay");
const deleteConfirmInput = document.getElementById("deleteConfirmInput");
const deleteAccountModalConfirm = document.getElementById("deleteAccountModalConfirm");
const deleteAccountModalCancel = document.getElementById("deleteAccountModalCancel");

function showDeleteAccountModal() {
  deleteConfirmInput.value = "";
  deleteAccountModalConfirm.disabled = true;
  deleteAccountModalOverlay?.classList.add("show");
}

function hideDeleteAccountModal() {
  deleteAccountModalOverlay?.classList.remove("show");
}

deleteConfirmInput?.addEventListener("input", () => {
  deleteAccountModalConfirm.disabled = deleteConfirmInput.value.trim() !== "DELETE";
});

deleteAccountModalCancel?.addEventListener("click", hideDeleteAccountModal);
deleteAccountModalOverlay?.addEventListener("click", (e) => {
  if (e.target === deleteAccountModalOverlay) hideDeleteAccountModal();
});

async function callDeleteUserAccount() {
  const { supabaseSession } = await chrome.storage.local.get(["supabaseSession"]);
  if (!supabaseSession?.access_token) throw new Error("Please sign in first.");
  const supabaseUrl = DEFAULT_SUPABASE_URL.trim();
  const anon = DEFAULT_SUPABASE_ANON_KEY.trim();
  const res = await fetch(`${supabaseUrl}/functions/v1/delete-user-account`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${supabaseSession.access_token}`
    },
    body: JSON.stringify({ confirmation: "DELETE" })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[delete-user-account] error:", res.status, data);
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

deleteAccountModalConfirm?.addEventListener("click", async () => {
  if (deleteAccountModalConfirm.disabled) return;
  try {
    showModal("loading", "Processing...", "Scheduling account deletion.");
    await callDeleteUserAccount();
    hideDeleteAccountModal();
    await chrome.storage.local.clear();
    hideModal();
    updateSubscriptionUI(null, null, null);
    showModal("success", "Deletion scheduled", "Your account will be permanently deleted in 30 days. You can contact our support team before then if you change your mind.");
  } catch (e) {
    console.error(e);
    hideModal();
    showModal("error", "Something went wrong", "We couldn't process your request. Please try again or contact our <a href=\"https://termsdigest.com/support\" target=\"_blank\">support team</a> for help.");
  }
});

document.getElementById("deleteAccountBtn")?.addEventListener("click", showDeleteAccountModal);

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

// Listen for storage changes to auto-refresh stats when monthlyUsage updates
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.monthlyUsage) {
    const oldValue = changes.monthlyUsage.oldValue;
    const newValue = changes.monthlyUsage.newValue;
    
    // Only refresh if the value actually changed (not just initialized)
    if (oldValue !== newValue) {
      // Reload stats with updated usage count
      const data = await chrome.storage.local.get([
        "summariesCache",
        "usageStats", 
        "monthlyUsage",
        "subscriptionPlan",
        "cycleAnchorDate"
      ]);
      updateStats(
        data.summariesCache, 
        data.usageStats, 
        data.monthlyUsage, 
        data.subscriptionPlan,
        data.cycleAnchorDate
      );
    }
  }
});
