#!/usr/bin/env bash
# generate-changelog.sh — Generate CHANGELOG.md from conventional commits
# Usage: ./scripts/generate-changelog.sh [since_tag]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHANGELOG="$REPO_ROOT/CHANGELOG.md"
SINCE_TAG="${1:-}"

# ── Collect commits ──
if [[ -n "$SINCE_TAG" ]]; then
  RANGE="${SINCE_TAG}..HEAD"
else
  RANGE="HEAD"
fi

COMMITS=$(git log "$RANGE" --pretty=format:"%H|%s|%an|%ad" --date=short 2>/dev/null || true)

if [[ -z "$COMMITS" ]]; then
  echo "No commits found in range: $RANGE"
  exit 0
fi

# ── Initialize category files ──
TMPDIR=$(mktemp -d)
for cat in feat fix perf refactor docs test chore other; do
  : > "$TMPDIR/$cat"
done

COUNT=0

while IFS='|' read -r hash subject author date; do
  [[ -z "$hash" ]] && continue
  COUNT=$((COUNT + 1))
  short="${hash:0:7}"

  # Parse conventional commit: type(scope): description
  type="other"
  scope=""
  desc="$subject"

  # Use sed to extract parts — more portable than bash regex
  if echo "$subject" | grep -qE '^[a-z]+(\(.+\))?: .+'; then
    type=$(echo "$subject" | sed 's/^\([a-z]*\).*/\1/')
    rest=$(echo "$subject" | sed 's/^[a-z]*\(: \)/\1/')
    rest="${rest#: }"

    # Check for scope
    if echo "$subject" | grep -qE '^[a-z]+\(.+\):'; then
      scope=$(echo "$subject" | sed 's/^[a-z]*(\([^)]*\)).*/\1/')
      rest=$(echo "$subject" | sed 's/^[a-z]*([^)]*): //')
    fi
    desc="$rest"
  fi

  # Normalize type
  case "$type" in
    feat|fix|perf|refactor|docs|test|chore) ;;
    *) type="other" ;;
  esac

  # Format the line
  if [[ -n "$scope" ]]; then
    line="- **${scope}:** ${desc} (\`${short}\`)"
  else
    line="- ${desc} (\`${short}\`)"
  fi

  echo "$line" >> "$TMPDIR/$type"
done <<< "$COMMITS"

# ── Generate output ──
TODAY=$(date +%Y-%m-%d)
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LATEST_TAG" ]]; then
  VERSION_HEADER="## [$LATEST_TAG] — $TODAY"
else
  VERSION_HEADER="## [Unreleased] — $TODAY"
fi

{
  echo "# Changelog"
  echo ""
  echo "All notable changes to this project will be documented in this file."
  echo ""
  echo "The format is based on [Keep a Changelog](https://keepachangelog.com/),"
  echo "and this project adheres to [Semantic Versioning](https://semver.org/)."
  echo ""
  echo "$VERSION_HEADER"
  echo ""

  for cat in feat fix perf refactor docs test chore other; do
    if [[ -s "$TMPDIR/$cat" ]]; then
      case "$cat" in
        feat)     echo "### ✨ Features" ;;
        fix)      echo "### 🐛 Bug Fixes" ;;
        perf)     echo "### ⚡ Performance" ;;
        refactor) echo "### ♻️ Refactoring" ;;
        docs)     echo "### 📚 Documentation" ;;
        test)     echo "### 🧪 Tests" ;;
        chore)    echo "### 🔧 Chores" ;;
        other)    echo "### 📦 Other" ;;
      esac
      echo ""
      cat "$TMPDIR/$cat"
      echo ""
    fi
  done
} > "$CHANGELOG"

rm -rf "$TMPDIR"

echo "✅ Generated $CHANGELOG"
echo "   $COUNT commits processed"
