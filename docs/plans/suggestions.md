# Plan: website suggestions form (ADR 0066)

Status: **done.** Built, deployed and live on the website and the API (developer, 6 Nov 2026). The app card ships in the next store build.

Work on `main`. Three steps. Each one gets its own Haiku brief and review.

## Step 1: API (`apps/api`)

- **Domain** `app/Domains/Feedback/`:
  - `FeedbackServiceProvider`: registers `routes.php` under `api/v1` and the `suggestions` limiter (per IP, 5 an hour and 20 a day). It also schedules `model:prune` for `Suggestion`.
  - `Models/Suggestion` (`Prunable`, 12 months).
  - `Http/Requests/StoreSuggestionRequest`.
  - `Http/Controllers/SuggestionController`.
  - `Services/SuggestionService`: stores the row, applies the honeypot and the per-email auto-reply cap, and dispatches the mails.
  - `Mail/SuggestionReceived` and `Mail/SuggestionAutoReply`: queued, `afterCommit`.
  - Mail views in `resources/views/mail/feedback/`. The Arabic one has `<html lang="ar" dir="rtl">`.
  - Strings in `lang/{ar,en}/feedback.php`.
- **Config** `config/feedback.php`: `admin_address` (env `FEEDBACK_ADMIN_EMAIL`), `retention_months` = 12, and the limits.
- **Migration** `suggestions`:

  | column | type |
  | --- | --- |
  | `id` | bigint PK |
  | `name` | varchar(100) null |
  | `email` | varchar(254) |
  | `message` | text |
  | `locale` | char(2) |
  | `auto_reply_sent` | bool |
  | `created_at`, `updated_at` | datetime(6) |

  Index on `created_at`.
- **Endpoint** `POST /api/v1/suggestions`:
  - Body: `name?` (≤100), `email` (RFC email, ≤254), `message` (10–5000), `locale` (`ar`|`en`), `website` (honeypot, must be empty).
  - Responses: `202 {"status":"received"}`, 422 problem+json, 429.
- **Pest tests:**
  - A stored row, with both mails queued and the right locale on each.
  - The admin mail's `Reply-To` is the visitor.
  - The auto-reply contains neither the message nor the name.
  - Validation failures (422).
  - The honeypot stores nothing and sends nothing.
  - The per-IP 429.
  - The per-email cap: stored and notified, no auto-reply.
  - A mail exception still returns 202.
  - Pruning removes rows older than 12 months.
  - A CORS preflight from `https://taybah-app.com`.
- **Docs and contract:**
  - `.env.example`: `MAIL_*` for Resend and `FEEDBACK_ADMIN_EMAIL`.
  - Spec §5: the `suggestions` table. Spec §9: the new row.
  - `railway-release.md`: the variables and Resend's DNS records.
  - Run `npm run generate -w @quran/api-contract`.
- **Gates:** `composer qa`, plus a contract diff check.

## Step 2: Website (`website/`)

- `suggest.html`, copied from `support.html`:
  - Fields: name (optional), email, suggestion, and a hidden honeypot.
  - Both languages, using `data-l` and `data-aria-*`.
  - An `aria-live` status area for sending, sent, error, and too many tries.
- `assets/js/suggest.js`:
  - Posts JSON to the `data-api` URL on the form (`https://app.taybah-app.com/api/v1/suggestions`), with `locale` taken from `document.documentElement.lang`.
  - Maps 422 `errors` to the fields and disables the button while sending.
  - Works without the honeypot ever being visible.
- Form styles in `site.css`, built from the existing tokens.
- Add `("suggest", True)` to `PAGES`. Add the link to the header, mobile and footer navs on every page and from `support.html`, and add the page to `llms.txt`.
- Gates: `inline-icons.py`, then `build-seo.py`, then `build-seo.py --check`.

## Step 3: Privacy and verification

- `privacy.html` (ar and en), sections 3, 5 and 7: the suggestion form, Resend as the sender, the 12-month retention, and deletion on request.
- Rebuild `en/`.
- Local end to end with `MAIL_MAILER=log`:
  - Submit from `/suggest` and `/en/suggest`.
  - Check both mails in the log, in the right language and direction.

## Step 4: App (`apps/mobile`, ADR 0066 decision 7)

- Settings gets a card that opens the `/settings/suggest` sheet. Frames: `SettingsSuggestCard` and `SuggestSheet*`.
- Code:
  - `apiPost` in `core/api`
  - `features/suggestions`: the api, the hook, the components and the screen
  - i18n in `ar` and `en`
- States: idle, field error, sending, sent, offline, limited and failed. When sending fails, the text stays in the form.
- Gates:
  - lint, tsc, jest and expo-doctor
  - screenshots on the iPhone 17 simulator, compared with the frames

## You set up by hand (not in code)

1. In Resend: add the domain `taybah-app.com` and add the DNS records it gives you (SPF, DKIM, and optionally DMARC).
2. On Railway, set these variables:
   - `MAIL_MAILER=smtp`
   - `MAIL_HOST=smtp.resend.com`
   - `MAIL_PORT=465`
   - `MAIL_SCHEME=smtps`
   - `MAIL_USERNAME=resend`
   - `MAIL_PASSWORD=<Resend API key>`
   - `MAIL_FROM_ADDRESS=no-reply@taybah-app.com`
   - `MAIL_FROM_NAME=Taybah`
   - `FEEDBACK_ADMIN_EMAIL=<your email>`
