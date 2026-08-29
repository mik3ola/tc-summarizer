#!/usr/bin/env bash
# Package TermsDigest for Safari (macOS + iOS).
# Run this on a Mac with Xcode installed after creating an Apple Developer account.
#
# Proposed identifiers:
#   App:       com.termsdigest.app
#   Extension: com.termsdigest.app.Extension
#
# Prerequisites:
#   - Xcode (App Store)
#   - Apple Developer Program membership
#   - Signed into Xcode with that Apple ID (Settings → Accounts)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/dist/safari"
APP_NAME="TermsDigest"
BUNDLE_ID="com.termsdigest.app"

mkdir -p "${OUT_DIR}"

# Stage a clean extension folder for the packager (manifest at root).
STAGE="${OUT_DIR}/extension"
rm -rf "${STAGE}"
mkdir -p "${STAGE}/src" "${STAGE}/icons"
cp "${ROOT}/manifest.json" "${STAGE}/"
cp "${ROOT}/src/"*.js "${ROOT}/src/"*.html "${STAGE}/src/"
cp "${ROOT}/icons/"*.png "${STAGE}/icons/"

echo "Staged extension at: ${STAGE}"
echo "Running Safari Web Extension packager (macOS + iOS)…"

xcrun safari-web-extension-packager "${STAGE}" \
  --app-name "${APP_NAME}" \
  --bundle-identifier "${BUNDLE_ID}" \
  --project-location "${OUT_DIR}/xcode" \
  --swift \
  --force \
  --no-prompt

echo ""
echo "Done. Next steps:"
echo "  1. Open the Xcode project under ${OUT_DIR}/xcode"
echo "  2. Select your Team for signing (app + extension targets)"
echo "  3. Build & run on Mac, then enable the extension in Safari → Settings → Extensions"
echo "  4. Grant website access when prompted (or Always Allow for all websites)"
echo "  5. For iOS: run the iOS target on a device/simulator and enable the extension in Safari settings"
echo "  6. Archive → Distribute to App Store Connect when ready"
