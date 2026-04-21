# send-welcome-email

Sends a branded "Welcome to TermsDigest" email to every user the moment they
confirm their email in Supabase. The email is BCC'd to Trustpilot's Automatic
Feedback Service (AFS) address so Trustpilot can automatically invite the user
to leave a review.

## Flow

```
user confirms email in Supabase
        │
        ▼
Postgres trigger on auth.users fires
(email_confirmed_at: NULL -> timestamp)
        │
        ▼
pg_net posts JSON to this Edge Function
Headers: Authorization: Bearer <WELCOME_EMAIL_SECRET>
Body:    { "email": "user@example.com", "user_id": "..." }
        │
        ▼
Edge Function connects to Hostinger SMTP
Sends welcome email
  From: no-reply@termsdigest.com
  To:   user@example.com
  BCC:  termsdigest.com+xxxx@invite.trustpilot.com
        │
        ▼
Trustpilot automatically invites user to review
```

## Environment variables

Set these in **Supabase Dashboard → Edge Functions → Secrets** (or via
`supabase secrets set ...` if you use the CLI):

| Name | Example | Notes |
|------|---------|-------|
| `SMTP_HOST` | `smtp.hostinger.com` | From Hostinger → Email → Configuration |
| `SMTP_PORT` | `465` | Implicit TLS |
| `SMTP_USERNAME` | `admin@termsdigest.com` | The real mailbox (not the alias) |
| `SMTP_PASSWORD` | _your mailbox password_ | |
| `SMTP_FROM_EMAIL` | `no-reply@termsdigest.com` | The alias you want emails sent from |
| `SMTP_FROM_NAME` | `TermsDigest` | Display name in inboxes |
| `TRUSTPILOT_AFS_BCC` | `termsdigest.com+1c4df22e62@invite.trustpilot.com` | From Trustpilot AFS dashboard |
| `SITE_URL` | `https://termsdigest.com` | Used in CTA links |
| `WELCOME_EMAIL_SECRET` | _32+ random chars_ | Shared secret between trigger and function |

Generate `WELCOME_EMAIL_SECRET` with e.g. `openssl rand -hex 32`.

## Postgres trigger setup

Run this in **Supabase Dashboard → SQL Editor** (replace the two placeholders):

```sql
-- Enable pg_net extension (if not already enabled)
create extension if not exists pg_net with schema extensions;

-- Function: call the Edge Function when a user confirms their email
create or replace function public.handle_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url  text := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/send-welcome-email';
  v_secret        text := '<YOUR-WELCOME-EMAIL-SECRET>';
begin
  -- Only fire when email_confirmed_at transitions from NULL to a timestamp
  if OLD.email_confirmed_at is null and NEW.email_confirmed_at is not null then
    perform net.http_post(
      url     := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body    := jsonb_build_object(
        'email',    NEW.email,
        'user_id',  NEW.id::text
      )
    );
  end if;
  return NEW;
end;
$$;

-- Trigger: fires after UPDATE on auth.users
drop trigger if exists on_email_confirmed on auth.users;
create trigger on_email_confirmed
  after update on auth.users
  for each row
  execute function public.handle_email_confirmation();
```

Replace:

- `<YOUR-PROJECT-REF>` → your Supabase project ref (the subdomain of
  `<ref>.supabase.co`, e.g. `rsxvxezucgczesplmjiw`)
- `<YOUR-WELCOME-EMAIL-SECRET>` → the exact value of `WELCOME_EMAIL_SECRET`
  you set as an Edge Function secret

## Deploying

```bash
# From repo root
supabase functions deploy send-welcome-email
```

No JWT verification needed (we use our own shared secret instead), but if you
want to disable JWT at deploy time:

```bash
supabase functions deploy send-welcome-email --no-verify-jwt
```

## Testing

### 1. Direct function call (sanity check)

```bash
curl -X POST \
  -H "Authorization: Bearer xxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"email":"testEmail@domain.com"}' \
  https://rsxvxezucgczesplmjiw.supabase.co/functions/v1/send-welcome-email
```

Expected response: `{"ok":true}` and the test email arrives in your inbox.

### 2. End-to-end

1. Sign up in the extension with a fresh test email (a Gmail or other non-Hotmail
   address, to avoid Safe Links scanning issues).
2. Click the confirmation link in the Supabase confirm email.
3. Within ~10 seconds you should receive the welcome email from
   `no-reply@termsdigest.com`.
4. A few days later, Trustpilot will send a review invite to the same email.

## Troubleshooting

- **Email not arriving**: Check Supabase Function logs
  (Dashboard → Edge Functions → send-welcome-email → Logs). SMTP auth errors
  usually indicate wrong password or "From alias not permitted" — in that case
  set `SMTP_FROM_EMAIL` to `admin@termsdigest.com` (the real mailbox).
- **Landing in spam**: Make sure DKIM is verified in Hostinger (DNS TXT record
  for `hostingermail1._domainkey.termsdigest.com`) and SPF includes
  `_spf.mail.hostinger.com`.
- **Trigger not firing**: Check the Postgres log (Dashboard → Logs → Postgres).
  Confirm `pg_net` extension is enabled. Confirm the trigger exists with
  `select * from pg_trigger where tgname = 'on_email_confirmed';`.
