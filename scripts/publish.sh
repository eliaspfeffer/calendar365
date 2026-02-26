#!/bin/bash

# Publishing script for calendar365
# This script helps publish to npm and update the Homebrew formula

set -e

VERSION=$(node -p "require('./package.json').version")
TARBALL_URL="https://registry.npmjs.org/calendar365/-/calendar365-${VERSION}.tgz"

echo "📅 calendar365 Publishing Script"
echo "================================="
echo ""
echo "Current version: $VERSION"
echo ""

# Check if logged into npm
if ! npm whoami &> /dev/null; then
    echo "❌ Not logged into npm. Please run: npm login"
    exit 1
fi

echo "Step 1: Building the project..."
npm run build

echo ""
echo "Step 2: Publishing to npm..."
npm publish --access public

echo ""
echo "Step 3: Calculating SHA256 for Homebrew formula..."
sleep 5  # Wait for npm to propagate
SHA256=$(curl -sL "$TARBALL_URL" | shasum -a 256 | cut -d ' ' -f 1)

echo ""
echo "✅ Published calendar365@$VERSION to npm!"
echo ""
echo "To update Homebrew formula, set:"
echo "  url: \"$TARBALL_URL\""
echo "  sha256: \"$SHA256\""
echo ""
echo "Update the formula at: Formula/calendar365.rb"
echo ""

# Optionally update the formula file
if [[ -f "Formula/calendar365.rb" ]]; then
    echo "Updating Formula/calendar365.rb..."
    sed -i.bak "s|url \".*\"|url \"$TARBALL_URL\"|g" Formula/calendar365.rb
    sed -i.bak "s|sha256 \".*\"|sha256 \"$SHA256\"|g" Formula/calendar365.rb
    rm Formula/calendar365.rb.bak
    echo "✅ Formula updated!"
fi

echo ""
echo "🎉 Done! Don't forget to:"
echo "   1. Push the updated formula to your homebrew-tap repo"
echo "   2. Create a GitHub release for v$VERSION"

