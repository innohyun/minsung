#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_binary="$(mktemp /tmp/last-circle-test.XXXXXX)"
trap 'rm -f "$test_binary"' EXIT
"${CXX:-g++}" -std=c++17 -Wall -Wextra -Werror -pedantic \
  -I "$project_dir/Source/LastCircle/Public" "$project_dir/Tests/rules_test.cpp" -o "$test_binary"
"$test_binary"
python3 - "$project_dir" <<'PY'
import ast
import json
import pathlib
import sys
root = pathlib.Path(sys.argv[1])
json.loads((root / 'LastCircle.uproject').read_text())
ast.parse((root / 'Scripts/GenerateContent.py').read_text())
print('PASS: project JSON and Unreal content-generation Python syntax')
PY
