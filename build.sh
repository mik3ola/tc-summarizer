#!/bin/bash

# Build script for TermsDigest Chrome Extension
# Creates a zip file ready for Chrome Web Store submission

set -e  # Exit on error

EXTENSION_NAME="termsdigest"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.2.0")
BUILD_DIR="build"
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "🔨 Building ${EXTENSION_NAME} v${VERSION}..."

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
  echo "Cleaning previous build..."
  rm -rf "$BUILD_DIR"
fi

if [ -f "$ZIP_NAME" ]; then
  echo "Removing old zip file..."
  rm "$ZIP_NAME"
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy extension files
echo "Copying extension files..."
cp manifest.json "$BUILD_DIR/"
cp -r src "$BUILD_DIR/"

# Copy icons if they exist
if [ -d "icons" ]; then
  echo "Copying icons..."
  cp -r icons "$BUILD_DIR/"
else
  echo "⚠️  Warning: icons/ directory not found. Chrome Web Store requires icons."
  echo "   You'll need to create icons (16x16, 48x48, 128x128) before submission."
fi

# Copy privacy policy if it exists
if [ -f "PRIVACY_POLICY.md" ]; then
  cp PRIVACY_POLICY.md "$BUILD_DIR/"
fi

# Create zip file
echo "Creating zip file..."
cd "$BUILD_DIR"
zip -r "../${ZIP_NAME}" . -x "*.DS_Store" -x "__MACOSX" -x "*.git*"
cd ..

# Clean up build directory (optional - comment out if you want to keep it)
# rm -rf "$BUILD_DIR"

echo "✅ Build complete: ${ZIP_NAME}"
echo ""
echo "📦 Ready for Chrome Web Store submission!"
echo "   File size: $(du -h ${ZIP_NAME} | cut -f1)"
echo ""
echo "Next steps:"
echo "1. Review the zip file contents"
echo "2. Upload to Chrome Web Store Developer Dashboard"
echo "3. Fill in store listing details"
echo "4. Submit for review"
