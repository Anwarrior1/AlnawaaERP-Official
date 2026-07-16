# Backup and Restore Guide

This ERP now supports PostgreSQL storage after a validated import, but the original JSON files remain a permanent backup and fallback path.

## Files That Must Never Be Deleted

Keep these files:

- `data/database.json`
- `data/database.backup-before-accounting-v2.json`
- `data/database.backup-before-branding.json`
- any timestamped folder under `backups/`

## Manual JSON Backup

Run this from the project directory:

```bash
BACKUP_DIR="backups/json-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR/data"
cp -p data/*.json "$BACKUP_DIR/data/"
sha256sum data/*.json "$BACKUP_DIR"/data/*.json
```

On macOS, use `shasum -a 256` instead of `sha256sum`.

## PostgreSQL Backup

Run this on the VPS:

```bash
BACKUP_DIR="backups/postgres-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
pg_dump --host=localhost --port=5432 --username=alnawaa_user --format=custom --file="$BACKUP_DIR/alnawaa_erp.dump" alnawaa_erp
```

The password is not stored in commands. PostgreSQL will prompt for it unless your server uses a secure `.pgpass` file or environment-managed secret.

## PostgreSQL Restore

Restore into an empty database or a database you intentionally prepared for restore:

```bash
pg_restore --host=localhost --port=5432 --username=alnawaa_user --dbname=alnawaa_erp --clean --if-exists backups/postgres-YYYYMMDD-HHMMSS/alnawaa_erp.dump
```

Then validate:

```bash
npm run db:validate
npm run storage:health
```

## JSON Fallback Restore

If PostgreSQL is not ready or validation fails, the server automatically uses JSON storage.

To force JSON storage:

```bash
mv .env .env.disabled
npm start
```

Or leave `.env` in place and mark PostgreSQL inactive:

```bash
npx prisma studio
```

Open the `MigrationState` table and set `postgres_import_validated.active` to `false`.

## Full Rollback To JSON

1. Stop the ERP service.
2. Move `.env` away or clear `DATABASE_URL`.
3. Confirm `data/database.json` still exists.
4. Start the server:

```bash
npm start
```

The server will log:

```text
Storage: json
```

Do not delete PostgreSQL data during rollback. Keep it for diagnosis until the owner approves cleanup.
