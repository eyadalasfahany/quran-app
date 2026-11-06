# ADR 0066: Suggestions form on the website

Status: accepted · 2026-11-06

## Context

The developer wants visitors to taybah-app.com to send suggestions. The visitor gets an automatic reply in the language of the page they were on, and the developer gets an email with the visitor's details and the suggestion. The website is static HTML on Vercel (ADR 0063), so something on a server has to receive the form.

## Decision

1. **Endpoint on our API.** `POST /api/v1/suggestions` lives in a new `Feedback` domain on the Laravel API (Railway, ADR 0022). We don't use a Vercel function or a third-party form service. The endpoint is public: no token.
2. **Stored and emailed.** Each suggestion is saved in a `suggestions` table and then emailed. Rows are pruned after **12 months** (`Prunable` with a scheduled `model:prune`).
3. **Mail through Resend's HTTPS API.** Laravel's built-in `resend` mailer uses the `resend/resend-php` package. Mail is sent from `no-reply@taybah-app.com`, which needs Resend's SPF and DKIM records on taybah-app.com. Both mails are queued (Horizon, ADR 0065) and sent after commit. A mail failure is reported and never turns a saved suggestion into an error for the visitor.
   - *Amended 6 Nov 2026:* the first version used Resend's SMTP relay. Railway blocks outbound SMTP below the Pro plan, so every send hung until PHP's 30 s limit and the request failed with a 500. HTTPS isn't blocked.
4. **Two mails.**
   - **Admin notification:** goes to `FEEDBACK_ADMIN_EMAIL` (env, never in the repo). It contains the name, email, page language, time and message, and its `Reply-To` is the visitor.
   - **Auto-reply:** goes to the visitor, in Arabic (RTL) or English, depending on the `locale` the page sends. The page reads `locale` from `<html lang>`, not `Accept-Language`.
5. **Abuse limits.** A public form that emails any address it's given can be used to send spam:
   - The auto-reply is a fixed text. It never repeats the message or the name.
   - A hidden honeypot field: when it's filled, the endpoint answers 202 and stores and sends nothing.
   - Per-IP limits: 5 an hour and 20 a day (429 above that).
   - At most 2 auto-replies a day to the same email address, keyed on its SHA-256. Above that the suggestion is still stored and you are still notified, but no auto-reply goes out.
   - We don't store the IP address or the user-agent.
6. **Privacy policy.** `privacy.html` (both languages) says what the form collects, why, that Resend sends the mail, the 12-month retention, and how to ask for deletion.

7. **The same form in the app** (added 6 Nov 2026, frames `SettingsSuggestCard` and `SuggestSheet*` approved):
   - **Where:** a Settings card «اقترح فكرة» opens a sheet with the same fields. It posts to the same endpoint with `source: "app"`, and `locale` is the app's language. Each row records `source` (`website`|`app`), and the admin mail shows it.
   - **Offline:** sending is a network action, not a personal write, so it doesn't go through `user.db` or the outbox. With no connection, the text stays in the form, and the person retries by hand with «أعد المحاولة». Nothing is sent in the background.
   - **Store forms:** the App Store privacy details and Google Play's Data safety form must list contact info (email) and user content. Both are collected, not linked to the person's identity, and not used for tracking.

## Consequences

- One more public write endpoint, plus a table in spec §5 and a row in spec §9. The OpenAPI file regenerates; the mobile app doesn't call the endpoint.
- Manual setup:
  - In Resend: verify the domain and add its DNS records on taybah-app.com.
  - On Railway: set `MAIL_*` and `FEEDBACK_ADMIN_EMAIL`.
- The privacy page no longer says we collect no email. That now holds for the app only.
