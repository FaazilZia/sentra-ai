import "dotenv/config";
import { defineConfig } from "@prisma/config";

// This configuration is used by the Prisma CLI for migrations and introspection.
// In production (Render), ensure DIRECT_URL points to the direct DB host (port 5432).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
