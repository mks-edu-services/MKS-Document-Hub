# MKS Document Hub

MKS Document Hub is a Replit-exported monorepo for a document management app built with Expo React Native, an Express API server, and shared API/database packages.

## What’s inside

- `artifacts/mks-app` — Expo app for mobile/web
- `artifacts/api-server` — Express backend API
- `lib/db` — Drizzle schema and database helpers
- `lib/api-spec` — OpenAPI source and codegen config
- `lib/api-zod` — generated Zod schemas
- `lib/api-client-react` — generated React client
- `scripts/` — workspace helper scripts

## Requirements

- Node.js 24+
- pnpm
- A PostgreSQL database for local or deployed API work

## Quick start

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run deploy:web
```

## Common commands

- `pnpm --filter @workspace/mks-app run dev` — start the Expo app in Replit
- `pnpm --filter @workspace/mks-app run export:web` — export the web build
- `pnpm --filter @workspace/mks-app run serve` — serve the exported web app
- `pnpm --filter @workspace/api-server run dev` — build and start the API server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod types
- `pnpm --filter @workspace/db run push` — apply database schema changes during development
- `pnpm run typecheck` — run TypeScript checks across the workspace
- `pnpm run build` — typecheck and build all workspace packages
- `pnpm run deploy:web` — build and deploy the hosted web app to Firebase Hosting

## Online deployment

The web app is designed to run from Firebase Hosting, but the API server still needs a separate hosted endpoint for Google Drive uploads.

- Frontend hosting target: `https://mksedudoc.web.app`
- API server base URL: set `EXPO_PUBLIC_API_BASE_URL` to the hosted API prefix, for example `https://api.example.com/api`
- If you keep the frontend and backend on the same origin, the app will still fall back to `/api`
- Recommended backend auth: a Google Drive service account, shared to the target Drive folder, using `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`
- The backend can be deployed from `Dockerfile.api-server` on any Node host
- To pin a specific backend host during Firebase web deploys, run `pnpm run deploy:web -- --api-base=https://your-api-host/api`
- The older Replit connector path still exists as a fallback, but it is no longer required

See `DEPLOYMENT.md` for the step-by-step flow and `ROADMAP.md` for the feature plan.
For a reusable cross-project summary, see `PROJECT_HANDOFF.md`.

## How the app works

- **Admin** — creates templates, manages users, and handles full configuration
- **Editor** — creates and updates document records, then uploads files to Drive
- **Viewer** — searches and reads records only
- **Flow** — sign in → land on dashboard → choose a template → enter document data → save to Firestore → upload the scanned file to Google Drive
- **Language** — Burmese is the default UI language, with an English toggle available across the main screens
- **Registry import** — the workbook at `assets/2025 အောင်လက်မှတ်ထုတ်ယူစာရင်း.xlsx` can be bulk-imported into Firestore with `pnpm run import:registry`
- **Registry table** — registry documents now render the full Excel-style column set, and blank cells stay visible so the headings always remain complete
- **Certificate preview** — clicking a registry row opens a certificate-style sheet with the scan thumbnail; clicking the thumbnail opens the full scan image
- **User accounts** — admins can create, edit, allow, deny, and role-manage user accounts with display name, username, email, phone number, and profile picture
- **Templates** — each template can define field types, placeholder text, and select options so the document form renders automatically from the template
- **Registry-style records** — templates can model Excel-like column sets, and document detail screens can link scan files by seat number/name search
- **Search / Tracking** — documents can be searched by service, year, status, school, agent, and date range, with live status summaries
- **Reports** — the document list can export a CSV report for the current filtered set
- **Navigation** — a top-left dashboard shortcut and a top-right language/menu area are available on every page, and the bottom tab bar stays hidden
- **Lists** — filtering and sorting renumber the visible list sequentially so the first filtered row is always serial No. 1
- **Drive Sync** — document saves now track pending/synced/failed states, retry uploads, and can target a dedicated Google Drive folder
- **Routing** — restricted screens redirect by role so users only see what they are allowed to use

## Environment variables

### Required for database work

- `DATABASE_URL` — PostgreSQL connection string

### Expo / Firebase

The app reads Firebase settings from Expo public env vars, and it also includes the current project’s public Firebase web config as safe defaults so the hosted app works even when those env vars are not set:

- `EXPO_PUBLIC_FIREBASE_API_KEY` or `GOOGLE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_API_BASE_URL` — optional backend API prefix for Drive uploads and generated API calls

### Replit runtime

Some scripts expect Replit-provided variables such as:

- `REPLIT_DEV_DOMAIN`
- `REPLIT_EXPO_DEV_DOMAIN`
- `REPL_ID`
- `REPLIT_INTERNAL_APP_DOMAIN`
- `BASE_PATH`

### Google Drive connector

The API server uses Google Drive integration when configured. Related env vars include:

- `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` — preferred inline service account JSON for the backend host
- `GOOGLE_APPLICATION_CREDENTIALS` — optional path to a service account JSON file on disk
- `GOOGLE_DRIVE_CONNECTION_ID` — optional Replit connector fallback
- `GOOGLE_DRIVE_FOLDER_ID` — optional Google Drive folder ID for placing uploaded documents in a dedicated folder
- `REPLIT_CONNECTORS_HOSTNAME` — optional Replit connector fallback
- `REPL_IDENTITY` — optional Replit connector fallback
- `WEB_REPL_RENEWAL` — optional Replit connector fallback

### Firebase deploy auth

For `pnpm run deploy:web`, set one of:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` — recommended for non-interactive deploys
- `FIREBASE_TOKEN` — fallback for Firebase CLI login sessions
- `GOOGLE_APPLICATION_CREDENTIALS` — path to a service account JSON file

## Notes

- This repo is structured as a workspace, so install dependencies from the repository root.
- `.gitignore` already excludes `node_modules`, `.expo`, `.env`, and common local Replit files.
- The `LICENSE` file uses the MIT license.

## License

MIT
