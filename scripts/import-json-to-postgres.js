#!/usr/bin/env node
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { getPrisma, disconnectPrisma } = require("../lib/prisma");
const { normalizeDatabase, cloneJson, countJsonRecords } = require("../lib/json-normalize");
const {
  persistFullDatabase,
  markPostgresImportValidated,
  markPostgresImportInvalid,
} = require("../lib/postgres-store");
const {
  validatePostgresAgainstJson,
  validateJsonSnapshots,
} = require("../lib/import-validation");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ACTIVE_JSON = path.join(DATA_DIR, "database.json");

async function main() {
  const prisma = getPrisma();
  const startedAt = new Date().toISOString();

  if (!fs.existsSync(ACTIVE_JSON)) {
    throw new Error(`Active JSON database was not found at ${ACTIVE_JSON}`);
  }

  await markPostgresImportInvalid(prisma, { status: "import_started", startedAt });

  const activeRawText = fs.readFileSync(ACTIVE_JSON, "utf8");
  const activeRaw = JSON.parse(activeRawText);
  const activeDb = normalizeDatabase(cloneJson(activeRaw));
  const activeSha = sha256(activeRawText);

  await storeJsonSnapshots(prisma);
  await persistFullDatabase(prisma, activeDb);

  const recordCounts = countJsonRecords(activeDb);
  await prisma.importBatch.upsert({
    where: { sha256: activeSha },
    create: {
      sourceFile: path.relative(ROOT, ACTIVE_JSON),
      sha256: activeSha,
      recordCounts,
      rawJson: activeRaw,
      notes: `Imported from active JSON database at ${startedAt}`,
    },
    update: {
      sourceFile: path.relative(ROOT, ACTIVE_JSON),
      recordCounts,
      rawJson: activeRaw,
      notes: `Re-imported from active JSON database at ${startedAt}`,
    },
  });

  const validation = await validatePostgresAgainstJson(prisma, ACTIVE_JSON);
  const snapshotValidation = await validateJsonSnapshots(prisma, DATA_DIR);
  const ok = validation.ok && snapshotValidation.ok;

  if (!ok) {
    await markPostgresImportInvalid(prisma, {
      status: "validation_failed",
      validation,
      snapshotValidation,
      failedAt: new Date().toISOString(),
    });
    console.error("PostgreSQL import validation failed.");
    console.error(JSON.stringify({ validation, snapshotValidation }, null, 2));
    process.exitCode = 1;
    return;
  }

  await markPostgresImportValidated(prisma, {
    status: "validated",
    sourceFile: path.relative(ROOT, ACTIVE_JSON),
    sha256: activeSha,
    recordCounts,
    usersMissingCredentials: validation.usersMissingCredentials,
    validatedAt: new Date().toISOString(),
  });

  console.log("PostgreSQL import completed and validated.");
  console.log(JSON.stringify({
    sourceFile: path.relative(ROOT, ACTIVE_JSON),
    sha256: activeSha,
    recordCounts,
    usersMissingCredentials: validation.usersMissingCredentials,
  }, null, 2));
}

async function storeJsonSnapshots(prisma) {
  const jsonFiles = fs.readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => path.join(DATA_DIR, file));

  for (const filePath of jsonFiles) {
    const rawText = fs.readFileSync(filePath, "utf8");
    const rawJson = JSON.parse(rawText);
    const sourcePath = path.relative(ROOT, filePath);
    await prisma.jsonBackupSnapshot.upsert({
      where: { sourcePath },
      create: {
        sourcePath,
        sha256: sha256(rawText),
        recordCounts: countJsonRecords(rawJson),
        rawJson,
      },
      update: {
        sha256: sha256(rawText),
        recordCounts: countJsonRecords(rawJson),
        rawJson,
      },
    });
  }
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

main()
  .catch(async (error) => {
    try {
      const prisma = getPrisma();
      await markPostgresImportInvalid(prisma, {
        status: "import_error",
        message: error.message,
        failedAt: new Date().toISOString(),
      });
    } catch {
      // The original error is more useful than a secondary marker failure.
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
