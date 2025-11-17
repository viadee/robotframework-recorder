#!/usr/bin/env bash
set -euo pipefail

# package/export.command
# Create a Chrome Web Store ZIP containing only the extension runtime files.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Read version from manifest.json
if ! VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -n 1); then
  echo "Failed to read version from manifest.json" >&2
  exit 1
fi

DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$(mktemp -d "$ROOT_DIR/.staging-pack-XXXX")"

echo "Packaging RobotFramework Recorder v$VERSION"
echo "Staging to: $STAGING_DIR"

# Files / folders to include (relative to repo root)
INCLUDE=(
  "manifest.json"
  "src"
  "assets"
  "vendors"
  "robotframework-recorder-assets"
  "static"
  "script"
  "README.md"
  "LICENSE"
  "CHANGELOG.md"
)

# Exclude patterns for rsync/zip
EXCLUDE=(
  ".git"
  "node_modules"
  "test"
  ".github"
  "dist"
  ".DS_Store"
  ".husky"
  "*.log"
  "*.zip"
)

echo "Copying files..."

if command -v rsync >/dev/null 2>&1; then
  RSYNC_EXCLUDES=()
  for e in "${EXCLUDE[@]}"; do
    RSYNC_EXCLUDES+=(--exclude="$e")
  done
  for i in "${INCLUDE[@]}"; do
    if [ -e "$i" ]; then
      rsync -a "${RSYNC_EXCLUDES[@]}" "$i" "$STAGING_DIR/"
    fi
  done
else
  # fallback to cp
  for i in "${INCLUDE[@]}"; do
    if [ -e "$i" ]; then
      if [ -d "$i" ]; then
        mkdir -p "$STAGING_DIR/$i"
        cp -a "$i/" "$STAGING_DIR/$i/"
      else
        cp -a "$i" "$STAGING_DIR/"
      fi
    fi
  done
  # attempt to remove excludes
  for e in "${EXCLUDE[@]}"; do
    rm -rf "$STAGING_DIR/$e" || true
  done
fi

mkdir -p "$DIST_DIR"

ZIP_NAME="robocorp-recorder-v${VERSION}.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "Creating ZIP: $ZIP_PATH"
(cd "$STAGING_DIR" && zip -r -q "$ZIP_PATH" .)

ln -f "$ZIP_PATH" "$DIST_DIR/latest.zip" 2>/dev/null || cp -f "$ZIP_PATH" "$DIST_DIR/latest.zip"

echo "ZIP created: $(du -h "$ZIP_PATH" | cut -f1)"
echo "Contents (top 40):"
unzip -l "$ZIP_PATH" | sed -n '1,40p'

if [ "$1" != "--keep-staging" ] 2>/dev/null; then
  rm -rf "$STAGING_DIR"
  echo "Removed staging dir"
else
  echo "Kept staging dir: $STAGING_DIR"
fi

echo "Done. Upload $ZIP_PATH to Chrome Web Store Developer Dashboard."

exit 0
