#!/usr/bin/env node
// Content validator — fails the build on malformed content (DESIGN.md §4:
// the 30-minute session budget is a build-time constraint, not a suggestion).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "content");
const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const bilingual = (obj, base, file, ctx) => {
  for (const suffix of ["_en", "_zh"]) {
    if (!isStr(obj[base + suffix])) err(file, `${ctx}: missing ${base}${suffix}`);
  }
};

function* jsonFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* jsonFiles(p);
    else if (name.endsWith(".json")) yield p;
  }
}

const moduleIds = new Set();
const lessonIds = new Set();
const exerciseIds = new Set();
const lessons = [];

for (const file of jsonFiles(ROOT)) {
  const rel = file.slice(ROOT.length + 1);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    err(rel, `invalid JSON — ${e.message}`);
    continue;
  }

  if (rel.endsWith("module.json")) {
    if (!/^m\d\d$/.test(data.id)) err(rel, `bad module id "${data.id}"`);
    if (moduleIds.has(data.id)) err(rel, `duplicate module id ${data.id}`);
    moduleIds.add(data.id);
    bilingual(data, "title", rel, data.id);
    bilingual(data, "description", rel, data.id);
  } else if (rel === "stages.json") {
    bilingual(data, "course_title", rel, "course");
    bilingual(data, "course_promise", rel, "course");
    for (const s of data.stages ?? []) {
      bilingual(s, "title", rel, `stage ${s.stage}`);
      bilingual(s, "milestone", rel, `stage ${s.stage}`);
      bilingual(s, "label", rel, `stage ${s.stage}`);
    }
  } else if (/lesson-\d\d\.json$/.test(rel)) {
    lessons.push([rel, data]);
  } else {
    err(rel, "unrecognized content file (expected module.json, lesson-NN.json, or stages.json)");
  }
}

for (const [rel, l] of lessons) {
  if (!/^m\d\d-l\d\d$/.test(l.id)) err(rel, `bad lesson id "${l.id}"`);
  if (lessonIds.has(l.id)) err(rel, `duplicate lesson id ${l.id}`);
  lessonIds.add(l.id);
  if (!moduleIds.has(l.module_id)) err(rel, `unknown module_id ${l.module_id}`);
  if (!["core", "elective"].includes(l.tag)) err(rel, `bad tag "${l.tag}"`);
  if (!Number.isInteger(l.est_minutes) || l.est_minutes < 1) err(rel, "bad est_minutes");
  if (l.est_minutes > 30) err(rel, `est_minutes ${l.est_minutes} exceeds the 30-minute session budget`);
  bilingual(l, "title", rel, l.id);
  if ((l.why_en || l.why_zh) && !(isStr(l.why_en) && isStr(l.why_zh)))
    err(rel, `${l.id}: why must exist in both languages or neither`);

  const localExercises = new Map();
  for (const e of l.exercises ?? []) {
    if (!new RegExp(`^${l.id}-e\\d\\d$`).test(e.id)) err(rel, `bad exercise id "${e.id}"`);
    if (exerciseIds.has(e.id)) err(rel, `duplicate exercise id ${e.id}`);
    exerciseIds.add(e.id);
    localExercises.set(e.id, e);
    bilingual(e, "prompt", rel, e.id);
    bilingual(e, "explain", rel, e.id);
    if (![1, 2, 3].includes(e.difficulty)) err(rel, `${e.id}: bad difficulty`);
    if (!Number.isInteger(e.xp_value) || e.xp_value < 1) err(rel, `${e.id}: bad xp_value`);

    if (e.type === "mcq") {
      if (!Array.isArray(e.options_en) || !Array.isArray(e.options_zh))
        err(rel, `${e.id}: mcq needs options_en/options_zh`);
      else if (e.options_en.length !== e.options_zh.length)
        err(rel, `${e.id}: options_en/options_zh length mismatch`);
      else if (!Number.isInteger(e.answer) || e.answer < 0 || e.answer >= e.options_en.length)
        err(rel, `${e.id}: answer index out of range`);
    } else if (e.type === "fill_in") {
      const spec = e.answer_spec;
      if (!spec || (!Array.isArray(spec.accept) && !isStr(spec.regex)))
        err(rel, `${e.id}: fill_in needs answer_spec.accept[] or .regex`);
    } else {
      err(rel, `${e.id}: unknown exercise type "${e.type}" (allowed now: mcq, fill_in)`);
    }
  }

  let concepts = 0;
  for (const [i, b] of (l.blocks ?? []).entries()) {
    const ctx = `${l.id} block ${i}`;
    if (b.type === "reading") bilingual(b, "body", rel, ctx);
    else if (b.type === "concept") {
      concepts++;
      if (!isStr(b.term) || !isStr(b.term_zh)) err(rel, `${ctx}: concept needs term + term_zh`);
      bilingual(b, "anchor", rel, `${ctx} (anchor is mandatory — decision 2026-08-26)`);
      bilingual(b, "explain", rel, ctx);
    } else if (b.type === "exercise") {
      if (!localExercises.has(b.ref)) err(rel, `${ctx}: unknown exercise ref ${b.ref}`);
    } else err(rel, `${ctx}: unknown block type "${b.type}"`);
  }
  for (const id of localExercises.keys()) {
    if (!(l.blocks ?? []).some((b) => b.type === "exercise" && b.ref === id))
      err(rel, `${id} defined but never referenced by a block`);
  }
  if (l.format === "reading" && concepts === 0 && l.order !== 99)
    err(rel, `${l.id}: reading lesson has no concept blocks`);
}

if (errors.length) {
  console.error(`✖ content validation failed (${errors.length}):\n`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log(`✓ content valid: ${moduleIds.size} module(s), ${lessonIds.size} lesson(s), ${exerciseIds.size} exercise(s)`);
