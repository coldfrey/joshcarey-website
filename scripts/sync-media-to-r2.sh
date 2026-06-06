#!/usr/bin/env bash
#
# Sync local image originals to the Cloudflare R2 gallery bucket.
#
# Drop images in  media-src/  (gitignored). On commit, the pre-commit hook runs
# this and uploads any new/changed files to R2 — so the heavy originals live in
# R2, never in git. A manifest (.r2-media-manifest, committed) records the
# sha256 of what's already uploaded, so unchanged files are skipped.
#
# Public URL of an uploaded file:  $MEDIA_BASE/<path-relative-to-media-src>
# (MEDIA_BASE is defined in src/config.ts — keep them in sync.)
#
# Run manually:  pnpm run media:sync     (uploads, no commit needed)
# Bypass on commit:  git commit --no-verify

set -euo pipefail

BUCKET="joshuacarey-gallery"
DIR="media-src"
MANIFEST=".r2-media-manifest"

# Resolve to repo root regardless of where we're invoked from.
cd "$(git rev-parse --show-toplevel)"

[ -d "$DIR" ] || exit 0

# Collect non-hidden files under media-src/ (portable; macOS bash 3.2 friendly).
files=()
while IFS= read -r f; do files+=("$f"); done < <(find "$DIR" -type f ! -name '.*' | sort)
[ "${#files[@]}" -eq 0 ] && exit 0

# Pick a wrangler runner.
if command -v pnpm >/dev/null 2>&1; then WR="pnpm exec wrangler"
elif command -v npx  >/dev/null 2>&1; then WR="npx wrangler"
else
  echo "media→r2: wrangler not available (no pnpm/npx). Skipping upload." >&2
  echo "         Commit with --no-verify to bypass, or install deps." >&2
  exit 1
fi

content_type() {
  case "${1##*.}" in
    jpg|jpeg) echo "image/jpeg" ;;
    png)      echo "image/png" ;;
    webp)     echo "image/webp" ;;
    avif)     echo "image/avif" ;;
    gif)      echo "image/gif" ;;
    svg)      echo "image/svg+xml" ;;
    *)        echo "application/octet-stream" ;;
  esac
}

tmp_manifest="$(mktemp)"
uploaded=0
for f in "${files[@]}"; do
  rel="${f#"$DIR"/}"
  newhash="$(shasum -a 256 "$f" | awk '{print $1}')"
  oldhash="$(awk -F'\t' -v p="$rel" '$1==p{print $2}' "$MANIFEST" 2>/dev/null || true)"
  if [ "$newhash" != "$oldhash" ]; then
    echo "media→r2: uploading $rel" >&2
    $WR r2 object put "$BUCKET/$rel" --file="$f" \
        --content-type="$(content_type "$rel")" --remote >/dev/null
    uploaded=$((uploaded + 1))
  fi
  printf '%s\t%s\n' "$rel" "$newhash" >> "$tmp_manifest"
done

sort -o "$tmp_manifest" "$tmp_manifest"
mv "$tmp_manifest" "$MANIFEST"

if [ "$uploaded" -gt 0 ]; then
  echo "media→r2: $uploaded file(s) uploaded to '$BUCKET'." >&2
fi
exit 0
