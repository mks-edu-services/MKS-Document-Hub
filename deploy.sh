#!/usr/bin/env bash
set -e

echo "=== MKS Education Service — Firebase Hosting Deploy ==="
echo ""

# Unset FIREBASE_TOKEN so it doesn't interfere with service account auth
unset FIREBASE_TOKEN

# Write service account JSON to temp file for Google auth
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
  echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /tmp/sa_credentials.json
  export GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa_credentials.json
  echo "Service account credentials loaded."
else
  echo "ERROR: GOOGLE_APPLICATION_CREDENTIALS_JSON secret not set."
  exit 1
fi

echo ""

# Step 1: Build Expo web app
echo "Step 1/2: Building web app for https://mksedudoc.web.app ..."
cd artifacts/mks-app
EXPO_PUBLIC_DOMAIN=mksedudoc.web.app pnpm exec expo export --platform web
cd ../..

echo ""
echo "Build complete — dist/ ready"
echo ""

# Step 2: Deploy to Firebase Hosting
echo "Step 2/2: Deploying to Firebase Hosting..."
pnpm exec firebase deploy --only hosting:mksedudoc --non-interactive

echo ""
echo "Done! Visit: https://mksedudoc.web.app"

# Cleanup
rm -f /tmp/sa_credentials.json
