# Permissions Justification for Chrome Web Store

This document explains why TermsDigest requires the permissions listed in `manifest.json`.

## Required Permissions

### 1. `storage` Permission

**Why needed:**
- Store user preferences (API key, settings, hover delay, etc.)
- Cache summaries locally for 30 days to improve performance and reduce API costs
- Store authentication tokens (for subscribers)

**What we store:**
- User preferences (auto-hover, show red flags, etc.)
- OpenAI API key (free tier users only, stored locally)
- Cached summaries (local only, never synced)
- Authentication session (for subscribers)

**Privacy impact:** Low - all data is stored locally in the browser using Chrome's storage API.

---

### 2. `host_permissions: ["<all_urls>"]`

**Why needed:**
- The extension must detect legal document links on **any website** the user visits
- Content script needs to run on all pages to:
  - Detect links containing keywords like "Terms", "Privacy Policy", "Refund Policy"
  - Extract text content from legal documents when user hovers
  - Display summaries in a popover overlay

**What we access:**
- **Link text and URLs**: To identify legal document links
- **Page content**: Only when user explicitly hovers over a legal link (after 0.75s delay)
- **No tracking**: We do not track which pages you visit or collect browsing history

**Privacy impact:** Medium - we access page content, but only:
- When you hover over a legal link (user-initiated action)
- Only the text content of the legal document (not the entire page)
- Content is processed locally (free tier) or sent to our backend for summarization (subscriber tier)

**Minimal permission alternative:** We cannot use a more restrictive permission because:
- Legal documents appear on websites across the entire internet
- We cannot predict which domains users will visit
- Using a permission list would require users to manually add every website they visit

---

## What We DON'T Do

- ❌ Track browsing history
- ❌ Collect personal information without consent
- ❌ Share data with third parties (except OpenAI for processing, Stripe for payments)
- ❌ Inject ads or tracking scripts
- ❌ Modify page content beyond the summary popover
- ❌ Access passwords, credit cards, or other sensitive form data

## Data Flow

### Free Tier (User's Own API Key)
```
User's Browser → OpenAI API (direct)
```
- No data sent to our servers
- All processing happens between browser and OpenAI

### Subscriber Tier (Our Backend)
```
User's Browser → Our Backend → OpenAI API → Our Backend → User's Browser
```
- Text content sent to our backend for summarization
- Text is **never stored** - processed and deleted immediately
- Only usage statistics (count) are stored

## Compliance

This extension complies with Chrome Web Store policies:
- **Single Purpose**: Summarize legal documents
- **User Privacy**: Minimal data collection, clear disclosure
- **Transparency**: This document explains all permissions

---

**For Chrome Web Store Review:**
- All permissions are necessary for core functionality
- No alternative implementation with fewer permissions is possible
- User privacy is protected through local processing and minimal data collection
