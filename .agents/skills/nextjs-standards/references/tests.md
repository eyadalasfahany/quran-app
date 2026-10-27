# Tests

> Company rule for testing. Stack is mandatory.

## REQUIRED

- **Vitest + Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`, jsdom).
- **Must test:** `lib/` and `utils/` logic, data transforms, schema builders, data normalization/parsing, and non-trivial hooks.
- **Yup validation schemas must be extracted to `lib/` and tested — even if they start as inline constants.** A schema defined inside a component is untestable; move it to `src/lib/<feature>Schema.ts` and write at minimum: required-field rejection, format/length validation, and a passing case.
- **Test behavior, not implementation.** Query by role/text; assert outcomes.
- **Co-locate in `__tests__/`** mirroring the source structure.
- Run with `npm run test`; logic ships with its test.

## Canonical examples

```ts
// __tests__/lib/buildDynamicFormSchema.test.ts — logic MUST be tested
import { describe, it, expect } from "vitest";
import { buildDynamicFormSchema } from "@/src/lib/buildDynamicFormSchema";

describe("buildDynamicFormSchema", () => {
  it("requires fields marked required", async () => {
    const schema = buildDynamicFormSchema([{ input_name: "email", type: "email", required: true }]);
    await expect(schema.validate({ email: "" })).rejects.toThrow();
    await expect(schema.validate({ email: "a@b.com" })).resolves.toBeTruthy();
  });
});
```

```tsx
// __tests__/components/common/Button.test.tsx — behavior, query by role
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/src/components/common/Button";

it("fires onClick", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Go</Button>);
  await userEvent.click(screen.getByRole("button", { name: "Go" }));
  expect(onClick).toHaveBeenCalledOnce();
});
```

## Skip (don't bother)

- Pure presentational components with no logic.
- Trivial passthrough props.

## FORBIDDEN

- Shipping new transform/parsing/schema logic with no test.
- Defining a Yup schema inline inside a component — extract it to `lib/` where it can be tested.
- Snapshot-only tests that assert nothing meaningful.
- Testing third-party library internals.
- Querying by test-id when a role/label exists.

## Checklist

- [ ] New lib/util/transform/schema logic has a test.
- [ ] Tests query by role/text and assert behavior.
- [ ] Tests co-located in `__tests__/`.
- [ ] `npm run test` passes.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "It's obvious, no test needed" | Transforms/parsers break silently. A 30s test guards them. |
| "I'll add tests later" | Logic ships with its test, or it doesn't ship. |
| "The schema is in the component, not lib/" | That's the bug. Extract it to `lib/` and test it. |
| "It's a simple Yup schema, tests are overkill" | Yup schemas always need tests — required/format/min. 5 lines. |
| "I'll snapshot it" | Snapshots assert nothing. Test the behavior/output. |
