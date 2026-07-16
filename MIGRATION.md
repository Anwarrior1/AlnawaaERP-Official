# PostgreSQL Migration Commands

Run these commands on the VPS from the ERP project directory.

The current PostgreSQL database information is:

- Host: `localhost`
- Port: `5432`
- Database: `alnawaa_erp`
- User: `alnawaa_user`

Never commit or hardcode the database password.

## 1. Stop The Running ERP

Use the service manager/process manager currently running the app. Examples:

```bash
pm2 stop AlnawaaERP
```

or:

```bash
sudo systemctl stop alnawaa-erp
```

If the app is running manually, stop that terminal process.

## 2. Create A JSON Backup

```bash
BACKUP_DIR="backups/json-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR/data"
cp -p data/*.json "$BACKUP_DIR/data/"
sha256sum data/*.json "$BACKUP_DIR"/data/*.json
```

Keep this folder permanently.

## 3. Install Node Dependencies

```bash
npm install
```

## 4. Create The Real `.env`

Create `.env` from `.env.example`:

```bash
cp .env.example .env
nano .env
```

Put this inside `.env`, replacing `YOUR_PASSWORD` with the real PostgreSQL password:

```env
DATABASE_URL="postgresql://alnawaa_user:YOUR_PASSWORD@localhost:5432/alnawaa_erp?schema=public"
```

Do not commit `.env`.

## 5. Generate Prisma Client

```bash
npm run prisma:generate
```

## 6. Apply The PostgreSQL Schema

If this release includes `prisma/migrations/`, run:

```bash
npm run prisma:migrate
```

If no migration folder exists on the VPS, create and apply the schema from `schema.prisma`:

```bash
npx prisma db push
```

## 7. Import JSON Into PostgreSQL

```bash
npm run db:import
```

This command:

- reads `data/database.json`
- imports all active ERP records into PostgreSQL
- stores each `data/*.json` file as a raw PostgreSQL snapshot
- preserves all existing IDs
- validates row counts and relationships
- marks PostgreSQL active only if validation passes

## 8. Validate Again

```bash
npm run db:validate
npm run storage:health
```

`db:validate` must exit successfully.

`storage:health` must show:

```json
"postgresImportValidated": true
```

## 9. Start The ERP

```bash
npm start
```

The server should log:

```text
Storage: postgres
```

If validation has not passed, or PostgreSQL is unavailable, the server logs `Storage: json` and continues using the existing JSON storage.

## 10. Smoke Test

Open the ERP and verify:

1. Login works.
2. Dashboard loads.
3. Inventory, customers, suppliers, purchases, invoices, reports, accounting, users, settings load.
4. Backup export works.
5. Creating a small test record works only after you intentionally accept PostgreSQL as active storage.

## 11. Rollback

To roll back to JSON:

```bash
sudo systemctl stop alnawaa-erp
mv .env .env.disabled
npm start
```

Or with PM2:

```bash
pm2 stop AlnawaaERP
mv .env .env.disabled
npm start
```

The server will use `data/database.json` and log:

```text
Storage: json
```

Do not delete any PostgreSQL tables or JSON files until the owner explicitly approves cleanup.

## 12. Known Data Issue

The current JSON database contains one active user without `salt` and `passwordHash`.

That user is imported and preserved, but cannot log in until the password is reset or credentials are restored from a trusted backup.
