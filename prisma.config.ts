import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolve } from "path";

// Prisma CLI does not load .env.local by default; match Next.js precedence (.env.local overrides .env)
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
