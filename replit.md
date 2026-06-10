# MKS Document Hub — Working Notes

This workspace powers the MKS Education Service document manager: Firebase Auth + Firestore for data, Expo React Native for UI, and Google Drive uploads for saved records.

## Current focus

- Online-ready deployment flow
- Google Drive reliability and folder routing
- Feature-by-feature roadmap execution
- Burmese-default bilingual UI and registry-style record support
- Registry workbook bulk import and Seat No / Name scan matching
- Registry detail/edit screens show the full Excel column set in a table layout, even when some cells are blank
- Registry detail pages now use a certificate-style preview with a clickable scan thumbnail that opens the full scan image
- Admin user account management with allow/deny and profile fields
- Web-safe icon fallback for the hosted UI
- Keeping markdown notes in sync after each iteration

## Run & Operate

- `pnpm --filter @workspace/mks-app run dev` — run the Expo app locally/Replit
- `pnpm --filter @workspace/mks-app run export:web` — export the web build
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run deploy:web` — build + deploy the Firebase-hosted web app
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes in dev only

## Deployment notes

- Frontend hosting target: Firebase Hosting (`mksedudoc`)
- Drive upload API: must be reachable at `EXPO_PUBLIC_API_BASE_URL`
- If no explicit API base URL is set, the app falls back to same-origin `/api`
- `pnpm run deploy:web` expects a Firebase auth method; `GOOGLE_APPLICATION_CREDENTIALS_JSON` is still the recommended non-interactive option, and the app now carries safe public Firebase web defaults so deploys do not depend on manual Expo env setup

## Project map

- `artifacts/mks-app/app` — screens and navigation
- `artifacts/mks-app/components/RoleRouteGate.tsx` — role-based route redirects
- `artifacts/mks-app/app/template/new.tsx` — template creation with field options and guidance
- `artifacts/mks-app/app/document/new.tsx` — document form rendering from selected templates
- `artifacts/mks-app/app/(tabs)/search.tsx` — advanced search with filters and tracking summaries
- `artifacts/mks-app/app/(tabs)/documents.tsx` — document list with tracking strip and active filters
- `artifacts/mks-app/app/document/[id].tsx` — document tracking and Drive sync details
- `artifacts/mks-app/components/GlobalChrome.tsx` — top-left dashboard shortcut, top-right language toggle, and menu
- `artifacts/mks-app/components/DocumentCard.tsx` — serial badge and registry-style card display
- `artifacts/mks-app/context/LanguageContext.tsx` — bilingual UI state and default language handling
- `artifacts/mks-app/components/AppIcons.tsx` — web-safe icon wrapper with emoji fallbacks
- `artifacts/mks-app/app/user/[uid].tsx` — user account create/edit screen
- `scripts/import-registry.cjs` — bulk import for the 2025 registry workbook
- `artifacts/mks-app/context/AuthContext.tsx` — login state and user bootstrap
- `artifacts/mks-app/lib/firestore.ts` — Firestore CRUD and realtime subscriptions
- `artifacts/mks-app/lib/driveUpload.ts` — API bridge for Google Drive uploads
- `artifacts/api-server/src/lib/googleDrive.ts` — Google Drive folder target, retries, and share links
- `artifacts/api-server/src` — backend route handlers and Drive integration
- `lib/api-spec/openapi.yaml` — API contract source

## Process

1. Update the roadmap in `ROADMAP.md`.
2. Implement the next feature slice.
3. Update README / deployment notes if the flow changes.
4. Verify with typecheck/build.
5. Keep the route guards and role assumptions documented as they evolve.

## Gotchas

- `DATABASE_URL` is required for database work.
- Firebase public env vars must be present before auth and Firestore work.
- Google Drive upload needs both API server deployment and connector credentials.
- Filtered and sorted lists renumber sequentially so the visible first record is always serial No. 1.
- The workspace root check still includes `artifacts/mockup-sandbox`; for product work, `@workspace/mks-app` and `@workspace/api-server` are the ship-ready packages.

## Pointers

- See `README.md` for setup and deployment.
- See `DEPLOYMENT.md` for the online release path.
- See `ROADMAP.md` for the feature-by-feature plan.
