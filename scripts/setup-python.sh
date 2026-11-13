#!/bin/bash
# Installs project tools only; never changes a shell profile or system Python.
set -euo pipefail
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [[ "$(/usr/bin/uname -s)" != Darwin ]] || ! /usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null | /usr/bin/grep -q '^1$'; then
  echo 'This setup is for an Apple-silicon Mac. No files were changed.' >&2
  exit 1
fi
export PATH="$HOME/.local/bin:$PATH"
if ! command -v uv >/dev/null 2>&1; then
  echo 'Installing uv in ~/.local/bin; uv downloads and manages Python without changing your shell profile.'
  installer=$(mktemp)
  trap 'rm -f "$installer"' EXIT
  curl --fail --location --silent --show-error https://astral.sh/uv/install.sh -o "$installer"
  UV_INSTALL_DIR="$HOME/.local/bin" UV_NO_MODIFY_PATH=1 sh "$installer"
fi
echo 'Installing native Apple-silicon Python 3.12 through uv (existing installations are reused).'
python_request=cpython-3.12-macos-aarch64-none
uv python install "$python_request"
native_python=$(uv python find --managed-python "$python_request")
"$native_python" -I -B -c 'import platform,sys; assert platform.machine() == "arm64" and sys.version_info[:2] == (3,12), "Expected native arm64 Python 3.12"'

if [[ -e .venv ]] && ! .venv/bin/python3 -I -B -c 'import platform,sys; assert platform.machine() == "arm64" and sys.version_info[:2] == (3,12)' 2>/dev/null; then
  mkdir -p study/environment-backups
  backup="study/environment-backups/.venv-before-native-$(date +%Y%m%d-%H%M%S)-$$"
  echo "Keeping the old environment as $backup before rebuilding it."
  mv .venv "$backup"
fi
if [[ ! -x .venv/bin/python3 ]]; then
  echo 'Creating .venv from that native interpreter; project packages will live here.'
  uv venv --python "$native_python" .venv
fi
echo 'Installing the pinned tools needed by the semester into .venv.'
uv pip install --python .venv/bin/python3 -r requirements-course.txt
# Report what was installed, and nothing about the terminal: this script's
# PATH is its own, so "the first python3 on PATH" here says nothing true about
# the terminal she types in.
echo 'Checking what was installed.'
.venv/bin/python3 -I -B scripts/doctor.py --strict --installed-only
# The full path, quoted: she runs this from her own folder, where a relative
# `.venv/bin/activate` is a different environment — the one session 1 has her
# build from the wrong Python.
echo "The course's own Python is ready. Your labs run in an environment of your own in ~/cs-core;"
echo "the end of session 1's lab shows how to make one from this Python, or to keep yours if it is 3.12 or newer."
echo 'Nothing above changed which python3 your terminal uses.'
