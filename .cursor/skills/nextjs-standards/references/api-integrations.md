# API Integrations

> Company rule for talking to backend APIs: the `services/` layer, the shared axios instance, the server fetch helper, and when to add a route handler. Mechanics → `next-best-practices/route-handlers.md`, `data-patterns.md`. Where fetching happens → [serverside.md](serverside.md). Caching/`revalidate` → [performance.md](performance.md).

## REQUIRED

- **Every fetch goes through a function in `services/`.** Pages/components call services — never the axios instance directly.
- **One shared axios instance** (`config/axios.ts`): baseURL, default headers, timeout, and a response interceptor that **normalizes errors to `{ message, status }`**.
- **Server fetches** use a server helper (`config/APIConfig.ts`) that sets `Accept-Language`, passes `next: { revalidate }` ([performance.md](performance.md)), and **unwraps the envelope as `res.data?.data ?? res.data`**.
- **Client-side fetching uses TanStack React Query.** `useQuery` for reads, `useMutation` for writes/submits. The query/mutation function always calls a `services/` function — never raw axios.
- **All client-side requests go through `generalGetRequest` / `generalPostRequest`** (`config/clientAPI.ts`). Both accept a `() => Promise<T>` — the service function builds the actual request and passes it in. They handle 401/404/500 redirects and throw a normalized `ClientApiError`. Auth/locale/domain headers are attached automatically by the axios **request interceptor** — never set them manually in service functions. No try/catch in components or forms.
- **Query keys are centralized in `src/lib/queryKeys.ts`.** One factory function per endpoint. No endpoint may have two different keys in different files — the key file is the single source of truth.
- **Services return a typed shape** ([types-interfaces.md](types-interfaces.md)) — never `any`.
- **Add an `app/api/*` route handler ONLY when:** you must hide a server-only secret/backend URL from the browser, receive a webhook, or transform/aggregate before the client gets it.
- **A form submit / mutation does NOT by itself need a route handler.** If the backend URL is already public (`NEXT_PUBLIC_*`) and auth rides on cookies, the client service POSTs the backend **directly**. Add a proxy route only for the reasons above.

## Security — auth tokens

- **Auth tokens live in cookies, NEVER in `localStorage`/`sessionStorage`.** `localStorage` is readable by any XSS; cookies (ideally `httpOnly`, `Secure`, `SameSite`) are not exposed to JS.
- The browser sends cookies automatically for same-origin requests. For cross-origin, set `withCredentials: true`.
- Do **not** read the token in JS to attach a header manually. If a Server Component must forward auth to an external API, read it server-side via `cookies()` from `next/headers` and forward it there.

## Canonical shapes

If these files don't exist, create them in this shape (greenfield-safe). No `console.log` in committed code.

> Every snippet below obeys [types-interfaces.md](types-interfaces.md): **no `as` at a data boundary — pass a type guard and narrow.** If you copy a shape, copy the guard too.

```ts
// config/axios.ts — shared instance + interceptors
import axios from "axios";
import Cookies from "js-cookie";
import { decryptData, getClientDomain } from "@/src/utils/clientHelpers";

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL || "",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 10000,
  withCredentials: true,
});

// Attach auth + locale + domain headers on every client-side request
axiosInstance.interceptors.request.use((config) => {
  const authDataCookie = Cookies.get("authData");
  const user = authDataCookie ? decryptData(authDataCookie) : null;
  const locale = Cookies.get("NEXT_LOCALE") || "en";

  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  config.headers["Accept-Language"] = locale;
  config.headers["x-client-domain"] = getClientDomain();
  return config;
});
```

```ts
// config/APIConfig.ts — server fetch helper (envelope unwrap + revalidate)
import { axiosInstance } from "./axios";

export async function serverPageFetchRequest<T>(
  route: string,
  isValid: (value: unknown) => value is T,   // narrow at the boundary — no `as`
  revalidate = 60,                           // cache-first default (performance.md)
  locale = "en",
): Promise<T | null> {
  if (!route) return null;
  try {
    const res = await axiosInstance.get(route, {
      headers: { "Accept-Language": locale },
      // @ts-expect-error Next fetch option passed through axios adapter
      next: { revalidate },
    });
    const payload: unknown =
      typeof res.data === "object" && res.data !== null && "data" in res.data
        ? res.data.data            // TS 4.9+ narrows via `in` — no cast needed
        : res.data;
    return isValid(payload) ? payload : null;
  } catch {
    return null;
  }
}
```

