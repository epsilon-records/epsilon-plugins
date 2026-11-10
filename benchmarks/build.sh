#!/usr/bin/env bash
# Builds the Linux x64 VST3 of every plugin in plugins.json at its latest release tag.
# Usage: benchmarks/build.sh [work-dir]   (default: ./bench-build)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
work="${1:-$here/bench-build}"
mkdir -p "$work" && cd "$work"
[ -d dpf ] || git clone -q --depth 1 --recursive https://github.com/DISTRHO/DPF.git dpf
: > versions.txt
for name in $(python3 -c "import json;print(' '.join(p['name'] for p in json.load(open('$here/plugins.json'))['plugins']))"); do
  repo="$(echo "$name" | tr 'A-Z' 'a-z')"
  tag="$(git ls-remote --tags --refs "https://github.com/epsilon-records/$repo" 'v*' | awk -F/ '{print $3}' | sort -V | tail -1)"
  rm -rf "$repo"
  git -c advice.detachedHead=false clone -q --depth 1 --branch "$tag" "https://github.com/epsilon-records/$repo" "$repo"
  ln -sfn "$work/dpf" "$repo/dpf"
  make -C "$repo/plugins/$name" vst3 -j"$(nproc)" > "$repo/build.log" 2>&1
  echo "$name $tag $(git -C "$repo" rev-parse --short HEAD)" | tee -a versions.txt
done
