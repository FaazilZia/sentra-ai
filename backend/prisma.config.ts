import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // CLI operations (migrations, etc.) require a direct connection bypass for the pooler.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