```ts
// config/clientAPI.ts — error-handling wrappers for client-side requests
// Accept any () => Promise<T>. Auth/locale headers are set by the axios request interceptor.
import axios from "axios";
import Cookies from "js-cookie";
import { getClientCodeFromUrl, buildPublicPath } from "@/src/utils/clientHelpers";

export interface ClientApiError {
  data: unknown;
  message: string;
  status: number;
  statusText: string;
}

export interface ClientApiOptions {
  noRedirect?: boolean;
  custom401Function?: () => void;
  notFoundPageOnError?: boolean;
}

function handleError(error: unknown, options: ClientApiOptions = {}): never {
  const { noRedirect, custom401Function, notFoundPageOnError } = options;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const locale = Cookies.get("NEXT_LOCALE") || "en";
    if (status === 404 && !noRedirect && typeof window !== "undefined") {
      window.location.href = "/404";
    }
    if (status === 401) {
      custom401Function?.();
      if (!noRedirect && typeof window !== "undefined") {
        Cookies.remove("authData");
        const market = getClientCodeFromUrl();
        window.location.href = buildPublicPath(locale, market, "/login");
      }
    }
    if (status === 500 && notFoundPageOnError && typeof window !== "undefined") {
      window.location.href = "/404";
    }
  }
  throw {
    data: axios.isAxiosError(error) ? error.response?.data : undefined,
    message: axios.isAxiosError(error) ? error.message : String(error),
    status: axios.isAxiosError(error) ? (error.response?.status ?? 500) : 500,
    statusText: axios.isAxiosError(error) ? (error.response?.statusText ?? "") : "",
  } satisfies ClientApiError;
}

export const generalGetRequest = async <T>(
  requestFn: () => Promise<T>,
  options?: ClientApiOptions,
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    handleError(error, options);
  }
};

export const generalPostRequest = async <T>(
  requestFn: () => Promise<T>,
  options?: ClientApiOptions,
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    handleError(error, options);
  }
};
```

```ts
// services/contact.ts — typed wrappers; this is what pages/hooks call
import { serverPageFetchRequest } from "@/src/config/APIConfig";
import { generalGetRequest, generalPostRequest } from "@/src/config/clientAPI";
import { axiosInstance } from "@/src/config/axios";
import { isContactPageContent } from "@/src/types/contact"; // type guard — see types-interfaces.md
import type { ContactPageContent, ContactFormValues } from "@/src/types/contact";

// Server Component fetch (ISR — uses serverPageFetchRequest, not generalGetRequest)
// The guard narrows the boundary so the helper returns ContactPageContent | null — no `as`.
export function getContactPage(locale: string): Promise<ContactPageContent | null> {
  return serverPageFetchRequest("/api/contact-page", isContactPageContent, 60, locale);
}

// Client-side read — service fn passed to useQuery as queryFn
export function getContactPageClient(locale: string): Promise<ContactPageContent> {
  return generalGetRequest(() =>
    axiosInstance.get<unknown>("/api/contact-page", { params: { locale } }).then((res) => {
      const payload =
        typeof res.data === "object" && res.data !== null && "data" in res.data
          ? res.data.data
          : res.data;
      if (!isContactPageContent(payload)) throw new Error("Invalid contact page payload");
      return payload;
    }),
  );
}

// Client-side mutation — service fn passed to useMutation as mutationFn
export async function submitContact(values: ContactFormValues): Promise<void> {
  return generalPostRequest(() => axiosInstance.post("/api/contact", values));
}
```

### Query keys — centralized (greenfield-safe)

```ts
// src/lib/queryKeys.ts — THE source of truth for all query keys
// Format: [domain, operation, ...discriminators]
// Never define a key outside this file.

export const queryKeys = {
  projects: {
    all:    ()                        => ["projects"]                    as const,
    list:   (locale: string)          => ["projects", "list", locale]    as const,
    detail: (slug: string, locale: string) => ["projects", "detail", slug, locale] as const,
  },
  contact: {
    page:   (locale: string)          => ["contact", "page", locale]     as const,
  },
  // add new domains here — never inline a key in a component or hook
} as const;
```

### Client-side read — `useQuery`

Cache defaults (`staleTime`, `gcTime`, `refetchOnWindowFocus`) are set once on `QueryClient` at provider setup — see [performance.md](performance.md). Do not repeat them on every hook; override per-query only for live data.

