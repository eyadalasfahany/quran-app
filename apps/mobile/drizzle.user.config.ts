import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/core/db/user/schema.ts',
  out: './src/core/db/user/migrations',
});
