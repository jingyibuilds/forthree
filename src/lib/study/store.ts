import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StudyError } from "./types";
import * as memory from "./store-memory";

// The public web trial runs this store in memory instead (PUBLISH.md §6): the
// visitor's record travels with the request and the server writes no files.
// Every caller keeps the same five primitives and the same observable rules;
// only where the bytes live changes.
const web = () => process.env.FORTHREE_MODE === "web";

export function studyRoot() {
  return process.env.FORTHREE_STUDY_ROOT || path.join(process.cwd(), "study");
}

function filePath(relative: string) {
  const root = path.resolve(studyRoot());
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error("Invalid study path");
  return file;
}

function missing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

// Node has no portable flock API and macOS has no flock executable. Atomic
// mkdir supplies the same cross-process exclusion. All store transactions use
// one lock so plan + attempt cannot race across tabs or Next worker processes.
// A stale lock is deliberately never stolen; an interrupted writer needs review.
export async function transaction<T>(run: () => Promise<T>): Promise<T> {
  if (web()) return memory.transaction(run);
  await fs.mkdir(studyRoot(), {recursive: true, mode: 0o700});
  const lock = filePath(".write.lock");
  const until = Date.now() + 5000;
  while (true) {
    try {
      await fs.mkdir(lock, {mode: 0o700});
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= until) throw new StudyError(503, "store_busy", "Your study record is busy. Try again; no changes were made.");
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }
  try {
    return await run();
  } finally {
    await fs.rmdir(lock);
  }
}

async function corruptionMarker(file: string) {
  try {
    const entries = await fs.readdir(path.dirname(file));
    return entries.some(name => name.startsWith(path.basename(file) + ".corrupt-"));
  } catch (error) {
    if (missing(error)) return false;
    throw error;
  }
}

export async function readJson<T extends {version: number}>(relative: string): Promise<T | null> {
  if (web()) return memory.readJson<T>(relative);
  const file = filePath(relative);
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch (error) {
    if (!missing(error)) throw error;
    if (await corruptionMarker(file)) throw new StudyError(500, "corrupt_record", `${relative} could not be read and was preserved with a .corrupt suffix. The rest of your semester is intact.`);
    return null;
  }
  let data: T;
  try {
    data = JSON.parse(text);
  } catch {
    await fs.rename(file, file + ".corrupt-" + Date.now() + "-" + randomUUID());
    throw new StudyError(500, "corrupt_record", `${relative} could not be read and was preserved with a .corrupt suffix. The rest of your semester is intact.`);
  }
  if (!data || data.version !== 1) throw new StudyError(500, "unsupported_version", `${relative} has an unknown format. No changes were made.`);
  return data;
}

export async function writeJson(relative: string, data: {version: number}) {
  if (web()) return memory.writeJson(relative, data);
  const file = filePath(relative);
  await fs.mkdir(path.dirname(file), {recursive: true, mode: 0o700});
  if (await corruptionMarker(file)) {
    // Do not recreate a missing original after a prior request quarantined it.
    try { await fs.access(file); } catch { throw new StudyError(500, "corrupt_record", `${relative} needs recovery. No replacement was written.`); }
  }
  const temporary = file + ".tmp-" + randomUUID();
  const handle = await fs.open(temporary, "wx", 0o600);
  try {
    const ordered: Record<string, unknown> = {...data};
    delete ordered.version;
    await handle.writeFile(JSON.stringify({version: 1, ...ordered}, null, 2) + "\n");
    await handle.sync();
  } finally { await handle.close(); }
  try { await fs.rename(temporary, file); }
  catch (error) { await fs.unlink(temporary).catch(() => {}); throw error; }
  const directory = await fs.open(path.dirname(file), "r");
  try { await directory.sync(); } finally { await directory.close(); }
}

export async function appendJsonl(relative: string, row: object) {
  if (web()) return memory.appendJsonl(relative, row);
  const file = filePath(relative);
  await fs.mkdir(path.dirname(file), {recursive: true, mode: 0o700});
  let previous = "";
  try { previous = await fs.readFile(file, "utf8"); }
  catch (error) { if (!missing(error)) throw error; }
  if (previous && !previous.endsWith("\n")) {
    // A new append must never glue itself onto a torn line. Preserve the
    // incomplete bytes separately and stop; do not patch or truncate history.
    const tail = previous.slice(previous.lastIndexOf("\n") + 1);
    const recovery = file + ".torn-" + Date.now() + "-" + randomUUID();
    await fs.writeFile(recovery, tail, {flag: "wx", mode: 0o600});
    throw new StudyError(500, "torn_record", `${relative} has an incomplete final line, preserved in ${path.basename(recovery)}. No new row was appended; the complete rows are intact.`);
  }
  // One append write, one full newline-terminated record, while locked.
  const handle = await fs.open(file, "a", 0o600);
  try { await handle.write(JSON.stringify(row) + "\n"); await handle.sync(); }
  finally { await handle.close(); }
}

export async function readJsonl(relative: string): Promise<Record<string, unknown>[]> {
  if (web()) return memory.readJsonl(relative);
  let raw: string;
  try { raw = await fs.readFile(filePath(relative), "utf8"); }
  catch (error) { if (missing(error)) return []; throw error; }
  const lines = raw.split("\n");
  const tail = lines.pop();
  if (tail) console.warn(`Dropped torn final line in ${relative}`);
  return lines.filter(Boolean).map(line => {
    try { return JSON.parse(line); }
    catch { throw new StudyError(500, "corrupt_record", `${relative} contains an unreadable complete line. No changes were made.`); }
  });
}
