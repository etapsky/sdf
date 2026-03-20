import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    '../../packages/sdf-server-core/src/db/schema.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5432/sdf',
  },
})
