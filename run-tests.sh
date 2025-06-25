#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run-tests.sh – Convenience wrapper to execute all *-test.sh scripts
# ---------------------------------------------------------------------------
# You can invoke this from ANY sub-directory (e.g. infra/) and it will
# automatically locate the repository root, then execute every file matching
# scripts/*-test.sh in lexical order. This avoids fish shell wildcard issues
# when the current directory lacks a scripts/ sub-folder.
#
# Usage:
#   ./run-tests.sh            # from repo root
#   ./infra/../run-tests.sh   # from infra/
#
# The script exits non-zero if any individual test fails.
# ---------------------------------------------------------------------------
set -euo pipefail

# Resolve the directory where this script resides (repository root)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
REPO_ROOT=$SCRIPT_DIR

cd "$REPO_ROOT"

if [[ ! -d scripts ]]; then
  echo "Expected scripts directory under $REPO_ROOT but not found" >&2
  exit 1
fi

shopt -s nullglob
TEST_SCRIPTS=(scripts/*-test.sh)
shopt -u nullglob

if [[ ${#TEST_SCRIPTS[@]} -eq 0 ]]; then
  echo "No test scripts found under scripts/" >&2
  exit 1
fi

echo "Running ${#TEST_SCRIPTS[@]} test scripts ..."
for t in "${TEST_SCRIPTS[@]}"; do
  echo "===== $t ====="
  bash "$t"
  echo
done

echo "All tests passed ✅" 
