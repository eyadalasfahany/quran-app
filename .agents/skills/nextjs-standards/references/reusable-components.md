# Reusable Components

> Company rule for organizing, naming, and reusing React components. Mechanics → `next-best-practices/file-conventions.md`.

## REQUIRED

- **One component per file.** Filename = the exported component, **PascalCase** (`Button.tsx` exports `Button`).
- **Shared/generic components live in `components/common/`.** Feature-specific ones live in a named feature folder (`components/<Feature>/`).
- **Extract to `components/common/` on the 2nd use** — not before.
- **Check `components/common/` (and `utils/`, `hooks/`) before writing a new component.** Reuse first.
- **Keep components focused.** Server by default; `'use client'` only at interactive leaves ([serverside.md](serverside.md)).
- **Style with the `cn` helper** for conditional class merging.

## Canonical example

```tsx
// components/common/Button.tsx  — shared, reused 2+ places
import { cn } from "@/src/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded px-4 py-2",
        variant === "primary" ? "bg-navy text-white" : "bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
```

A `HomeBanner` used only on the home page stays in `components/HomePageComponents/HomeBanner.tsx` — not in `common/`.

## FORBIDDEN

- Multiple exported components in one file.
- Pre-abstracting a "reusable" component used in exactly one place.
- Dumping feature-specific components into `common/`.
- Filename not matching the export, or wrong case.
- Re-creating a component/util that already exists.

## Checklist

- [ ] File named in PascalCase, matches the export.
- [ ] In `common/` only if used 2+ places; otherwise a feature folder.
- [ ] Searched for an existing component/util before creating.
- [ ] Server by default; client only if interactive.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "I'll probably reuse it later" | Extract on the 2nd real use, not a hypothetical one. |
| "common/ is just a convenient bucket" | common/ = shared only. Feature code goes in its feature folder. |
| "Quicker to write a new one than search" | Search first — duplicates rot. Reuse or extend. |
