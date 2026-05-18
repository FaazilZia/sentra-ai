import 'dotenv/config';
import { defineConfig } from '@prisma/config';

// This configuration is used by the Prisma CLI for migrations and introspection.
// In production (Render), migrations MUST use the direct database connection (port 5432).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Priority: DIRECT_URL (direct connection) > DATABASE_URL (pooled connection)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
