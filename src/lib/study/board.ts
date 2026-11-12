import "server-only";
import { findSession, loadBlocks } from "./content";
import { readJson, writeJson } from "./store";
import { AttemptRecord, BarKey, BarState, BoardFile, Part, StudyError } from "./types";

export const TAUGHT_BLOCKS = ["A1", "A2", "A3", "A4"];

export function emptyBoard(): BoardFile {
  const board: BoardFile = {version: 1};
  for (const block of TAUGHT_BLOCKS) {
    board[block] = {judge: {state: "none", at_session: null}, build: {state: "none", at_session: null}};
  }
  return board;
}

export async function readBoard(): Promise<BoardFile> {
  const stored = await readJson<BoardFile>("board.json");
  if (!stored) return emptyBoard();
  const board = emptyBoard();
  for (const block of TAUGHT_BLOCKS) {
    const row = stored[block];
    if (row && typeof row === "object") board[block] = {...(board[block] as object), ...row} as BoardFile[string];
  }
  return board;
}

/**
 * A damaged `board.json` costs the board screen and nothing else (LESSONS
 * L-STORE-01). Every other reader — a part's done screen, the map, the gate
 * evaluation — takes this and carries on with an empty board and a flag, so
 * one unreadable file cannot stop a session from being finished.
 */
export async function readBoardSafe(): Promise<{board: BoardFile; damaged: boolean}> {
  try { return {board: await readBoard(), damaged: false}; }
  catch (error) {
    if (error instanceof StudyError && error.code === "corrupt_record") return {board: emptyBoard(), damaged: true};
    throw error;
  }
}

type Loader = (part: string) => Promise<AttemptRecord[]>;

/**
 * §17.6: two transitions, and nothing else writes here. Evaluated after every
 * part of the gate session has finished, so a block whose two gates are the
 * same session (A1's are both 9) can take both in one pass. The board reads the
 * **first passing attempt**, so a re-run after a pass changes nothing.
 */
export async function evaluateBoard(sessionNumber: number, attemptsOf: Loader) {
  const found = await findSession(sessionNumber);
  if (!found) return null;
  const blocks = await loadBlocks();
  const block = blocks.find(candidate => candidate.block === found.block);
  if (!block) return null;

  // Never evaluate onto a board that could not be read: the file is kept for
  // recovery and nothing is written over it.
  const {board, damaged} = await readBoardSafe();
  if (damaged) return {board, moved: [], block: block.block, bars: block.bars};
  const row = board[block.block] as Record<string, {state: BarState; at_session: number | null}>;
  const moved: {bar: BarKey; to: BarState}[] = [];

  const passedParts = async (predicate: (part: Part) => boolean) => {
    for (const part of found.session.parts.filter(predicate)) {
      const attempts = await attemptsOf(part.id);
      if (attempts.some(attempt => attempt.passed_at)) return true;
    }
    return false;
  };

  for (const bar of ["judge", "build"] as BarKey[]) {
    const gate = block.bars[bar];
    if (!gate) continue;
    if (gate.borrowed_gate === sessionNumber && row[bar].state === "none") {
      // "She had the task in front of her": a receipt-graded lab pass.
      if (await passedParts(part => part.kind === "lab")) {
        row[bar] = {state: "borrowed", at_session: sessionNumber};
        moved.push({bar, to: "borrowed"});
      }
    }
    if (gate.own_gate === sessionNumber && row[bar].state === "borrowed") {
      if (await passedParts(part => part.kind === "withdraw" && part.bar === bar && part.ai_allowed === false)) {
        row[bar] = {state: "own", at_session: sessionNumber};
        moved.push({bar, to: "own"});
      }
    }
  }

  if (moved.length) await writeJson("board.json", board);
  return {board, moved, block: block.block, bars: block.bars};
}
