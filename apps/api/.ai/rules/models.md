---
paths:
  - 'app/Domains/**/Models/**'
---

# Models

## Store enums as strings
Store categorical values in varchar columns sized so a new case does not need a migration. Cast the column to a backed PHP enum on the model.

## Cast datetimes as immutable
Cast datetime attributes with immutable_datetime so the model exposes CarbonImmutable.
