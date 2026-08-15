#!/usr/bin/env bash
# Keeps only the current build's hashed assets (dist/_astro) plus the
# immediately-previous build's, deleting anything older. "Previous build" is
# tracked via a manifest object in S3 rather than inferred from bucket
# contents, since deploys can be weeks apart and bucket contents alone can't
# tell "1 build ago" from "N builds ago". This lets a browser holding stale
# HTML (open tab, back-button, bfcache) still resolve the old asset hashes
# that HTML references, without keeping every asset ever deployed forever.
set -euo pipefail

BUCKET="$1"
DIST_ASTRO_DIR="$2"
MANIFEST_KEY="_meta/last-build-assets.txt"

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

find "$DIST_ASTRO_DIR" -type f -printf '_astro/%P\n' | sort -u > "$WORKDIR/current.txt"

if ! aws s3 cp "s3://$BUCKET/$MANIFEST_KEY" "$WORKDIR/previous.txt" >/dev/null 2>&1; then
  : > "$WORKDIR/previous.txt"
fi
sort -u -o "$WORKDIR/previous.txt" "$WORKDIR/previous.txt"

cat "$WORKDIR/current.txt" "$WORKDIR/previous.txt" | sort -u > "$WORKDIR/keep.txt"

aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "_astro/" \
  --query 'Contents[].Key' --output text \
  | tr '\t' '\n' | { grep -v '^None$' || true; } | sort -u > "$WORKDIR/in-bucket.txt"

comm -23 "$WORKDIR/in-bucket.txt" "$WORKDIR/keep.txt" > "$WORKDIR/stale.txt"

if [ -s "$WORKDIR/stale.txt" ]; then
  while IFS= read -r key; do
    aws s3 rm "s3://$BUCKET/$key"
  done < "$WORKDIR/stale.txt"
fi

aws s3 cp "$WORKDIR/current.txt" "s3://$BUCKET/$MANIFEST_KEY"