```tsx
// hooks/useContactPage.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/src/lib/queryKeys";
import { getContactPageClient } from "@/src/services/contact";

export function useContactPage(locale: string) {
  return useQuery({
    queryKey: queryKeys.contact.page(locale),
    queryFn:  () => getContactPageClient(locale), // service wraps generalGetRequest
  });
}
```

### Client-side write — `useMutation` + Formik

No try/catch in the component — `generalPostRequest` handles errors; `mutation.isError` surfaces them.

```tsx
// components/Contact/ContactForm.tsx (onSubmit wiring only)
const mutation = useMutation({ mutationFn: submitContact }); // submitContact wraps generalPostRequest

onSubmit={(values, { setSubmitting }) => {
  mutation.mutate(values, { onSettled: () => setSubmitting(false) });
}}

{mutation.isSuccess && <p role="status">{t("form.success")}</p>}
{mutation.isError   && <p role="alert">{t("form.error")}</p>}
```

### Route handler (only for client/proxy/secret/webhook)

```ts
// app/api/projects/route.ts — lets the CLIENT fetch without exposing the backend
import { NextResponse } from "next/server";
import { getProjects } from "@/src/services/projects";

export async function GET() {
  const data = await getProjects();
  return NextResponse.json({ data: data ?? [] });
}
```

## FORBIDDEN

- Calling `axiosInstance` directly in a service for client-side requests — use `generalGetRequest` / `generalPostRequest` from `config/clientAPI.ts`.
- try/catch in a component or form for an API call — `generalGetRequest`/`generalPostRequest` throw a normalized `ClientApiError`; let `useMutation`/`useQuery` catch it.
- Importing `axiosInstance` inside a component.
- Client-side fetching with raw `useEffect` + axios/fetch — use `useQuery` or `useMutation`.
- Defining a query key inline in a component or hook (`queryKey: ["contact", locale]`) — all keys come from `queryKeys.ts`.
- Two different keys for the same endpoint in different files — causes silent cache misses and duplicate requests.
- Storing/reading auth tokens in `localStorage`/`sessionStorage`.
- A route handler that just re-exposes data a Server Component could fetch directly.
- Services that return `any` or swallow errors with no normalization.
- Committed `console.log` in axios/services/route handlers.

## Checklist

- [ ] Fetch wrapped in a `services/` function; no axios in components.
- [ ] Client-side reads use `useQuery`; client-side writes use `useMutation`.
- [ ] Query key comes from `src/lib/queryKeys.ts`; no inline key literals.
- [ ] No duplicate keys for the same endpoint across files.
- [ ] Server vs client fetch path chosen correctly ([serverside.md](serverside.md)).
- [ ] Auth via cookies, never localStorage.
- [ ] Client-side service functions use `generalGetRequest` / `generalPostRequest` — not `axiosInstance`.
- [ ] No try/catch in components/forms — error state from `useMutation.isError` / `useQuery.isError`.
- [ ] Errors normalized to `{ message, status }`; envelope unwrapped in the helper.
- [ ] Route handler added only for a client/proxy/secret/webhook reason.
- [ ] Service returns a typed shape; no debug logging.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "Quick fetch, I'll call axios inline" | All fetches go through `services/`. No exceptions. |
| "useEffect + axios is simpler than useQuery" | `useQuery` gives loading/error state, dedup, and cache for free. Use it. |
| "I'll define the key here, it's just a string" | Inline keys = silent cache misses when another file uses a different string. Keys go in `queryKeys.ts`. |
| "These two endpoints are similar, close enough key" | One endpoint = one key. Different key = different cache entry = duplicate request. |
| "Mutation doesn't need React Query, Formik handles it" | `useMutation` wraps the services call and gives loading/error state. Use it in `onSubmit`. |
| "I'll try/catch the service call myself" | `generalGetRequest`/`generalPostRequest` throw `ClientApiError`; `useMutation`/`useQuery` catch it. No try/catch in components. |
| "I'll call axiosInstance directly in the service" | Use `generalGetRequest`/`generalPostRequest` — they handle auth, locale, and redirects. |
| "localStorage token is easier than cookies" | XSS reads localStorage. Tokens go in cookies. Security rule. |
| "Route handler is cleaner" | Server Components fetch services directly; route handler only for client/proxy/secret. |
| "It's a form submit, so it needs a proxy route" | No. Client service POSTs the backend directly unless you're hiding a secret/URL. |
| "I'll type the response later" | Service returns a typed shape now — `any` poisons every caller. |
