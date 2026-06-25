# New Chat Reference — MKS Document Hub

This file is a short handoff for the next chat.

## What has already been completed

- The app’s Drive helper layer is wired to the deployed Google Apps Script backend by default.
- The Google Apps Script backend is live and responding successfully.
- The Google Sheet mapping source is in place and currently contains the main `MAP-001` row for the G12 certificate root folder.
- The latest successful web deploy is live on Firebase Hosting.
- The overall project handoff has also been updated in `PROJECT_HANDOFF.md`.

## Current Drive backend values

- Apps Script web app URL:
  - `https://script.google.com/macros/s/AKfycbwSfyGSFqNTgoK38cpZtrrxEz18qH8IEz5GGiaaRyrcSpbCA1boZ_Iy4ZNgJo5L8VP_/exec`
- Google Sheet ID:
  - `1i3YzFeytCR83T8usyFaYuFqQGO-6QfEU5gx27z5DXAQ`
- Sheet tab name:
  - `Drive_Folder_Mapping`

## Current root mapping row

- `Mapping ID`: `MAP-001`
- `Service Type`: `G12 အောင်လက်မှတ်`
- `Template Name`: `G12 အောင်လက်မှတ်စာရင်း`
- `Folder Name`: `အောင်လက်မှတ် စုစုပေါင်း`
- `Folder ID`: `1SrGyRm3p0htQVT-Sz5pikjJVOorBR-1k`
- `Parent Folder ID`: blank
- `Drive Path`: `/အောင်လက်မှတ် စုစုပေါင်း`
- `Status`: `Active`

## Important note for the next chat

- Do **not** start the Excel upload to create template flow yet.
- That work should only begin when the user explicitly says: **“Excel upload to Create Template”**.
- If the user wants a small follow-up first, the next safe task is to polish the `Profile` page and `Dashboard` avatar style for mobile so the picture feels a little larger and cleaner.

## Suggested opening for the next chat

- “NEW_CHAT_REFERENCE.md ကို reference လုပ်ပြီး `Create Template / Excel upload flow` ကိုပဲ ဆက်လုပ်ပါ။ အရင်ဆုံး `Profile` page နဲ့ `Dashboard` avatar style ကို mobile မှာ နည်းနည်းပိုကြီး/ပိုကောင်းအောင် ချောပေးနိုင်ရင် အဲဒါလည်းထည့်ပေးပါ။”

## Latest verified deploy

- Firebase Hosting release:
  - `sites/mksedudoc/releases/1782416454871000`
- Live site:
  - `https://mksedudoc.web.app`

## Useful code locations

- `artifacts/mks-app/lib/apiBase.ts`
- `artifacts/mks-app/lib/driveUpload.ts`
- `scripts/deploy-web.cjs`
- `.env.example`
- `DEPLOYMENT.md`
- `replit.md`
- `PROJECT_HANDOFF.md`

## Reminder

- `EXPO_PUBLIC_API_BASE_URL` is for the general backend API.
- `EXPO_PUBLIC_DRIVE_API_BASE_URL` is for Drive helper / preview / mapping work.
- The Drive helper flow already defaults to the Apps Script URL above.
