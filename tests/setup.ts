import { execFileSync } from "node:child_process";
import path from "node:path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database whose name contains 'test'.");
}

const database = new URL(testDatabaseUrl);
const databaseName = decodeURIComponent(database.pathname.slice(1));
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Refusing to run database tests: TEST_DATABASE_URL must use a dedicated database with 'test' in its name.");
}
process.env.DATABASE_URL = testDatabaseUrl;

execFileSync(
  process.execPath,
  [
    path.resolve("node_modules/prisma/build/index.js"),
    "db",
    "push",
    "--schema",
    path.resolve("prisma/schema.prisma"),
    "--skip-generate",
  ],
  {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  },
);
