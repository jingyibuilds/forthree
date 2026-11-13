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
# One list of pins, shared with the installers (requirements-course.txt).
REQUIREMENTS = ROOT / "requirements-course.txt"
PINS = dict(line.strip().split("==", 1) for line in REQUIREMENTS.read_text().splitlines()
            if line.strip() and not line.lstrip().startswith("#"))
# Her lab environment may be any native Python from 3.12 on; the course's own
# environment is 3.12 (DECISIONS 2026-11-11).
LAB_MINIMUM = (3, 12)


def at_least(version, minimum=LAB_MINIMUM):
    try:
        return tuple(int(part) for part in version.split(".")[:2]) >= minimum
    except (AttributeError, ValueError):
        return False
PROBE = '''import importlib,importlib.metadata,json,platform,sys
packages={}
for name in %r:
    try:
        importlib.import_module(name)
        packages[name]={"version":importlib.metadata.version(name),"error":None}
    except Exception as exc:
        packages[name]={"version":None,"error":type(exc).__name__}
print(json.dumps({"executable":sys.executable,"machine":platform.machine(),"version":platform.python_version(),"prefix":sys.prefix,"base_prefix":sys.base_prefix,"packages":packages}))
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
    path_ok = path_fact.get("machine") == "arm64" and at_least(path_fact.get("version", ""))
    venv_ok = venv.get("machine") == "arm64" and venv.get("version", "").startswith("3.12.")
    make_lab = shlex.quote(str(ROOT / ".venv/bin/python3")) + " -m venv .venv"
    packages = "python3 -m pip install -r " + shlex.quote(str(REQUIREMENTS))
    # Once the course's Python exists, the cure for a wrong python3 in this
    # terminal is a lab environment made from it, not another install.
    row("path", "The first python3 on PATH", path_ok,
        "%s — %s, %s" % (path_python or "not found", path_fact.get("version", "unavailable"), path_fact.get("machine", "unknown")),
        make_lab if venv_ok else setup,
        "Run in ~/cs-core, after moving any old .venv aside: makes a lab environment there from the course's native Python 3.12. Then switch to it with: source .venv/bin/activate"
        if venv_ok else "Installs native Python 3.12 and the project's required packages in .venv.")
    row("venv", "Project environment", venv_ok,
        venv.get("error") or "%s — Python %s, %s" % (venv_python, venv["version"], venv["machine"]))
    # What a lab needs from this terminal: an environment switched on, whose
    # python3 has the course's packages. Which environment, is hers to choose.
    # pip is offered only inside one: run against the Mac's own python3 it
    # installs for every program on the machine (review, 2026-11-11).
    in_env = bool(path_fact.get("prefix")) and path_fact.get("prefix") != path_fact.get("base_prefix")
    missing = [name for name, expected in PINS.items()
               if path_fact.get("packages", {}).get(name, {}).get("version") != expected]
    # Missing packages are not a fault until a lab needs them; that lab's card
    # carries the command (REBUILD.md R8). The row is about the environment.
    ready = path_ok and in_env
    if not in_env:
        detail, command, explanation = (
            "No — no environment is switched on in this terminal.", "cd ~/cs-core && source .venv/bin/activate",
            "Goes to your lab folder and switches this terminal to its environment. If there is no .venv there yet, the row above makes one.")
    else:
        detail = ("Yes" if not missing else "Not yet: " + ", ".join(missing) + ". The lab that first needs them shows the command.") if ready else "See the row above."
        command = packages if path_ok else (make_lab if venv_ok else setup)
        explanation = ("Installs the course's packages, at the versions the course uses, into the environment switched on in this terminal."
                       if path_ok else "Make a lab environment first: see the row above.")
    row("active", "This terminal's environment has the course's packages", ready, detail, command, explanation)
    for name, expected in PINS.items():
        found = venv.get("packages", {}).get(name, {})
        row("package-" + name, name + " (the course's own environment)", found.get("version") == expected,
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
