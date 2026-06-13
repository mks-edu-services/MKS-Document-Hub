# Deployment Guide

This repo can be used online, but it needs two pieces:

1. a hosted frontend build
2. a reachable API server for Google Drive uploads and inline preview

## 1) Frontend hosting

The frontend is built from `artifacts/mks-app` and deployed to Firebase Hosting.

```bash
pnpm run deploy:web
```

To pin the web build to a specific backend host, pass:

```bash
pnpm run deploy:web -- --api-base=https://your-api-host/api
```

The deploy script expects one Firebase auth method:

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` — recommended for reliable non-interactive deploys
- `FIREBASE_TOKEN` — optional fallback for an existing Firebase CLI login
- `GOOGLE_APPLICATION_CREDENTIALS` — optional path to a service account JSON file

## 2) API server hosting

Deploy `artifacts/api-server` to any Node host you control, or build the provided `Dockerfile.api-server`, then set:

- `EXPO_PUBLIC_API_BASE_URL=https://your-api-host/api`

The web app uses this base URL for Drive upload requests, health checks, and inline preview.
The backend exposes:

- `GET /api/drive/health`
- `GET /api/drive/files/:fileId/preview`

### Recommended Drive auth

Use a Google Drive service account on the backend host:

- `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_DRIVE_FOLDER_ID` for the upload target

Share the target Drive folder with the service account email before testing uploads or previews.

The older Replit connector path still works as a fallback, but it is optional now.

## 3) Required environment values

### Firebase auth / Firestore

- `EXPO_PUBLIC_FIREBASE_API_KEY` (optional override; current public project defaults are embedded)
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` (optional override)
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` (optional override)
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional override)
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional override)
- `EXPO_PUBLIC_FIREBASE_APP_ID` (optional override)

### Database / backend

- `DATABASE_URL`
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_DRIVE_FOLDER_ID` (optional, recommended for a dedicated Drive folder)
- `GOOGLE_DRIVE_CONNECTION_ID` (optional fallback for Replit connector environments)
- `REPLIT_CONNECTORS_HOSTNAME` (optional fallback)
- `REPL_IDENTITY` (optional fallback)
- `WEB_REPL_RENEWAL` (optional fallback)

## 4) Quick sanity check

- Firebase Auth login works
- Firestore reads/writes work
- Document create/edit/delete works
- Google Drive upload returns a shareable URL
- Drive health endpoint reports whether the backend API URL and Drive auth are ready

## 5) Update order

When we make changes, keep the docs in sync in this order:

1. `ROADMAP.md`
2. `README.md`
3. `DEPLOYMENT.md`
4. `replit.md`
