#!/usr/bin/env python3
"""Read-only environment report. No learner files are imported or executed."""
import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PINS = {"pytest": "8.3.5", "hypothesis": "6.131.9", "psutil": "7.0.0",
        "numpy": "2.2.5", "ruff": "0.11.8", "pyright": "1.1.400"}
PROBE = '''import importlib,importlib.metadata,json,platform,sys
packages={}
for name in %r:
    try:
        importlib.import_module(name)
        packages[name]={"version":importlib.metadata.version(name),"error":None}
    except Exception as exc:
        packages[name]={"version":None,"error":type(exc).__name__}
print(json.dumps({"executable":sys.executable,"machine":platform.machine(),"version":platform.python_version(),"prefix":sys.prefix,"packages":packages}))
''' % list(PINS)


def probe(executable):
    try:
        result = subprocess.run([str(executable), "-I", "-B", "-c", PROBE],
                                capture_output=True, text=True, timeout=15,
                                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"})
        if result.returncode:
            return {"error": "Python could not start (exit %s)." % result.returncode}
        return json.loads(result.stdout)
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return {"error": "Python could not be inspected."}


def hardware():
    """The machine itself, not the Python running this file.

    On an Apple-silicon Mac an Intel python3 runs translated, and so does every
    child it starts: `uname -m` and `platform.machine()` both answer x86_64
    there. `hw.optional.arm64` is a property of the hardware and answers 1
    either way, so this report says the same thing whichever python3 runs it.
    """
    try:
        if subprocess.check_output(["/usr/sbin/sysctl", "-n", "hw.optional.arm64"], text=True, timeout=3,
                                   stderr=subprocess.DEVNULL).strip() == "1":
            return "arm64"
    except (OSError, subprocess.SubprocessError):
        pass
    try:
        return subprocess.check_output(["/usr/bin/uname", "-m"], text=True, timeout=3).strip()
    except (OSError, subprocess.SubprocessError):
        return "unknown"


def report():
    setup = "bash " + shlex.quote(str(ROOT / "scripts/setup-python.sh"))
    activate = "source " + shlex.quote(str(ROOT / ".venv/bin/activate"))
    path_python = shutil.which("python3")
    path_fact = probe(path_python) if path_python else {"error": "No python3 is on PATH."}
    venv_python = ROOT / ".venv/bin/python3"
    venv = probe(venv_python) if venv_python.exists() else {"error": "The project .venv does not exist."}
    machine = hardware()
    rows = []

    def row(identifier, label, ok, detail, command=setup, explanation="Installs native Python 3.12 and the project's required packages in .venv."):
        rows.append({"id": identifier, "label": label, "ok": bool(ok), "detail": detail,
                     "command": None if ok else command, "explanation": None if ok else explanation})

    row("machine", "Your machine", machine in ("arm64", "arm64e"), machine,
        "sysctl -n hw.optional.arm64", "Prints 1 on an Apple-silicon Mac, whichever Python is asking.")
    path_ok = path_fact.get("machine") == "arm64" and path_fact.get("version", "").startswith("3.12.")
    venv_ok = venv.get("machine") == "arm64" and venv.get("version", "").startswith("3.12.")
    # Once the project environment exists, the cure for a wrong python3 in this
    # terminal is to switch to it, not to install it again.
    row("path", "The first python3 on PATH", path_ok,
        "%s — %s, %s" % (path_python or "not found", path_fact.get("version", "unavailable"), path_fact.get("machine", "unknown")),
        activate if venv_ok else setup,
        "Makes python3 in this terminal use the project's .venv." if venv_ok else "Installs native Python 3.12 and the project's required packages in .venv.")
    row("venv", "Project environment", venv_ok,
        venv.get("error") or "%s — Python %s, %s" % (venv_python, venv["version"], venv["machine"]))
    active = path_fact.get("prefix") == str(ROOT / ".venv")
    row("active", "This terminal uses the project environment", active,
        "Yes" if active else "No — activate it in the terminal where you run the lab.",
        activate if venv_ok else setup,
        "Makes python3 in this terminal use the project's .venv." if venv_ok else "Creates the native project environment before you activate it.")
    for name, expected in PINS.items():
        found = venv.get("packages", {}).get(name, {})
        row("package-" + name, name, found.get("version") == expected,
            "%s (expected %s)" % (found.get("version") or "missing or unavailable", expected))
    row("node", "Node for the type checker", bool(shutil.which("node")), shutil.which("node") or "Node is not on PATH.",
        "npm --version", "Checks whether the Node toolchain used by this app is available in your terminal.")
    return {"ok": all(r["ok"] for r in rows), "rows": rows,
            "facts": {"machine": machine, "path_python": path_fact, "venv": venv}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--strict", action="store_true", help="Exit nonzero on a failing check; ordinary reports never block a session.")
    parser.add_argument("--installed-only", action="store_true",
                        help="Report the machine, the project environment and its packages, and say nothing about the "
                             "terminal. The installer uses this: the PATH it runs under is its own, not the learner's.")
    args = parser.parse_args()
    result = report()
    if args.installed_only:
        result["rows"] = [r for r in result["rows"] if r["id"] not in ("path", "active", "node")]
        result["ok"] = all(r["ok"] for r in result["rows"])
    if args.json:
        print(json.dumps(result))
    else:
        for entry in result["rows"]:
            print(("OK" if entry["ok"] else "TO FIX") + " — " + entry["label"] + ": " + entry["detail"])
            if entry["command"]:
                print("  " + entry["command"] + " — " + entry["explanation"])
    sys.exit(1 if args.strict and not result["ok"] else 0)
