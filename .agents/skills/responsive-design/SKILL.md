---
name: responsive-design
description: Use when auditing, fixing, or verifying responsive layout across devices — breakpoints, mobile/tablet/desktop, foldables, iPhone safe areas, or making sure nothing broke on iPhone. Gated workflow: stack discovery → plan → approve → implement → test → approve → report. Bundles iPhone/WebGL performance standards for animation and 3D on mobile.
user-invocable: true
---

# Responsive Design

Gated, auditable workflow for responsive QA and remediation across company frontends (Next.js, admin SPAs, marketing sites). Apply this BEFORE changing layout/CSS/grid across a project.

**Core flow:**

```
Phase 0 discovery → Phase 1 plan → OWNER APPROVE → Phase 2 implement → Phase 3 parity → Phase 4 test (0 failures) → Phase 5 report
```

> Bundle companion: [references/ios-performance-standards.md](references/ios-performance-standards.md) — load in Phase 3 whenever animation, WebGL, or 3D work touches iPhone/mobile.

## How to use this skill

1. **Trigger check.** If the request is about responsive audit/fix/verify (see below), follow this skill — do **not** jump to edits.
2. **Run phases in order.** Phase 0 and Phase 1 are hard stops; no code until the plan is approved.
3. **iPhone / motion / WebGL.** Before changing animation or 3D for mobile, read [references/ios-performance-standards.md](references/ios-performance-standards.md).
4. **Related skills (do not confuse):**
   - [performance-audit](../performance-audit/SKILL.md) — Lighthouse/bundle scores; **no UI changes**. Different deliverable.
   - [animation-standards](../animation-standards/SKILL.md) — how to implement GSAP/R3F; this skill gates *when* and *how far* responsive remediations may touch motion.

### Decision table

| When you are… | Read |
| --- | --- |
| Auditing / fixing responsive layout | This file (all phases) |
| Touching animation / WebGL / 3D on iPhone or mobile | [references/ios-performance-standards.md](references/ios-performance-standards.md) |
| Measuring Lighthouse / bundle size (not layout) | [../performance-audit/SKILL.md](../performance-audit/SKILL.md) |
| Implementing GSAP / R3F patterns | [../animation-standards/SKILL.md](../animation-standards/SKILL.md) |

---

# Responsive QA & Remediation Workflow

> Defines a gated, auditable workflow: audit → plan → **approve** → implement → test → **approve** → report.
> Phase 3 loads `references/ios-performance-standards.md` whenever animation, WebGL, or 3D work touches iPhone.

## When this workflow triggers

Use this workflow whenever the user asks to audit, fix, or "make sure" a codebase is
responsive — not just when they explicitly say "responsive audit." Trigger on requests like
"check breakpoints," "make this work on all devices," "fix mobile layout," "make sure nothing
broke on iPhone," or any request to touch layout/CSS/grid code across a project rather than a
single component.

**Never skip straight to editing code.** This workflow exists specifically to prevent
silent layout/visual changes — Phase 0 and Phase 4 are hard stops, not suggestions.

---

## Phase 0 — Dependency & Stack Discovery (read-only)

Before touching anything, inventory what the project already relies on for layout and
responsiveness:

- CSS methodology in use: plain CSS, SCSS/Sass, CSS Modules, CSS-in-JS (styled-components,
  emotion), utility frameworks (Tailwind, UnoCSS), component frameworks (Bootstrap, MUI, Ant
  Design, Chakra).
- Grid/layout systems: CSS Grid, Flexbox, a framework's grid (Bootstrap grid, MUI Grid), any
  custom grid utility.
- Breakpoint definitions already declared (Tailwind config, SCSS `$breakpoints` map, media
  query constants, container-query usage).
- Animation/3D dependencies: GSAP, Framer Motion, Three.js/React Three Fiber, Lottie, CSS-only
  animation.
- Anything version-pinned that responsive changes could conflict with (e.g. an old Bootstrap
  major version with different grid breakpoints than the ones requested here).

Output of this phase is a short **Stack Summary** — no code changes yet. If a needed
tool (Tailwind, SCSS, a grid library) isn't present and would genuinely help, note it as a
*candidate recommendation* for Phase 1 — do not install or wire it in yet.

---

## Phase 1 — Plan (must be approved before any code changes)

Produce a written plan and stop. Do not proceed to Phase 2 implementation until the owner
responds. The plan must cover:

