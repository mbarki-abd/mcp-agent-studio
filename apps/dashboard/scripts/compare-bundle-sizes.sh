#!/bin/bash
# Bundle Size Comparison Script
# Usage: ./scripts/compare-bundle-sizes.sh [commit-hash]
# If no commit hash is provided, compares with HEAD~1

set -e

COMMIT=${1:-HEAD~1}
CURRENT_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)

echo "🔍 Comparing bundle sizes..."
echo "Current: HEAD"
echo "Previous: $COMMIT"
echo ""

# Build current version
echo "📦 Building current version..."
pnpm run build > /dev/null 2>&1

# Save current build stats
CURRENT_STATS=$(find dist/assets -name "*.js" -type f -exec du -b {} \; | awk '{sum+=$1} END {print sum}')
CURRENT_GZIP=$(find dist/assets -name "*.js" -type f -exec gzip -c {} \; | wc -c)

echo "Current build:"
echo "  - Total JS: $(numfmt --to=iec-i --suffix=B $CURRENT_STATS)"
echo "  - Gzipped:  $(numfmt --to=iec-i --suffix=B $CURRENT_GZIP)"
echo ""

# Checkout previous version
echo "📦 Building previous version ($COMMIT)..."
git stash push -q -m "temp-bundle-compare"
git checkout -q $COMMIT

# Build previous version
pnpm run build > /dev/null 2>&1

# Save previous build stats
PREV_STATS=$(find dist/assets -name "*.js" -type f -exec du -b {} \; | awk '{sum+=$1} END {print sum}')
PREV_GZIP=$(find dist/assets -name "*.js" -type f -exec gzip -c {} \; | wc -c)

echo "Previous build ($COMMIT):"
echo "  - Total JS: $(numfmt --to=iec-i --suffix=B $PREV_STATS)"
echo "  - Gzipped:  $(numfmt --to=iec-i --suffix=B $PREV_GZIP)"
echo ""

# Calculate differences
DIFF_STATS=$((CURRENT_STATS - PREV_STATS))
DIFF_GZIP=$((CURRENT_GZIP - PREV_GZIP))
DIFF_PERCENT=$(awk "BEGIN {printf \"%.2f\", ($DIFF_STATS / $PREV_STATS) * 100}")

echo "📊 Changes:"
if [ $DIFF_STATS -gt 0 ]; then
  echo "  - Total JS: +$(numfmt --to=iec-i --suffix=B $DIFF_STATS) (+${DIFF_PERCENT}%)"
else
  echo "  - Total JS: $(numfmt --to=iec-i --suffix=B $DIFF_STATS) (${DIFF_PERCENT}%)"
fi

if [ $DIFF_GZIP -gt 0 ]; then
  echo "  - Gzipped:  +$(numfmt --to=iec-i --suffix=B $DIFF_GZIP)"
else
  echo "  - Gzipped:  $(numfmt --to=iec-i --suffix=B $DIFF_GZIP)"
fi

# Return to current version
git checkout -q -
git stash pop -q

echo ""
if [ $(echo "$DIFF_PERCENT > 10" | bc) -eq 1 ]; then
  echo "⚠️  WARNING: Bundle size increased by more than 10%!"
  exit 1
elif [ $(echo "$DIFF_PERCENT < -10" | bc) -eq 1 ]; then
  echo "🎉 Great! Bundle size decreased by more than 10%!"
elif [ $DIFF_STATS -eq 0 ]; then
  echo "✅ No change in bundle size"
else
  echo "✅ Bundle size change is acceptable"
fi
