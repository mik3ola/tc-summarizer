# Feature Specification: Account Management Features

**Created:** 2026-01-27  
**Status:** Planning  
**Priority:** Medium

---

## Overview

This document outlines the specification for two account management features:
1. **Self-Service Account Deletion** - Allows users to permanently delete their accounts
2. **Subscription Downgrade** - Automatic and manual downgrade from Pro to Free tier

---

## Feature 1: Self-Service Account Deletion

### Design Choice
**Option A: Self-Service Deletion** - Users can delete their own accounts through the extension options page.

### Requirements

#### User Flow
1. User navigates to extension options page
2. User clicks "Delete Account" button in "Danger Zone" section
3. First confirmation modal: "Are you sure?"
4. Second confirmation: User must type "DELETE" to confirm
5. Account is soft-deleted immediately
6. Hard deletion scheduled for 30 days later (grace period)
7. Email confirmation sent to user

#### Database Schema Changes

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMP;
ALTER TABLE users ADD COLUMN deletion_scheduled_for TIMESTAMP;
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
```

#### Data Handling Strategy

**Hard Delete (Immediate):**
- Usage counters (`usage_counters_monthly`)
- Subscription records (`subscriptions`)
- API keys (from `chrome.storage.local`)

**Anonymize:**
- Email → `deleted_user_<id>@deleted.local`
- User metadata (name, etc.)
- Keep anonymized summaries cache for analytics (optional)

**Keep (Legal/Compliance):**
- Payment records (7 years for tax/compliance)
- Audit logs

#### Implementation Components

**1. Supabase Edge Function: `delete-user-account/index.ts`**
- Handle cascade deletions
- Anonymize user data
- Schedule hard deletion (30 days)
- Send confirmation email
- Return success/error status

**2. Extension UI: `src/options.html` & `src/options.js`**
- Add "Delete Account" button in Account section
- Two-step confirmation modal
- Call edge function on confirmation
- Handle success/error states
- Clear local storage on success

**3. Scheduled Cleanup (Optional)**
- Cron job or scheduled function to process hard deletions
- Runs daily, checks `deletion_scheduled_for < NOW()`
- Permanently removes soft-deleted accounts

#### Security Considerations
- Require re-authentication before deletion
- Rate limit deletion requests (max 1 per 24 hours)
- Audit logging of all deletions
- 30-day grace period for account recovery

#### Edge Cases
- What if user has active API key usage?
- What if user requests deletion but has pending payment?
- What if user requests deletion during active subscription period?

---

## Feature 2: Subscription Downgrade

### Design Choice
**Hybrid Approach:**
- **Option A: Automatic Downgrade** - System automatically downgrades expired subscriptions
- **Option C: User Self-Downgrade** - Users can manually cancel/downgrade their subscription

### Requirements

#### Automatic Downgrade Flow
1. Background job runs daily (cron/scheduled function)
2. Checks all Pro subscriptions where:
   - `current_period_end < NOW()`
   - `auto_renew = false`
3. Automatically sets `status = 'canceled'` and `plan = 'free'`
4. Logs change to `subscription_changes` table
5. Sends email notification (7 days before, day of, after downgrade)

#### User Self-Downgrade Flow
1. User navigates to extension options page
2. User sees subscription status with expiration date
3. User clicks "Cancel Auto-Renewal" toggle OR "Downgrade Now" button
4. Confirmation modal appears
5. If "Cancel Auto-Renewal": Sets `auto_renew = false`, downgrades at period end
6. If "Downgrade Now": Immediate downgrade (if mid-cycle, keep Pro until period end)
7. Updates subscription status
8. Sends confirmation email

#### Database Schema Changes

```sql
-- Add to subscriptions table
ALTER TABLE subscriptions ADD COLUMN auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE subscriptions ADD COLUMN downgrade_scheduled_for TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN downgrade_reason TEXT;

