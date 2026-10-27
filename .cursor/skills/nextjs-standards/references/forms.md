# Forms

> Company rule for building forms. Stack is mandatory. Submitting → through a `services/` function ([api-integrations.md](api-integrations.md)). Labels/errors → translated ([translation-files.md](translation-files.md)).

## REQUIRED

- **Formik + Yup for every form.** Yup schema for validation, Formik for state/submit.
- **Reuse the shared field components** in `components/common/form/` (`InputField`, `SelectField`, `TextareaField`, `RadioField`, …). Each one **wraps Formik's `<Field />` component** (render-prop pattern) and handles label, error display, and a11y (`aria-invalid`, `aria-describedby`, `role="alert"`). Create the field component there if it's missing — don't inline a raw `<input>` or wire Formik state manually.
- **Form components are client leaves** (`'use client'`) — they use state/handlers.
- **Submit through a `services/` function**, not inline axios.
- **All labels/placeholders/validation messages via next-intl.**

## Canonical example

### Shared field component shape (for authoring new ones)

Every shared field in `components/common/form/` wraps Formik's `<Field />` with a render prop. The component's props interface lives in a sibling `types.ts` file ([types-interfaces.md](types-interfaces.md)). Never use raw `<input />`, `<textarea />`, or `<select />` inside a form — only the shared components.

```ts
// components/common/form/types.ts — props interface lives here, not in the component file
import type { FieldProps } from "formik";

export interface InputFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}
```

```tsx
// components/common/form/InputField.tsx
"use client";
import { Field } from "formik";
import type { FieldProps } from "formik";
import type { InputFieldProps } from "./types";

export function InputField({ name, label, type = "text", ...rest }: InputFieldProps) {
  return (
    <Field name={name}>
      {({ field, meta }: FieldProps) => (
        <div>
          {label && <label htmlFor={name}>{label}</label>}
          {/* render the actual element here — never expose raw <input> outside this file */}
          <input
            id={name}
            type={type}
            {...field}
            {...rest}
            aria-invalid={meta.touched && !!meta.error}
            aria-describedby={meta.touched && meta.error ? `${name}-error` : undefined}
          />
          {meta.touched && meta.error && (
            <span id={`${name}-error`} role="alert">{meta.error}</span>
          )}
        </div>
      )}
    </Field>
  );
}
```

### Form — uses shared components only, Yup schema in `lib/`

```tsx
// components/ContactUs/ContactForm.tsx
"use client";
import { Formik, Form } from "formik";
import { useTranslations } from "next-intl";
import { InputField } from "@/src/components/common/form/InputField";
import { buildContactFormSchema } from "@/src/lib/contactFormSchema"; // schema in lib/, not inline
import { submitContact } from "@/src/services/contact";

export default function ContactForm() {
  const t = useTranslations("contact");

  return (
    <Formik
      initialValues={{ name: "", email: "" }}
      validationSchema={buildContactFormSchema(t)}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        try {
          await submitContact(values);   // service, not inline axios
          resetForm();
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <InputField name="name" label={t("form.nameLabel")} required />
          <InputField name="email" type="email" label={t("form.emailLabel")} required />
          <button type="submit" disabled={isSubmitting}>{t("form.submit")}</button>
        </Form>
      )}
    </Formik>
  );
}
```

## Backend-defined (CMS / dynamic) forms

When fields come from the API, **build the Yup schema dynamically** from the field definitions (a `lib/buildDynamicFormSchema` helper) and render the shared field components by field type. Don't hand-write a static form per CMS form.

```ts
// lib/buildDynamicFormSchema.ts — shape
import * as Yup from "yup";
import type { CmsField } from "@/src/types/forms";

export function buildDynamicFormSchema(fields: CmsField[]) {
  const shape: Record<string, Yup.AnySchema> = {};
  for (const f of fields) {
    let rule: Yup.AnySchema = Yup.string();
    if (f.type === "email") rule = Yup.string().email();
    if (f.required) rule = rule.required();
    shape[f.input_name] = rule;
  }
  return Yup.object(shape);
}
```

## FORBIDDEN

- Raw `<input />`, `<textarea />`, or `<select />` directly in a form file — use shared field components from `components/common/form/` only.
- Raw `<form>` + `useState` hand-rolled validation.
- `react-hook-form` or other form libraries.
- Defining the props interface inside the component file — put it in `components/common/form/types.ts` ([types-interfaces.md](types-interfaces.md)).
- Using `useField` hook in shared field components — use `<Field />` with a render prop instead.
- Wiring `onChange`/`onBlur`/`value` manually instead of spreading `{...field}` from `<Field />`.
- Re-implementing a field component that already exists in `common/form/`.
- Inline axios in `onSubmit` (go through `services/`).
- Hardcoded labels / error strings.

## Checklist

- [ ] Formik + Yup used; schema defined.
- [ ] Shared `common/form/` field components reused.
- [ ] Submit calls a `services/` function.
- [ ] All text via next-intl.
- [ ] Dynamic/CMS forms use the schema-builder pattern.

## Don't rationalize

| Excuse | Reality |
|--------|---------|
| "It's a one-field form" | Still Formik + Yup + shared field. Consistency > shortcut. |
| "`useField` does the same thing" | Use `<Field />` render prop — it's Formik's canonical component. `useField` is for advanced cases only. |
| "I'll wire onChange manually, simpler" | Spread `{...field}` from `<Field />`'s render prop. Manual wiring misses Formik's blur/touched tracking. |
| "react-hook-form is faster" | Company stack is Formik + Yup. Not negotiable. |
| "I'll axios the submit inline" | Submit goes through `services/` like every other call. |
| "CMS form is special, I'll hardcode it" | Build the schema dynamically from field defs. |