1. **Scope** — which pages/components/routes are in scope.
2. **Breakpoint strategy** — the standard set below, plus any project-specific ones found in
   Phase 0:
   - `≤767px` — mobile
   - `768–1023px` — tablet / small laptop
   - `1024–1199px` — laptop
   - `1200–1919px` — desktop
   - `≥1920px` (and explicitly `2560px`, `3840px`/4K) — wide/ultra-wide desktop
   - Fluid coverage *between* named breakpoints (not just at them) using `clamp()`,
     `minmax()`, or container queries where the framework supports it, so nothing breaks at
     e.g. 900px or 1440px just because it wasn't a named checkpoint.
   - Edge form factors, tested in **both orientations**:
     - Small phones (≤375px width)
     - Notch / Dynamic Island iPhones (safe-area sensitive)
     - Foldables — folded and unfolded states (e.g. Galaxy Fold ~280px folded /
       ~717px unfolded, Galaxy Flip cover screen)
     - Dual-screen devices (Surface Duo–style hinge gap)
     - **iPhone Duo** (Apple's foldable iPhone, launched Oct 2026) — see the dedicated
       device profile below. Unlike the generic foldable placeholder this module used to
       carry, iPhone Duo's real specs are confirmed and should be used directly.
3. **Visual-parity guarantee** (see Phase 3) — explicitly state that animations, transitions,
   and 3D/WebGL scenes will be re-scaled/adapted for performance and layout only, and that no
   content, composition, brand color, or design intent will differ between devices.
4. **Any tooling recommendation** from Phase 0 (e.g. "adopt Tailwind's breakpoint scale
   instead of hand-rolled media queries") — presented as an option with trade-offs, not a
   fait accompli.
5. **Alternative approaches**, if more than one reasonable path exists (e.g. "adjust existing
   SCSS breakpoints" vs. "introduce container queries" vs. "adopt Tailwind's scale") — let the
   owner pick.

**Ask explicitly: "Does this plan look right, or would you rather take a different approach?"**
Do not proceed past this point without a reply.

---

## Phase 2 — Implementation (only after Phase 1 approval)

- Implement only what was approved. If something outside scope needs to change to make the
  approved plan work, stop and flag it rather than expanding scope silently.
- Prefer additive, non-destructive changes: new media query ranges, `clamp()`/fluid units,
  container queries, safe-area handling — over restructuring existing markup or component
  APIs, unless the approved plan specifically called for restructuring.
- **Hard rule: no layout structure change, no visual redesign, no color/spacing/typography
  change that isn't strictly required to fix a responsiveness defect** may be made without a
  separate, explicit sign-off from business/UX — even if it would "look better." Log any such
  temptation in the report as a *suggestion*, not an applied change.

---

## Phase 3 — Visual & Motion Parity Guardrails

Goal: identical design intent and identical animation/3D behavior across all breakpoints —
only performance characteristics (frame budget, particle count, DPR, shadow quality) may
adapt per device class.

- Before changing anything animation- or WebGL/3D-related on iPhone or other mobile targets,
  load `references/ios-performance-standards.md` (the bundled iPhone frontend standards doc)
  and follow it — in particular:
  - Compositor-friendly properties only (`transform`/`opacity`) for continuous animation.
  - Adaptive DPR cap (`Math.min(devicePixelRatio, 2)`, lower for heavy WebGL).
  - Capability-based quality tiers (High/Medium/Low) rather than `if (isIPhone)` branching.
  - `prefers-reduced-motion` support is mandatory and separate from device-based quality
    reduction — both must be respected.
  - Safe-area insets for any fixed/edge-to-edge UI, including foldable hinge/notch regions.
- Quality/DPR/particle-count adaptation is allowed and expected on lower-powered devices; a
  *different look or missing element* is not. If a 3D effect must be simplified to hit frame
  budget on a given device tier, the simplified version must still read as the same design
  (same composition, same colors, same motion direction) — not a stripped-down substitute.
- Any unavoidable visual trade-off (e.g. "shadows disabled below Medium tier") must be called
  out explicitly in the report and treated as a decision needing approval, not a silent
  fallback.

---

## Phase 4 — Cross-Device Testing (target: 0 failures)

Test matrix — every item below, in portrait **and** landscape unless not applicable:

| Class | Representative widths/devices |
|---|---|
| Small mobile | ≤375px |
| Standard mobile | 390–428px (includes notch/Dynamic Island iPhones) |
| Foldable — folded | ~280–360px (generic); **iPhone Duo closed ≈ 356 CSS px wide** — see Device Profile below |
| Foldable — unfolded | ~700–720px (generic); **iPhone Duo open ≈ 626 CSS px wide** — see Device Profile below |
| Tablet | 768–1023px |
| Small laptop | 1024–1199px |
| Desktop | 1200–1919px |
| Wide/4K | 1920px, 2560px, 3840px |
| Fluid mid-points | at least one arbitrary width between each pair of breakpoints above (e.g. 900px, 1150px, 1440px) — not just the named checkpoints |

For each, verify:
- No layout breakage (overlap, clipping, horizontal scroll, orphaned content).
- Animation and 3D scenes render with the same design and no dropped-frame stutter beyond
  the device's expected tier.
- Safe-area/notch/hinge regions don't obscure interactive elements.
- Design is visually equivalent to the approved baseline at every step — not just "not
  broken," but matching intent.

**Definition of done for this phase:** 0 failing checks across the full matrix. Any failure
blocks sign-off and goes back to Phase 2, not into the final report as a known issue — unless
the owner explicitly accepts a documented exception.

---

## Phase 5 — Report

On completion, generate a single Markdown report, **not** applied changes without one. File
name must include an iteration number so repeated runs don't overwrite history:

```
responsive-audit-iteration-<N>.md
```

(`N` = 1 for the first run against a given scope; increment for each subsequent pass, even if
a pass only fixes issues found in the previous one's testing phase.)

Report must include:
1. Scope and approved plan reference (link back to what was approved in Phase 1).
2. Stack summary from Phase 0, including any tooling recommendations and whether they were
   accepted.
3. Breakpoints and device matrix actually applied.
4. List of changes made, file by file, with rationale tied back to a specific responsiveness
   defect (not "improved styling").
5. Visual/motion parity statement — confirmation that animation and 3D behavior is unchanged
   in design intent, with any accepted trade-offs called out per Phase 3.
6. Full Phase 4 test matrix results — pass/fail per device class/orientation, target 0
   failures; any accepted exceptions noted with who approved them.
7. Open items or suggestions that were intentionally *not* applied because they required
   business/UX approval outside this pass.

---

## Standing rules (apply throughout, every phase)

- No code changes before Phase 1 is approved.
- No framework/library addition (Tailwind, SCSS, Bootstrap, etc.) without explicit approval —
  propose, don't install.
- No layout or visual-design change beyond what's strictly needed to fix a responsiveness
  defect, without separate business/UX sign-off.
- No silent visual regression on any device — animations and 3D effects adapt performance,
  never appearance, without flagging it.
- Every completed pass ends in an iteration-numbered `.md` report, even if some items remain
  open.

---

## Appendix — Device Profile: iPhone Duo

Apple's first foldable iPhone (pre-order Oct 16 2026, available Oct 23 2026). Confirmed specs
from apple.com; treat CSS-pixel (viewport) values below as **calculated estimates**, not
Apple-published numbers — Apple publishes physical resolution and ppi, not CSS points. Verify
against real Safari device metrics (or Xcode Simulator once it ships a Duo profile) before
locking breakpoints to these numbers.

**Physical / display specs (confirmed):**

| | Outer display | Inner display (unfolded) |
|---|---|---|
| Size | 5.4" diagonal OLED | 7.6" diagonal OLED, folding |
| Resolution | 1398 × 2034 px | 1878 × 2670 px |
| Density | 460 ppi | 430 ppi |
| Both displays | Dynamic Island · Always-On · ProMotion (adaptive up to 120Hz) · HDR · True Tone · Wide color (P3) · 3000 nits peak (outdoor) |

**Estimated CSS viewport (logical) size**, assuming Apple's standard @3x device pixel ratio
for Pro-tier iPhone displays (unconfirmed — flag as an assumption in your Phase 1 plan):

| | Portrait (w × h) | Landscape (w × h) |
|---|---|---|
| Closed / outer display | ≈ 466 × 678 CSS px | ≈ 678 × 466 CSS px |
| Open / inner display | ≈ 626 × 890 CSS px | ≈ 890 × 626 CSS px |

**Physical dimensions:** open 164.6 × 117.8 × 5.2 mm; closed 84.1 × 117.8 × 11.3 mm; 254 g.
No Face ID — Touch ID is in the side button, which matters for any UI that assumes a
Face-ID-style notch/authentication flow.

**Responsive-design implications:**

- The outer (closed) display behaves like a small/compact-phone breakpoint (~375–428px class
  CSS-width neighborhood) — treat it inside the "Standard mobile" row of the Phase 4 matrix,
  not as its own tier, but test it explicitly since its aspect ratio differs from a standard
  iPhone.
- The inner (open) display lands closer to the "Tablet" tier (≈768px range) but narrower —
  don't assume tablet layouts apply unmodified; test it as its own row per Phase 4.
- Apple states the aspect ratio is consistent between inner and outer displays, so layouts
  that scale proportionally (fluid/`clamp()`-based) should transition more predictably across
  the fold than layouts pinned to fixed breakpoints.
- Both displays share Dynamic Island and safe-area requirements — apply the same
  `env(safe-area-inset-*)` handling from the bundled iOS performance standards reference to
  both states, plus the fold/hinge seam itself if the design uses `env(fold-*)`-style APIs
  once WebKit exposes them.
- iOS 27 introduces Split View multitasking and StandBy-style seated/standing poses for this
  device — if the site/app can be opened in a split-screen web view, treat that as an
  additional narrow-viewport case to test, similar to a resizable browser window rather than
  a fixed device width.
- Source: [apple.com/iphone-duo](https://www.apple.com/iphone-duo/) and
  [apple.com/iphone-duo/specs](https://www.apple.com/iphone-duo/specs/) — re-check before
  relying on these numbers in production, since Apple has not published a CSS-viewport figure
  directly.
