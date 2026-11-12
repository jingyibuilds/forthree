# forthree — CS Core

A one-person computer-science semester for a data scientist who can already
do statistics and machine learning, but has no CS foundation: Python used like
SQL, no feel for environments, scope, state or what a process is. It teaches
practical CS well enough to read unfamiliar code, direct an AI coding agent,
and judge what it hands back.

It runs **on your own machine**, for one learner. No account, no login, no
cloud service. Your progress is files on your disk.

**Built so far: sessions 1–3 of 21** (block A1, "Code & debugging"):

1. Get code to run at all
2. Order and state
3. Naming and boundaries

Each session is a set of parts: you guess before you see, run a lab in your own
terminal, take a no-help check, and talk through a short interview program.

## Background

Why the course is shaped this way, and what it covers. The skill tree and the
demo can be opened in a browser without installing anything:
[skill tree](https://jingyibuilds.github.io/forthree/content/skill-tree.html) ·
[demo](https://jingyibuilds.github.io/forthree/demo/day-one.html).

- **What we mean by "learning"** — one page, [Chinese original](docs/background/learning-one-pager.zh.md)
  and an [English translation](docs/background/learning-one-pager.en.md).
- **The CS + AI skill tree** — [content/skill-tree.html](content/skill-tree.html),
  open it in a browser (it needs an internet connection for its web fonts).
  The same tree drives the course map: [content/trunk.json](content/trunk.json).
- **An earlier demo of week 1, session 1** — [demo/day-one.html](demo/day-one.html),
  a single static page. It predates the app, so it differs in places and
  contains some Chinese.

## What you need

| | |
|---|---|
| Node.js | 20.9 or newer (developed on 22) |
| Python | 3.12, with `pytest`, `hypothesis`, `psutil`, `numpy`, `ruff`, `pyright` at the pinned versions in `scripts/doctor.py` |
| A browser | any current one; the app is built for a desktop-sized window (1000 px and wider) |
| A terminal | the labs are run in it |

**Platforms.** Built for, and tested only on, an Apple-silicon Mac.
`scripts/setup-python.sh` refuses to run anywhere else, and **session 1 is
written around that machine**: its lab has you find a Python built for the wrong
chip, and its checks expect `arm64`. On Linux, Intel Macs or Windows (WSL) you
can set up the environment yourself (below) and sessions 2–3 should work, but
session 1's environment checks will not match your machine and nothing here has
been tested on them.

## Install and run

```bash
git clone <this repo's URL> forthree
cd forthree
scripts/setup-python.sh     # Apple-silicon Mac: installs uv and the course's Python 3.12 into .venv
npm install
npm run dev                 # then open http://localhost:3000
```

`scripts/setup-python.sh` installs `uv` into `~/.local/bin` and Python into
`.venv` inside this folder. It does not touch your shell profile or your
system Python. `python3 scripts/doctor.py` reports what is installed and
changes nothing.

In the terminal where you do the labs, run `source .venv/bin/activate` first,
so `python3` there is the course Python.

### Other platforms

Create the environment by hand, then check it:

```bash
python3.12 -m venv .venv
.venv/bin/pip install pytest==8.3.5 hypothesis==6.131.9 psutil==7.0.0 numpy==2.2.5 ruff==0.11.8 pyright==1.1.400
.venv/bin/python3 scripts/doctor.py
```

`doctor.py` will mark its "Your machine" row as failing, because that row
asks for Apple silicon; the rest of its report still applies. The numbers quoted
in the lessons were measured on an Apple-silicon Mac, so a lab can print a
slightly different number elsewhere.

### Let your own coding agent set it up

If you work with Claude Code, Codex or a similar agent, paste this to it from
inside the cloned folder:

> Set up this repository so I can start studying. Read README.md first. Check
> that Node 20.9+ is installed. On an Apple-silicon Mac run
> `scripts/setup-python.sh`; on any other platform create `.venv` with
> Python 3.12 and the pinned packages listed in the README. Run `npm install`,
> then `python3 scripts/doctor.py` and `npm run check`, and tell me what
> failed, if anything. Then start `npm run dev` and tell me the address. Do not
> open `curriculum/sealed/a1.json`, and do not edit anything under `study/`.

## Using it

- **Today** shows the next session. **Curriculum** shows the map. **Board**
  shows where each skill stands: *not started*, *with help* or *on your own*.
  There are no points, streaks or percentages.
- You can open any written session at any time. A later one opens to read ahead
  and cannot be started until the earlier ones are done. A finished session
  stays open for review.
- The app never runs your code. You run the lab in your terminal and paste back
  what it printed; deterministic checks read that.
- Your progress is the `study/` folder in the repo (created on first use, never
  committed). It survives closing the browser. Delete the folder to start over;
  copy it to keep your place on another machine.

## What is not here yet

- **The AI assistant.** The "Ask" panel returns fixed text. `/api/llm` is a
  placeholder; no model is called and `.env.example` is reserved for when one is.
- **Sessions 4–21.** The map lists them; they are not written.
- **A hosted version.** There is none; you run it yourself.

## Checking your copy

```bash
npm run check
```

Runs, in order: content rules, a re-run of every program the lessons quote,
lint, types, the study engine's tests, a production build, and a headless-Chrome
pass over every screen. A step that cannot run on your machine (the browser
pass needs Chrome; the program re-run needs `.venv`) is reported as skipped, not
passed. The check never touches your `study/` folder.

## A note on the answer files

`curriculum/sealed/a1.json` holds the questions and answers of the no-help
checks, and `curriculum/reference/` holds the programs behind the numbers in the
lessons. They ship because the app and the checks need them. If you want the
checks to mean anything for you, do not open them before you have taken them.
Comments in the source cite notes kept by the authors (ids like `L-AUTH-02`);
those notes are not part of this repository.

## License

MIT — see [LICENSE](LICENSE).
