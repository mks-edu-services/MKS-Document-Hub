# MKS Document Hub — Reusable Handoff

Last updated: 2026-06-11

This document captures the current state of the project so it can be resumed in a new chat, a different IDE, or a fresh environment without losing the important context.

## 1) Project Goal

MKS Document Hub is a document-management app for MKS Education Service. It is designed to:

- manage academic records such as certificates, transcripts, notary translations, applications, and enrollment-related documents
- support web and mobile usage through Expo React Native Web
- keep structured registry data in Firestore
- attach scanned files from Google Drive and link them back to the record
- support Burmese-first UI with English as a toggle
- provide role-based access for Admin, Editor, and Viewer users

## 2) Current Stack

- Frontend: Expo React Native Web
- Routing: Expo Router
- Backend/API: Express-based API server in the workspace
- Auth: Firebase Authentication
- Database: Cloud Firestore
- File storage: Google Drive API
- Reports: `.xlsx` export with Excel-friendly Burmese text
- Deployment: Firebase Hosting for the web frontend

## 3) Key Repository Layout

- `artifacts/mks-app` — Expo app
- `artifacts/api-server` — API server used for Drive uploads and related endpoints
- `lib/db` — shared database helpers and schema
- `lib/api-spec` — API source / OpenAPI codegen inputs
- `lib/api-client-react` — generated client
- `scripts/` — workspace scripts for import, export, deploy, and helpers
- `assets/2025 အောင်လက်မှတ်ထုတ်ယူစာရင်း.xlsx` — registry workbook used for bulk import

## 4) Important User Flows

### 4.1 Authentication

- Firebase Auth email/password is enabled
- App boots into a role-aware flow
- Burmese is the default UI language
- Language switching happens from page-level controls in the top-right corner

### 4.2 Dashboard

- Shows a header, user identity, summary cards, quick-add, and recent records
- Top-left dashboard shortcut scrolls back to the top
- Bottom tab bar is intentionally hidden
- Recent records are displayed as cards with wrapping text so long Burmese names are not truncated

### 4.3 Documents / Search

- `/documents` is the advanced list page
- `/search` is the more search-focused page
- Search supports service type, status, sorting, school, agent, date range, and other tracking filters
- Filters renumber visible results sequentially after filtering or sorting
- The report button exports the current filtered set as `.xlsx`

### 4.4 Registry Records

Registry-style documents use the following core columns:

- `ခုံ`
- `အမှတ်`
- `ခုနှစ်`
- `အမည်`
- `အဖအမည်`
- `မြို့နယ်`
- `အပ်နှံသူ`
- `အပ်နှံ ရက်စွဲ`
- `ရရှိ ရက်စွဲ`
- `ပြန်ပို့ ရက်စွဲ`
- `ထုတ်ပေးသူ`
- `မှတ်ချက်`

Important behavior:

- blank cells must still show the column heading structure
- the edit screen must be cell-editable, not only a basic form
- certificate data should be viewable in a table-like layout
- the row preview should resemble a certificate form and show the related scan thumbnail
- clicking the scan thumbnail should open the full scan image

### 4.5 Users / Roles

- Admin can create, edit, allow, deny, and role-manage users
- User records store:
  - display name
  - username
  - email
  - phone number
  - profile picture
  - role
  - access status
- Viewer can search and view
- Editor can create/edit records but cannot manage templates or user accounts

## 5) Current Implementation Status

### UI / Branding

- Navy blue and teal branding is in place
- MKS logo is used in the app header
- The top-right corner contains the Burmese/English toggle and menu
- The bottom tab bar has been removed from the page layout
- Icons were previously rendered as square boxes on some Replit-exported builds; this was fixed by switching icon loading to a more reliable setup and, where necessary, using static icon fallbacks

### Documents / Registry

- Registry import from the Excel workbook has already been implemented
- Registry documents can be displayed and edited in a table-like manner
- The certificate-style preview is supported
- Full scan preview is supported from the thumbnail
- Registry rows can be searched by seat number / name / scan filename

### Reports

- Report export is now `.xlsx`, not CSV
- The workbook is built in a column order that matches the registry schema first, then general metadata, then dynamic fields
- Burmese text should remain readable in Excel because `.xlsx` is emitted as a workbook, not a raw CSV text file

### Drive Sync

- Drive sync tracks `pending`, `synced`, and `failed`
- Drive upload has a health-check path and retry support
- A dedicated Drive folder can be targeted when configured
- Live upload requires a hosted API endpoint and valid Google auth for the backend path

## 6) Files That Matter Most

