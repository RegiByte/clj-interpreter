#!/usr/bin/env bash

set -euo pipefail

if ! command -v cloc >/dev/null 2>&1; then
  echo "Error: cloc is not available in PATH."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-src}"
TARGET_PATH="${ROOT_DIR}/${TARGET_DIR}"
TEST_FILE_REGEX='\.spec\.[cm]?[jt]sx?$|\.test\.[cm]?[jt]sx?$'

if [ ! -d "${TARGET_PATH}" ]; then
  echo "Error: target directory '${TARGET_DIR}' does not exist from repo root."
  echo "Usage: ./scripts/loc-metrics.sh [relative-dir]"
  exit 1
fi

echo "== LOC excluding tests (${TARGET_DIR}) =="
cloc "${TARGET_PATH}" \
  --exclude-dir=__tests__ \
  --not-match-f="${TEST_FILE_REGEX}"

echo
echo "== LOC for tests only (${TARGET_DIR}) =="
cloc "${TARGET_PATH}" \
  --match-d='__tests__' \
  --match-f="${TEST_FILE_REGEX}"
