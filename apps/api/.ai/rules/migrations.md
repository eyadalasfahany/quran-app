---
paths:
  - 'database/migrations/**'
---

# Migrations

## Store enums as strings
Store categorical values in varchar columns sized so a new case does not need a migration. Cast the column to a backed PHP enum on the model.

## Add foreign keys explicitly
Declare the column with the referenced key's integer type, then add foreign()->references('id')->on(...). Use cascadeOnDelete() when deleting the parent should delete the rows.