-- Track downgrade history
CREATE TABLE subscription_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  from_plan TEXT,
  to_plan TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  changed_by TEXT -- 'system', 'admin', 'user'
);
```

#### Implementation Components

**1. Supabase Edge Function: `downgrade-subscription/index.ts`**
- Handle both manual and automatic downgrades
- Update subscription status and plan
- Log to `subscription_changes` table
- Send notification email
- Handle edge cases (mid-cycle downgrades)

**2. Cron Job / Scheduled Function**
- Daily check for expired subscriptions
- Auto-downgrade if `auto_renew = false` and `current_period_end < NOW()`
- Use Supabase Cron or external scheduler (Vercel Cron, GitHub Actions)

**3. Extension UI: `src/options.html` & `src/options.js`**
- Display subscription status with expiration date
- "Cancel Auto-Renewal" toggle switch
- "Downgrade Now" button (if applicable)
- Confirmation modals
- Call edge function on user action

**4. Email Notifications**
- 7 days before expiration: "Your Pro subscription expires soon"
- Day of expiration: "Your subscription has expired"
- After downgrade: "You've been downgraded to Free"

#### Edge Cases
- What if subscription expires mid-summary?
- What if user downgrades but has pending API key usage?
- What if user cancels auto-renewal but then resubscribes before expiration?
- What if payment fails but subscription is still active?

---

## Implementation Tasks

### Phase 1: Subscription Downgrade (Priority: High)

#### Database Setup
- [ ] Add `auto_renew` column to `subscriptions` table
- [ ] Add `downgrade_scheduled_for` column to `subscriptions` table
- [ ] Add `downgrade_reason` column to `subscriptions` table
- [ ] Create `subscription_changes` table
- [ ] Set up RLS policies for new columns/tables

#### Backend Implementation
- [ ] Create `downgrade-subscription` edge function
- [ ] Implement automatic downgrade logic
- [ ] Implement manual downgrade logic
- [ ] Add logging to `subscription_changes` table
- [ ] Set up cron job for daily expiration checks
- [ ] Create email templates for notifications

#### Extension UI
- [ ] Add subscription status display to options.html
- [ ] Add "Cancel Auto-Renewal" toggle
- [ ] Add "Downgrade Now" button
- [ ] Create confirmation modals
- [ ] Wire up API calls to edge function
- [ ] Handle success/error states

#### Testing
- [ ] Test automatic downgrade on expiration
- [ ] Test manual downgrade flow
- [ ] Test cancel auto-renewal flow
- [ ] Test email notifications
- [ ] Test edge cases (mid-cycle, payment failures, etc.)

### Phase 2: Account Deletion (Priority: Medium)

#### Database Setup
- [ ] Add `deleted_at` column to `users` table
- [ ] Add `deletion_requested_at` column to `users` table
- [ ] Add `deletion_scheduled_for` column to `users` table
- [ ] Add `is_deleted` column to `users` table
- [ ] Set up RLS policies for soft-deleted users

#### Backend Implementation
- [ ] Create `delete-user-account` edge function
- [ ] Implement cascade deletion logic
- [ ] Implement data anonymization
- [ ] Schedule hard deletion (30 days)
- [ ] Create email confirmation template
- [ ] Set up scheduled cleanup job (optional)

#### Extension UI
- [ ] Add "Danger Zone" section to options.html
- [ ] Add "Delete Account" button
- [ ] Create two-step confirmation modal
- [ ] Implement "type DELETE to confirm" input
- [ ] Wire up API calls to edge function
- [ ] Handle success/error states
- [ ] Clear local storage on success

#### Testing
- [ ] Test account deletion flow
- [ ] Test data anonymization
- [ ] Test cascade deletions
- [ ] Test 30-day grace period
- [ ] Test email confirmations
- [ ] Test edge cases (active subscriptions, pending payments, etc.)

---

## API Endpoints

### 1. Downgrade Subscription
**Endpoint:** `POST /functions/v1/downgrade-subscription`  
**Auth:** Required (user's access token)  
**Body:**
```json
{
  "action": "cancel_auto_renew" | "downgrade_now",
  "reason": "user_requested" | "expired" | "payment_failed"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "status": "canceled",
    "plan": "free",
    "current_period_end": "2026-02-27T00:00:00Z"
  }
}
```

### 2. Delete Account
**Endpoint:** `POST /functions/v1/delete-user-account`  
**Auth:** Required (user's access token)  
**Body:**
```json
{
  "confirmation": "DELETE"
}
```

**Response:**
```json
{
  "success": true,
  "deletion_scheduled_for": "2026-02-26T00:00:00Z",
  "message": "Account will be permanently deleted in 30 days"
}
```

---

## UI Mockups

### Options Page - Account Section Addition
```
┌─────────────────────────────────────┐
│ Account                             │
├─────────────────────────────────────┤
│ Logged in as: user@example.com      │
│ [Upgrade to Pro] [Refresh] [Logout]│
│                                     │
│ Subscription: Pro (expires Jan 31)   │
│ ☑ Auto-renewal enabled              │
│ [Cancel Auto-Renewal]               │
│ [Downgrade Now]                     │
│                                     │
│ ⚠️ Danger Zone                      │
│ [Delete My Account]                 │
└─────────────────────────────────────┘
```

### Delete Account Modal
```
┌─────────────────────────────────────┐
│ ⚠️ Delete Account                   │
├─────────────────────────────────────┤
│ This action cannot be undone.        │
│                                     │
│ • All your summaries will be deleted│
│ • Your subscription will be canceled │
│ • Account will be deleted in 30 days│
│                                     │
│ Type DELETE to confirm:             │
│ [________________]                  │
│                                     │
│ [Cancel]  [Delete Account]          │
└─────────────────────────────────────┘
```

### Cancel Auto-Renewal Modal
```
┌─────────────────────────────────────┐
│ Cancel Auto-Renewal?                │
├─────────────────────────────────────┤
│ Your Pro subscription will remain   │
│ active until Jan 31, 2026.          │
│                                     │
│ After that, you'll be automatically │
│ downgraded to Free tier.            │
│                                     │
│ [Keep Subscription] [Cancel Renewal]│
└─────────────────────────────────────┘
```

---

## Technical Considerations

### Security
- Require re-authentication for deletion
- Rate limit deletion requests (max 1 per 24 hours)
- Admin-only bulk operations
- Audit logging of all account changes

### Data Retention
- GDPR compliance (30-day grace period for account recovery)
- Payment records (keep 7 years for tax/compliance)
- Anonymized analytics (optional)

### Performance
- Batch process expired subscriptions (not one-by-one)
- Index `current_period_end` and `auto_renew` columns
- Cache subscription status in extension storage

### Error Handling
- Handle network failures gracefully
- Retry logic for scheduled jobs
- User-friendly error messages
- Fallback to manual admin intervention if needed

---

## Dependencies

### New Dependencies
- None (using existing Supabase infrastructure)

### External Services
- Supabase Edge Functions (for API endpoints)
- Supabase Cron (for scheduled jobs) OR Vercel Cron
- Email service (for notifications - already integrated)

---

## Success Criteria

### Account Deletion
- ✅ Users can delete their accounts through UI
- ✅ Accounts are soft-deleted immediately
- ✅ Hard deletion occurs after 30 days
- ✅ All user data is properly anonymized/deleted
- ✅ Email confirmations are sent

### Subscription Downgrade
- ✅ Expired subscriptions auto-downgrade daily
- ✅ Users can cancel auto-renewal
- ✅ Users can downgrade immediately
- ✅ Email notifications are sent at appropriate times
- ✅ Subscription changes are logged for audit

---

## Notes

- Start with Phase 1 (Subscription Downgrade) as it's more straightforward
- Account deletion requires more careful handling due to GDPR/compliance
- Consider adding admin dashboard for manual interventions
- Monitor email delivery rates for notifications
- Consider adding analytics for downgrade reasons

---

## Future Enhancements

- Admin dashboard for account management
- Bulk operations for admins
- Account recovery within grace period
- Subscription upgrade flow improvements
- Usage analytics dashboard
