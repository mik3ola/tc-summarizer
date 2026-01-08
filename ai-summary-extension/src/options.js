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

// Subscription elements
const subBadgeEl = document.getElementById("subBadge");
const subStatusEl = document.getElementById("subStatus");
const subActiveEl = document.getElementById("subActive");
const userEmailEl = document.getElementById("userEmail");
const apiCardEl = document.getElementById("apiCard");

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
    "userEmail",
    "preferences",
    "summariesCache",
    "usageStats"
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
  updateSubscriptionUI(data.subscription, data.userEmail);

  // Stats
  updateStats(data.summariesCache, data.usageStats);
}

function updateSubscriptionUI(subscription, email) {
  const isSubscribed = subscription === "active";
  
  if (isSubscribed) {
    subBadgeEl.textContent = "Pro";
    subBadgeEl.className = "badge badge-success";
    subStatusEl.classList.add("hidden");
    subActiveEl.classList.remove("hidden");
    userEmailEl.textContent = email || "Subscriber";
    apiCardEl.classList.add("hidden");
  } else {
    subBadgeEl.textContent = "Free Tier";
    subBadgeEl.className = "badge badge-warning";
    subStatusEl.classList.remove("hidden");
    subActiveEl.classList.add("hidden");
    apiCardEl.classList.remove("hidden");
  }
}

function updateStats(cache, stats) {
  const cacheCount = cache ? Object.keys(cache).length : 0;
  const totalSummaries = stats?.totalSummaries || cacheCount;
  const avgReadTime = 5; // Assume 5 min saved per summary
  
  statSummariesEl.textContent = totalSummaries;
  statCachedEl.textContent = cacheCount;
  statSavedEl.textContent = `~${totalSummaries * avgReadTime}`;
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
  showStatus("Summary cache cleared!");
});

// Export data
exportDataBtn.addEventListener("click", async () => {
  const data = await chrome.storage.local.get(["summariesCache", "preferences"]);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tc-summarizer-data-${Date.now()}.json`;
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

// Login button (placeholder - will integrate with your auth system)
loginBtn.addEventListener("click", () => {
  // TODO: Integrate with your authentication backend
  // For now, show a message
  showStatus("Subscription coming soon! For now, use your own API key.", "error");
  
  // When ready, this would open your auth flow:
  // window.open("https://your-backend.com/auth/login", "_blank");
});

// Logout button
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ 
    subscription: null, 
    userEmail: null,
    authToken: null 
  });
  updateSubscriptionUI(null, null);
  showStatus("Logged out successfully.");
});

// Initialize
loadSettings().catch((e) => {
  console.error("Failed to load settings:", e);
  showStatus(e?.message || "Failed to load settings", "error");
});
