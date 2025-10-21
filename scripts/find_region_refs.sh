#!/bin/bash
# Script to find remaining region system references
# Part of region system removal PR
# Exit code: 0 if no references found, 1 if references found

set -e

echo "================================================"
echo "Region System Reference Checker"
echo "================================================"
echo ""

# Exclude patterns
EXCLUDE_DIRS="node_modules|dist|\.git|docs/archived"
EXCLUDE_FILES="find_region_refs.sh|REGION_SYSTEM_REMOVAL_SUMMARY.md"

# Search patterns
PATTERNS=(
    "regionManager"
    "ByRegion"
    "findNearest.*ByRegion"
    "isReachable"
    "rebuildArea"
    "regionDebug"
    "debug\.regions"
    "REGION_[A-Z_]+"
    "regions\.ts"
    "regionPathfinding"
    "regionIndex"
    "regionBuilder"
)

FOUND_REFS=0

echo "Searching for region-related patterns in source code..."
echo ""

for pattern in "${PATTERNS[@]}"; do
    echo "Checking pattern: $pattern"
    
    # Search in source files only (ts, js, tsx, jsx)
    if results=$(grep -rn --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
        --exclude-dir={node_modules,dist,.git,docs} \
        -E "$pattern" . 2>/dev/null); then
        echo "  ❌ FOUND references:"
        echo "$results" | head -10
        if [ $(echo "$results" | wc -l) -gt 10 ]; then
            echo "  ... and $(( $(echo "$results" | wc -l) - 10 )) more"
        fi
        echo ""
        FOUND_REFS=$((FOUND_REFS + 1))
    else
        echo "  ✅ No references found"
    fi
done

echo ""
echo "================================================"

# Check for region documentation in non-archived locations
echo "Checking for region documentation outside archived/..."
if [ -d "docs/regions" ]; then
    echo "  ❌ FOUND: docs/regions/ directory still exists"
    FOUND_REFS=$((FOUND_REFS + 1))
else
    echo "  ✅ No docs/regions/ directory"
fi

# Check README files for region references
echo ""
echo "Checking README files for region references..."
if grep -r --include="README.md" --exclude-dir={node_modules,dist,.git,docs/archived} \
    -iE "region" . 2>/dev/null | grep -v "find_region_refs"; then
    echo "  ❌ FOUND region references in README files"
    FOUND_REFS=$((FOUND_REFS + 1))
else
    echo "  ✅ No region references in README files"
fi

echo ""
echo "================================================"
echo "SUMMARY"
echo "================================================"

if [ $FOUND_REFS -eq 0 ]; then
    echo "✅ SUCCESS: No region system references found!"
    echo ""
    echo "The region system has been successfully removed."
    exit 0
else
    echo "❌ FAILURE: Found $FOUND_REFS pattern(s) with references"
    echo ""
    echo "Please review and remove the references listed above."
    echo "Note: References in docs/archived/ are expected and ignored."
    exit 1
fi
