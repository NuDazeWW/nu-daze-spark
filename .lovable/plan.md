# Notification Emails + Bring-Your-Own Email Provider

## What the user gets

**Settings › Notifications (new page)**
- Each team member can turn on emails for themselves, and admins can add other recipients (for example another admin or a shared inbox).
- Two notification types, each with an on/off switch:
  1. **"Posts scheduled today"**: a morning email listing that day's scheduled posts (SM-number, platform, time, client, status). Each post links to the Posting Package. The sending time and time zone can be changed (default 7:00 AM).
  2. **"Post went out"**: sent when a post is marked Posted, with the live post link if one was saved.
- Recipients can be limited to certain clients.
- A **"Send test email"** button.

**Settings › Email Provider (new page, admins/owner only)**
- Choose a provider: **SendGrid**, **Gmail**, **Outlook / Microsoft 365**, **Yahoo**, or **Custom SMTP**.
- Each provider has its own form:
  - SendGrid: API key, from address, from name.
  - Gmail, Outlook and Yahoo: email address plus app password. Each form has short steps for creating an app password on that service.
  - Custom SMTP: host, port, security, username, password.
- **"Test connection"** sends a real email and shows the provider's exact error message if it fails.
- Saved passwords and keys are never shown again. The page only says "Connected as …", with options to Replace and Disconnect.
- Add Email Provider as a step in the Setup checklist. "Prepare blank copy" clears it, so each sold copy starts without a provider and the new organization connects its own.

**This demo instance** uses NuDaze's SendGrid. Shirley enters the key once on the Email Provider page.

## Important notes
- **"Goes out" means "marked Posted".** The app never publishes on its own, so it can't detect when a post actually goes live. The email is sent when someone clicks Mark as posted. The morning digest can also note any of yesterday's posts that are still not marked posted.
- **Gmail, Outlook and Yahoo need an "app password", not the normal password.** This needs 2-step verification on the account. Some Microsoft 365 business accounts have this turned off by IT. In that case use SendGrid or Custom SMTP.
- **These emails are only for team notifications.** Recipients are team members who opted in. Each email has a link to manage notification settings.

## Technical details
- **Tables:**
  - `notification_preferences`: user or recipient email, type, client filter, enabled, send time, time zone.
  - `email_provider_settings`: single row; provider type, from address/name, host/port, `connected_as`. Contains no secrets.
  - `notification_log`: what was sent and the result. Used to avoid duplicates (key: post id + type + date).
  - RLS: users manage their own preferences; admins manage all preferences and the provider.
- **Secrets:** stored in Vault through a security-definer RPC `set_email_provider_secret`, which only admins can call. Only the server functions can read the secret, using the service role. The browser never sees it.
- **Edge function `send-notification`:**
  - Loads the provider settings and secret.
  - Sends through the SendGrid v3 API, or over SMTP (`denomailer`) for Gmail (smtp.gmail.com:465), Outlook (smtp.office365.com:587), Yahoo (smtp.mail.yahoo.com:465) and custom servers.
  - Returns the provider's status and error message as-is.
- **Daily digest:** `pg_cron` runs every 15 minutes and calls `notification-digest`. That function sends to each recipient whose local send time has arrived and who hasn't received today's email yet.
- **"Went out" email:** a trigger on `post_cards` fires when `approval_status` changes to `posted` and queues a send through `pg_net`.
- **Blank copy:** `prepare_blank_copy` is extended to clear the provider row, its Vault secret, preferences and the log.
- Add the Setup checklist step, plus a rule in AGENTS.md: notification email goes through the workspace-configured provider; app code never hardcodes a provider.
