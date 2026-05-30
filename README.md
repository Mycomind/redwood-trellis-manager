# Redwood Trellis Manager

A local-first trellis shop manager for quoting, product pricing, lumber tracking, job status, and backup/restore.

## Fast commands

npm install
npm run dev

npm run check

## Important docs

- docs/SHOP-SETUP-CHECKLIST.md
- docs/REAL-DATA-NEEDED.md
- docs/DEPLOYMENT.md

## Data safety

The app currently saves data in the browser. Use Settings to export backups after real shop work.

# Redwood Trellis Manager

Internal Next.js shop app for a small handcrafted redwood trellis business. It includes a trellis cost calculator, product database, lumber sourcing tracker, quote generator, job tracker, and dashboard.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase-ready schema
- Vercel-ready project structure

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks after installing dependencies:

```bash
npm run typecheck
npm run lint
npm run build
```

This workspace did not have `npm`/`npx` available when the project was created, so dependencies were declared manually in `package.json`.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. If you previously ran an older schema, rerun `supabase/schema.sql` so the `shop_settings` table exists.
4. Copy `.env.example` to `.env.local`.
5. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The current UI uses local seeded data so the shop workflow works immediately. The schema is ready for connecting persistence through `src/lib/supabase.ts`.

The included SQL policies allow the browser app to read and write with the Supabase anon key so the internal tool works without a login system. Keep the Vercel deployment private, use Vercel Deployment Protection, or replace these policies with authenticated-only rules before exposing it outside the business.

Without Supabase environment variables, the app saves edits to browser local storage. That is useful for testing and a single-computer shop workflow, but Supabase should be used for shared devices, backups, or Vercel deployment.

The header includes Export and Import controls for JSON backups. These are intended as a simple browser-local backup/restore path, especially before Supabase is configured.

## Modules

- Dashboard: active jobs, pending quotes, quoted value, expected profit, margin leaders, and current board-foot cost.
- Backup/Restore: export and import all products, lumber batches, quotes, jobs, and shop settings as JSON.
- Safety: delete confirmations, backup import validation, and empty states for fresh databases.
- Trellis Calculator: linear feet, board feet, waste, material, hardware, labor, build cost, wholesale, retail, profit, and margin.
- Shop Settings: save default board-foot cost, waste, hardware, labor rate, markup, and wholesale discount for calculator reuse. Settings persist locally and in Supabase when configured.
- Product Database: seeded 3/4" Open Grid and 1 1/8" Premium trellis products, editable pricing/labor/slat counts, active status, and add-product-from-calculator workflow.
- Lumber Tracker: landed cost and effective cost per usable board foot.
- Quote Generator: printable quote, copyable text-message quote, saved quote editing, delete, and make-job action.
- Job Tracker: editable customer, product, status, due date, balance owed, notes, save, and delete.

## Pricing Formula

Board feet are calculated as:

```text
thickness_inches * width_inches * length_feet / 12
```

Diagonal braces use the diagonal length of the trellis:

```text
sqrt(width_feet^2 + height_feet^2)
```

## Vercel

Deploy as a standard Next.js app. Add the same Supabase environment variables in Vercel Project Settings before enabling Supabase-backed persistence.

The included `vercel.json` marks the project as a Next.js app.
