# Types & Interfaces

> Company rule for TypeScript types and where they live.

## REQUIRED

- **Shared API-response shapes and cross-component types live in `src/types/`** (one file per domain, e.g. `types/project.ts`).
- **Local/props-only types live in the component's directory** — in a dedicated `types.ts` file next to the component, not inlined inside the component file. Types can grow large; keeping them separate keeps both files readable.
- **Type the data boundary.** Every API response has a real interface; the `services/` function returns that type ([api-integrations.md](api-integrations.md)).
- **Honor `strict` mode.** Don't defeat it.
- **Narrow `unknown` with a type guard** when a shape is genuinely uncertain — at the boundary, once.

## Canonical example

```ts
// types/project.ts — shared, lives in types/
export interface Project {
  id: string;
  title: string;
  sections: Section[];
}
export interface Section {
  type: string;
  content: Record<string, unknown>;
}

// type guard for an uncertain boundary (use instead of `as`)
export function isProject(v: unknown): v is Project {
  return typeof v === "object" && v !== null && "id" in v && "title" in v;
}
```

```ts
// components/Projects/types.ts — local props, NOT in types/ (not shared)
export interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}
```

```tsx
// components/Projects/ProjectCard.tsx — import from sibling types.ts
import type { ProjectCardProps } from "./types";

export function ProjectCard({ project, featured }: ProjectCardProps) { /* … */ }
```

## FORBIDDEN

- `any` — use `unknown` + narrowing.
- Inline `as` assertions to silence the compiler (`(x as { id: number }).id`). Casts are allowed ONLY at a validated boundary — and prefer a type guard even there.
- `@ts-ignore` to hide a real error (use `@ts-expect-error` with a reason only for known framework gaps).
- Inlining prop types inside the component file — put them in `types.ts` in the same directory.
- Centralizing trivial one-off prop types in `types/`.
- Re-declaring the same interface in multiple files — share it from `types/`.

## Checklist

- [ ] No `any`; no compiler-silencing `as`/`@ts-ignore`.
- [ ] Shared/API types in `types/`; local props in a `types.ts` file inside the component's directory.
- [ ] Service returns a typed shape, not `unknown`/`any`.
- [ ] Uncertain shapes narrowed with a type guard.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "`any` just for now" | `unknown` + narrow. `any` disables type safety for every downstream caller. |
| "`as` is quicker than a guard" | A cast hides the bug the guard would catch. Narrow at the boundary. |
| "The API shape is messy, so `any`" | Define the interface once in `types/`; narrow with a guard. |
| "The canonical helper example used `as`, so I will too" | The examples pass a type guard and narrow — copy the guard, not a cast. `serverPageFetchRequest` takes an `isValid` guard for exactly this. |
