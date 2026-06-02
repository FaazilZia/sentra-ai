import 'dotenv/config';
import { defineConfig } from '@prisma/config';

// This configuration is used by the Prisma CLI for migrations and introspection.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
