import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations precisam de conexão direta (sem pooler); a Vercel/Neon expõe em DATABASE_URL_UNPOOLED.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
