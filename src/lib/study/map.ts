import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

// `/curriculum` answers one question: is this course grounded or invented? So
// every row on it is read from the pinned research file, and the only thing
// added here is what the pinned file does not carry — the session range each
// taught block occupies, and the Chinese name the demo prints beside the four.
// The ten English names come from `skill-tree.html` and are not ours to reword.

export interface TrunkBlock {
  id: string;
  question: string;
  learn: string[];
  head_start?: string;
  judge_check?: string;
  understand_check?: string;
  courses?: {school: string; code: string; title: string; url: string; catalog_year: string}[];
}

export const TAUGHT: Record<string, {range: string; from: number; to: number}> = {
  A1: {range: "sessions 1–9", from: 1, to: 9},
  A2: {range: "sessions 10–12", from: 10, to: 12},
  A3: {range: "sessions 13–15", from: 13, to: 15},
  A4: {range: "sessions 16–20", from: 16, to: 20},
};

/** §14.3's teardown column, so the map can show what rides along. */
export const TEARDOWN: Record<number, string> = {
  2: "Spliit", 4: "Pagefind", 6: "Loop Habit Tracker", 8: "AnythingLLM",
  10: "Intercom", 11: "a shared whiteboard", 12: "Stripe", 13: "Snowflake",
  14: "GitHub code search", 15: "Instagram", 16: "PostHog", 18: "Visual Studio Code",
  19: "Figma", 20: "Codex CLI",
};

/** The titles of the sessions no block file authors yet (§14.3). */
export const PLANNED: Record<string, [number, string][]> = {
  A1: [
    [4, "Pick the right container"],
    [5, "Data in and out"],
    [6, "Recover a specification from code"],
    [7, "Debug by method"],
    [8, "Read history"],
    [9, "Build it and explain it"],
  ],
  A2: [
    [10, "Say what must be true"],
    [11, "Invariants, and one counterexample (double)"],
    [12, "Catch tests that only look thorough (double)"],
  ],
  A3: [
    [13, "Get the measuring stick first"],
    [14, "Choose a structure, and recognise that an index is one"],
    [15, "Find the hidden repeated work"],
  ],
  A4: [
    [16, "Know what each level costs"],
    [17, "Know why big jobs get killed"],
    [18, "Processes and threads"],
    [19, "Concurrency, through a real outage (double)"],
    [20, "Measure before optimising"],
  ],
};

export const BLOCK_NAMES: Record<string, string> = {
  A1: "Code & debugging",
  A2: "Logic & precise reasoning",
  A3: "Algorithms & data structures",
  A4: "Computer systems",
  B1: "APIs & data stores",
  B2: "Software design & testing",
  B3: "Shipping & ownership",
  B4: "System design",
  C1: "How models work",
  C2: "Directing & checking AI",
};

export async function loadTrunk(): Promise<TrunkBlock[]> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), "content/trunk.json"), "utf8")) as TrunkBlock[];
}

/**
 * The eight skills, binding (DESIGN §14.2's table). Two of the eight labels
 * differ from their key — A2's build skill is **Specify**, A3's is **Measure**
 * — and the board prints `label` and `says`, never the key. They live here as
 * well as in each block file so the board and the map can name a block whose
 * sessions are not authored yet, instead of printing a dash.
 */
export const BARS: Record<string, {judge: {label: string; says: string}; build: {label: string; says: string}}> = {
  A1: {
    judge: {label: "Judge", says: "Tell whether code is right"},
    build: {label: "Build", says: "Write it and fix what it hands you"},
  },
  A2: {
    judge: {label: "Judge", says: "Say exactly what must be true"},
    build: {label: "Specify", says: "Write it down so a test can check it"},
  },
  A3: {
    judge: {label: "Judge", says: "Tell how it slows down as the data grows"},
    build: {label: "Measure", says: "Time it at several sizes, and show the growth"},
  },
  A4: {
    judge: {label: "Judge", says: "Tell what the machine is doing"},
    build: {label: "Build", says: "Make it faster, and prove it"},
  },
};
