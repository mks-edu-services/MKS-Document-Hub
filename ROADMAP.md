# Roadmap

This is the living feature-by-feature plan for MKS Document Hub. I will update this file as each slice lands.

## Phase 1 — Online readiness

Status: complete

- Add explicit API base URL support for hosted deployments
- Document the Firebase Hosting + backend deployment flow
- Keep the app usable when the API lives on a different origin
- Make the Expo and API server scripts work on Windows and Replit

## Phase 2 — RBAC hardening

Status: in progress

- Recheck role gates on every create/edit/delete path
- Make admin-only actions obvious in the UI
- Ensure viewers only get search/read access
- Add route-level guards so unauthorized users redirect cleanly
- Keep the Burmese/English switch visible across the main tab screens
- Add user account create/edit/allow/deny flows with display name, username, email, phone number, profile picture, and role

## Phase 3 — Template workflow polish

Status: complete

- Improve template creation guidance
- Make dynamic fields easier to understand on form screens
- Keep template and document data models aligned
- Support placeholder text and select options in templates

## Phase 4 — Search and tracking

Status: complete

- Keep multi-filter search fast and consistent
- Highlight the most useful document metadata
- Make document status changes easy to follow
- Support date-range filtering and live tracking summaries

## Phase 5 — Google Drive reliability

Status: complete

- Make upload errors easier to understand
- Keep drive links synced back into Firestore
- Add clear fallback states when Drive is not configured
- Support retryable uploads, folder targets, and sync status tracking

## Phase 6 — Localization and registry flow

Status: in progress

- Make Burmese the default UI language with an English toggle
- Keep registry-style records flexible enough to match different Excel column layouts
- Show scan previews and link scans by seat number / student name search
- Keep report export, empty states, and branding readable across languages
- Bulk-import the 2025 certificate registry workbook into Firestore with stable scan search keys
- Use a web-safe icon fallback so missing font glyphs do not render as squares

## Progress log

- Current repo already includes the core Expo, Firebase Auth, Firestore, and Drive upload architecture.
- Completed the online-ready API base URL flow.
- Added route-level role guards for editor/admin screens.
- Completed the template workflow polish slice with field guidance and select options.
- Completed the search and tracking slice with date filters, live summaries, and activity ordering.
- Completed the Google Drive reliability slice with retryable uploads, folder targets, and sync state tracking.
- Added the bilingual UI foundation, localized key screens, and scan-link search support.
- Added the registry import script and bulk-loaded the 2025 certificate workbook into Firestore.
- Added a web-safe icon fallback and a more visible language switch on the main tab screens.
- Added user account management screens and admin controls for allow/deny and role updates.
- Verified `@workspace/mks-app` and `@workspace/api-server` typecheck cleanly.
- Verified the web export path builds successfully for the hosted frontend.
