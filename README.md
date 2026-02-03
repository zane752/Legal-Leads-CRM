# Legal Leads CRM (Cloudflare Stack)

Monorepo for a two-pipeline CRM:
- Pipeline 1: COIs
- Pipeline 2: Clients (referred by COIs)

Stack:
- Frontend: React + Vite (`frontend/`)
- API: Cloudflare Worker TypeScript (`worker/`)
- Database: Cloudflare D1 (`worker/migrations`)
- Shared contracts: `shared/`

## Project structure
- `frontend/src/App.tsx` two Kanban pipelines + create forms
- `worker/src/index.ts` CRUD + stage transitions + referrals + summary API
- `worker/migrations/0001_init.sql` D1 schema
- `shared/src/types.ts` stage enums and DTO types

## Setup
1. Install dependencies
   - `npm install`
2. Create D1 database
   - `npx wrangler d1 create legal_leads_crm`
3. Copy the returned `database_id` into `worker/wrangler.toml`
4. Apply migrations locally
   - `npx wrangler d1 migrations apply legal_leads_crm --local`
5. Start API worker
   - `npm run dev:worker`
6. Start frontend
   - `npm run dev:frontend`

## Cloudflare Pages + Worker wiring
- In Pages, set project root to `frontend`.
- Add environment variable in Pages (Production and Preview):
  - `VITE_API_BASE_URL=https://crm.<your-subdomain>.workers.dev`
- Redeploy Pages after adding the variable.
- Without this, `/api/*` on Pages can return `405` because Pages is not your API worker.

## Available APIs
- `GET /api/health`
- `GET /api/stages`
- `GET /api/reports/summary`
- `GET /api/reports/dashboard?month=YYYY-MM`
- `GET/POST /api/cois`
- `PATCH /api/cois/:id`
- `POST /api/cois/:id/stage`
- `GET/POST /api/clients`
- `PATCH /api/clients/:id`
- `POST /api/clients/:id/stage`
- `GET /api/referrals`
- `GET/POST /api/cois/:id/emails`
- `GET/POST /api/clients/:id/emails`

## Rules implemented
- Clients must be created with a `coiId` referral source.
- Stage changes are adjacent forward moves; backward moves require a reason.
- For clients at `DOC_PROPOSAL` or later, `expectedCloseDate` is required.
- Email activity updates `last_contact_at`.
