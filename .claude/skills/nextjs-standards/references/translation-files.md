# Translations (i18n)

> Company rule for next-intl usage and translation files. Mechanics → `next-best-practices/file-conventions.md`.

## REQUIRED

- **next-intl, always-prefix locale.** Routing is locale-prefixed (`/[locale]/...`); config in `i18n/routing.ts`, `i18n/request.ts`.
- **Validate a `locale` param with `isLocale`, never `locale as "en" | "ar"`.** Derive the `Locale` type from `routing.locales` and use the guard everywhere a raw `string` locale enters typed code (layouts, `request.ts`, metadata).
- **No hardcoded user-facing strings.** All text via translation keys.
- **Server Components / functions → `getTranslations`.** Client Components → `useTranslations`.
- **Mirror every key across ALL locale files** (`messages/en.json`, `messages/ar.json`, …) with identical nesting. A key added to one locale MUST exist in all.
- **Namespace keys by feature/section** (`contact.title`, `contact.errors.email`).
- **RTL:** `ar` renders RTL — use logical CSS (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`) not hardcoded `left`/`right`.

## Canonical example

```tsx
// Server Component / generateMetadata → getTranslations
import { getTranslations } from "next-intl/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return <h1>{t("title")}</h1>;
}
```

```tsx
// Client Component → useTranslations
"use client";
import { useTranslations } from "next-intl";

export function CTA() {
  const t = useTranslations("home");
  return <button>{t("cta")}</button>;
}
```

```jsonc
// messages/en.json                  // messages/ar.json — SAME structure
{ "home": { "title": "...", "cta": "..." } }
{ "home": { "title": "...", "cta": "..." } }
```

```ts
// i18n/routing.ts — derive the type + guard from the single source of locales
export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
```

```tsx
// usage — validate, don't cast
import { routing, isLocale } from "@/src/i18n/routing";

const { locale } = await params;          // locale: string
if (!isLocale(locale)) notFound();        // locale: Locale from here — no `as`
```

## FORBIDDEN

- Literal strings in JSX (`<p>Submit</p>`) — use `t('...')`.
- A key present in one locale file but missing in another.
- `useTranslations` in a Server Component, or `getTranslations` in a Client Component.
- Hardcoded `left`/`right` that breaks RTL.
- `locale as "en" | "ar"` (or `as Locale`) to satisfy the compiler — validate with `isLocale` and narrow.

## Checklist

- [ ] No hardcoded user-facing text.
- [ ] Key exists in EVERY locale file with the same structure.
- [ ] Correct hook: server `getTranslations` / client `useTranslations`.
- [ ] Keys namespaced by feature.
- [ ] RTL-safe (logical properties).
- [ ] Locale params validated with `isLocale`; no `locale as ...` casts.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "It's just a label, I'll hardcode it" | Every user-facing string is a key. No exceptions. |
| "I'll add the `ar` key later" | Add to all locales now, or the build/UX breaks. |
| "`ml-4` is fine" | `ar` is RTL — use `ms-4`. Hardcoded sides break layout. |
| "`locale as Locale` is fine, params are always valid" | The router types it as `string`; an invalid segment is possible. Validate with `isLocale` and `notFound()` — narrow, don't cast. |
