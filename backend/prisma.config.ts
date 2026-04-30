import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Standard connection URL. 
    // Prisma CLI will use this for migrations.
    // If using Supabase, ensure this is the DIRECT_URL (port 5432) for migrations.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