- `artifacts/mks-app/app/_layout.tsx`
- `artifacts/mks-app/app/(tabs)/index.tsx`
- `artifacts/mks-app/app/(tabs)/documents.tsx`
- `artifacts/mks-app/app/(tabs)/search.tsx`
- `artifacts/mks-app/app/(tabs)/profile.tsx`
- `artifacts/mks-app/app/(tabs)/admin.tsx`
- `artifacts/mks-app/app/document/new.tsx`
- `artifacts/mks-app/app/document/[id].tsx`
- `artifacts/mks-app/app/template/new.tsx`
- `artifacts/mks-app/app/template/[id].tsx`
- `artifacts/mks-app/components/DocumentCard.tsx`
- `artifacts/mks-app/components/RegistryFieldsTable.tsx`
- `artifacts/mks-app/components/RegistryCertificatePreview.tsx`
- `artifacts/mks-app/components/LanguageToggle.tsx`
- `artifacts/mks-app/components/GlobalChrome.tsx`
- `artifacts/mks-app/components/MKSLogo.tsx`
- `artifacts/mks-app/lib/registry.ts`
- `artifacts/mks-app/lib/driveUpload.ts`
- `artifacts/mks-app/lib/firestore.ts`
- `artifacts/mks-app/lib/i18n.ts`
- `artifacts/api-server/src/routes/drive.ts`
- `artifacts/api-server/src/lib/googleDrive.ts`
- `scripts/import-registry.cjs`
- `scripts/deploy-web.cjs`
- `scripts/firebase-hosting-deploy.py`

## 7) Environment Variables

### Firebase / Expo

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_API_BASE_URL`

### Database

- `DATABASE_URL`

### Google Drive / API server

- `GOOGLE_DRIVE_CONNECTION_ID`
- `GOOGLE_DRIVE_FOLDER_ID`
- `REPLIT_CONNECTORS_HOSTNAME`
- `REPL_IDENTITY`
- `WEB_REPL_RENEWAL`

### Firebase deploy auth

One of these is needed for unattended web deploys:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `FIREBASE_TOKEN`
- `GOOGLE_APPLICATION_CREDENTIALS`

## 8) Useful Commands

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/mks-app run export:web
pnpm --filter @workspace/mks-app run dev
pnpm --filter @workspace/api-server run dev
pnpm run import:registry
pnpm run deploy:web
```

## 9) Deployment Notes

- The frontend is hosted on Firebase Hosting
- The live site currently uses `https://mksedudoc.web.app`
- Drive upload only works fully when the API server is reachable and configured with the correct base URL and Google permissions
- If the Firebase deploy helper times out while minting the token, rerun the deploy with a longer network window; the helper now retries token minting more aggressively

## 10) Recent Fixes Already Applied

- Burmese is the default language
- English toggle is page-wide and lives in the top-right corner
- Profile page no longer needs its own language selector
- Dashboard cards and quick-add areas were compacted to free up space
- Recent document titles wrap instead of truncating important Burmese text
- Documents page scroll/layout was adjusted so the list gets more room
- Advanced Search filter chips now wrap on wider screens and scroll on smaller screens
- Report export now generates `.xlsx`
- Registry views now show the full Excel-style column set, including blank cells
- Registry preview now supports the certificate-style scan thumbnail and full image modal

## 11) What To Do Next For Google Drive

The next Google Drive phase should focus on:

1. confirming the hosted API endpoint
2. making sure the API server can reach Google Drive using the configured auth path
3. verifying folder targeting
4. checking upload / retry / sync status end to end from the app
5. making sure the live UI surfaces any Drive failures clearly to the user

## 12) Reuse Notes For Another Project Or IDE

If this project is resumed elsewhere:

- start from the registry schema and the reusable Excel column order
- keep Burmese labels as the default
- preserve the top-right language toggle behavior
- keep the report export as `.xlsx`
- keep the registry preview flow:
  - row click → preview
  - thumbnail click → full scan image
- keep user management role boundaries strict
- keep Drive sync status visible in list and detail views

## 13) June 2026 Update — Google Drive Excel + Manual Link Flow

This update focused on making the Google Drive link workflow usable end to end, especially for records that already exist in Firestore and for bulk Excel-based maintenance.

### What was added

- A dedicated Google Drive Excel workflow page was added at `artifacts/mks-app/app/drive-tools.tsx`.
- The Documents and Admin screens now include a visible shortcut to the Drive Excel tools page.
- The edit/detail flow now shows a manual Google Drive link input so editors can paste a copied Drive URL directly and save it back to Firestore.
- The document edit screen now also shows the tracking block again, including:
  - `ဖန်တီးသည့်နေ့`
  - `နောက်ဆုံးပြင်သည့်နေ့`
  - `Google Drive ချိတ်ဆက်မှု`
  - `Drive အမှား`
  - `လက်ရှိအခြေအနေ`
- Registry records now show a clearer layout order:
  1. basic information
  2. registry information
  3. tracking
  4. Google Drive link
  5. template fields / notes

### Spreadsheet / Excel workflow

