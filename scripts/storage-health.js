#!/usr/bin/env node
require("dotenv").config();

const { getPrisma, disconnectPrisma } = require("../lib/prisma");
const { MIGRATION_READY_KEY } = require("../lib/postgres-store");
const { postgresCounts } = require("../lib/import-validation");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not set. The ERP will use JSON storage.");
    return;
  }

  const prisma = getPrisma();
  const state = await prisma.migrationState.findUnique({ where: { key: MIGRATION_READY_KEY } });
  const counts = await postgresCounts(prisma);
  console.log(JSON.stringify({
    databaseUrlConfigured: true,
    postgresImportValidated: Boolean(state?.active),
    migrationState: state || null,
    counts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
