import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/core/db/content/schema.ts',
  out: './src/core/db/content/migrations',
});