- A reusable workbook helper was added in `artifacts/mks-app/lib/driveExcel.ts`.
- The workbook template and import/export logic now use a column order aligned to the actual folder naming pattern:
  - `row_status`
  - `doc_type`
  - `academic_year`
  - `local_root_path`
  - `year_folder_name`
  - `month_folder_name`
  - `day_or_group_folder_name`
  - `local_file_name`
  - `local_full_path`
  - `seat_no`
  - `student_name`
  - `file_alias`
  - `drive_link`
  - `drive_file_id`
  - `drive_file_name`
  - `drive_folder_link`
  - `drive_folder_path`
  - `app_document_id`
  - `match_method`
  - `match_confidence`
  - `notes`
- The generated template is written to `outputs/drive-link-template/Google_Drive_File_Mapping_Template.xlsx`.
- Workspace scripts were added for:
  - `pnpm run drive:template`
  - `pnpm run drive:import`
- The import flow matches records by:
  1. `app_document_id`
  2. `seat_no + student_name + academic_year`

### Manual Drive link behavior

- When an editor pastes a Google Drive share link and saves a record, the app now stores:
  - `driveFileUrl`
  - `driveFileId`
  - `driveSyncStatus`
  - `driveSyncedAt`
  - `driveSyncError`
- Manual link entry is available both:
  - from the edit form (`artifacts/mks-app/app/document/new.tsx`)
  - from the detail page (`artifacts/mks-app/app/document/[id].tsx`)

### Published status

- The changes in this update were committed and pushed to GitHub on `main`.
- Commit: `a6c69ef` — `Add Google Drive Excel tools and link editing`
- Remote updated successfully on `origin/main`

### Notes

- The repo still contains some intentionally untracked local files such as logs, environment config folders, and generated outputs; those were not included in the GitHub push.
- If the UI still appears stale in the browser, a hard refresh or full app restart may be needed because old bundles can remain cached.

## 14) June 2026 Update — Google Drive Preview Recovery

This follow-up update focused on the case where a record already has a Google Drive share link, but the certificate preview box stays blank.

### What changed

- The document detail screen now derives preview URLs from any saved Drive value, not just the older `scanPreviewUrl` field.
- Preview fallback order now prefers:
  1. backend Drive proxy preview
  2. Google Drive thumbnail URL
  3. direct Drive view URL
- The registry preview card now retries with a fallback image source and shows a clear placeholder instead of an empty blank box.
- The Drive status banner no longer labels the same-origin API case as “Google Drive is not connected”; it now clearly says the backend API is unavailable when that is the real issue.

### Backend support added

- A new backend route was added to stream Drive previews:
  - `GET /api/drive/files/:fileId/preview`
- The route now uses a Google service account first and can still fall back to the older Replit connector path if needed.

### Validation

- `pnpm --filter @workspace/mks-app typecheck`
- `pnpm --filter @workspace/api-server typecheck`

### Expected result

- Records with a saved Drive file ID or share link should now show a visible preview whenever the backend proxy is available or the shared image is publicly reachable.
- If Drive access is still blocked, the UI should now show a fallback placeholder rather than a silent blank preview area.

## 15) June 2026 Update — Drive API Health Guardrail

This follow-up adjustment keeps the hosted web app from pretending the same-origin `/api` path is a real Drive backend when no explicit backend URL is configured.

### What changed

- `EXPO_PUBLIC_API_BASE_URL` is now treated as the real signal for Drive backend availability in the web app.
- The Drive status banner now short-circuits when no explicit backend URL is set, instead of fetching `/api/drive/health` from the Firebase Hosting site and receiving HTML.
- The document scan preview click target now falls back to opening the saved Drive link directly, so the user still has a working path to the file even when the preview proxy is unavailable.
- The scan section now shows explicit `Open Drive` and `Download` actions whenever a Drive link is saved, so users can still view or retrieve the file without needing inline image embedding.

## 16) June 2026 Update — Service Account Backend Path

This update removes the dependency on Replit connectors for the backend path when a normal Node host is available.

### What changed

- The Google Drive backend now prefers a Google service account JSON key or credentials file.
- Replit connector auth remains a fallback, not a requirement.
- The backend now supports inline preview streaming and upload using the same Drive API client, provided the service account can access the target folder.
- A deploy-ready `Dockerfile.api-server` was added so the backend can run on a standard Node container host.

### Deployment reminder

- Share the target Drive folder with the service account email.
- Set `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` on the backend host.
- Point the web build at the backend with `EXPO_PUBLIC_API_BASE_URL`.

### Result

- The UI no longer shows the confusing HTML-in-JSON health error on the Firebase-hosted frontend.
- Drive preview still works best when a real backend API host is deployed and wired through `EXPO_PUBLIC_API_BASE_URL`.
- Without that backend, the app now degrades gracefully to Drive-open/download actions instead of a broken preview box.
