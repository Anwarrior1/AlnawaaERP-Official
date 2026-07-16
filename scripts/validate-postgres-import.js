#!/usr/bin/env node
require("dotenv").config();

const path = require("node:path");
const { getPrisma, disconnectPrisma } = require("../lib/prisma");
const {
  validatePostgresAgainstJson,
  validateJsonSnapshots,
} = require("../lib/import-validation");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ACTIVE_JSON = path.join(DATA_DIR, "database.json");

async function main() {
  const prisma = getPrisma();
  const validation = await validatePostgresAgainstJson(prisma, ACTIVE_JSON);
  const snapshotValidation = await validateJsonSnapshots(prisma, DATA_DIR);

  console.log(JSON.stringify({ validation, snapshotValidation }, null, 2));

  if (!validation.ok || !snapshotValidation.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
