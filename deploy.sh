#!/usr/bin/env bash
set -e

echo "=== MKS Education Service — Firebase Hosting Deploy ==="
echo ""

# Step 1: Build Expo web app
echo "Step 1/3: Building web app for https://mksedudoc.web.app ..."
cd artifacts/mks-app
EXPO_PUBLIC_DOMAIN=mksedudoc.web.app pnpm exec expo export --platform web
cd ../..

echo ""
echo "Step 2/3: Build complete — $(ls artifacts/mks-app/dist | wc -l) files in dist/"
echo ""

# Step 3: Deploy to Firebase Hosting
echo "Step 3/3: Deploying to Firebase Hosting (mksedudoc)..."
pnpm exec firebase deploy --only hosting:mksedudoc

echo ""
echo "Done! Visit: https://mksedudoc.web.app"
