#!/usr/bin/env bash
set -e

echo "=== MKS Education Service — Firebase Hosting Deploy ==="
echo ""

# Step 1: Build Expo web app
echo "Step 1/2: Building web app for https://mksedudoc.web.app ..."
cd artifacts/mks-app
EXPO_PUBLIC_DOMAIN=mksedudoc.web.app pnpm exec expo export --platform web
cd ../..

echo ""
echo "Build complete — dist/ ready"
echo ""

# Step 2: Deploy using FIREBASE_TOKEN (no interactive login needed)
echo "Step 2/2: Deploying to Firebase Hosting..."
pnpm exec firebase deploy --only hosting:mksedudoc --token "$FIREBASE_TOKEN" --non-interactive

echo ""
echo "Done! Visit: https://mksedudoc.web.app"
