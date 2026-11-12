#!/usr/bin/env node
// The interface rules that reviewers kept re-measuring by hand, as assertions
// (docs/LESSONS.md, areas L-UI, L-ASK, L-ORDER, L-REC). Each check below names
// the lesson it holds. In rounds seven to nine every one of these was broken
// at least once by the repair of another, and found by a reviewer driving a
// browser; this drives the browser instead.
//
// It starts its own production server on a free port with an empty study
// record in a temporary folder — it never touches study/ — and drives
// headless Chrome over the DevTools protocol. No dependency is added: Node 22
// has fetch and WebSocket, and Chrome is the one already installed.
//
//   npm run build && node scripts/smoke-ui.mjs
//
// Without a build it stops and says so. Without Chrome it is SKIPPED, loudly,
// and exits 0 unless --require.
import {spawn} from "node:child_process";
import {existsSync, mkdtempSync, rmSync} from "node:fs";
import {createServer} from "node:net";
import os from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const required = process.argv.includes("--require");
const PEACOCK = "rgb(18, 111, 103)";

if (!existsSync(CHROME)) {
  console.log(`smoke-ui: SKIPPED — Chrome is not at ${CHROME} (set CHROME_PATH). No screen was checked.`);
  process.exit(required ? 1 : 0);
}
if (!existsSync(join(root, ".next/BUILD_ID"))) {
  console.error("smoke-ui: there is no production build. Run `npm run build` first; this checks what a build serves.");
  process.exit(1);
}

const sleep = ms => new Promise(done => setTimeout(done, ms));
const freePort = () => new Promise(done => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1", () => { const {port} = probe.address(); probe.close(() => done(port)); });
});

// ---- the app, on its own port and its own empty record ----
const store = mkdtempSync(join(os.tmpdir(), "forthree-smoke-store-"));
const profile = mkdtempSync(join(os.tmpdir(), "forthree-smoke-chrome-"));
const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {cwd: root, env: {...process.env, FORTHREE_STUDY_ROOT: store}, stdio: "ignore"});
let chrome;
const stop = () => {
  server.kill();
  chrome?.kill();
  for (const folder of [store, profile]) { try { rmSync(folder, {recursive: true, force: true}); } catch { /* left in the temp folder */ } }
};
process.on("exit", stop);

for (let tries = 0; ; tries += 1) {
  try { if ((await fetch(origin + "/curriculum")).ok) break; } catch { /* not up yet */ }
  if (tries > 60) { console.error("smoke-ui: the server did not start."); process.exit(1); }
  await sleep(250);
}

// The study record is driven over the same routes the screens use.
async function api(path, body) {
  const response = await fetch(origin + path, body === undefined ? {} : {
    method: "POST", headers: {"content-type": "application/json", origin}, body: JSON.stringify(body),
  });
  return {status: response.status, data: await response.json().catch(() => null)};
}
const post = (part, action, body, n = 1) => api(`/api/part/${part}/attempt/${n}/${action}`, body);

// ---- Chrome, over the DevTools protocol ----
chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank"], {stdio: ["ignore", "ignore", "pipe"]});
const endpoint = await new Promise((done, fail) => {
  let seen = "";
  chrome.stderr.on("data", chunk => {
    seen += chunk;
    const found = /DevTools listening on (ws:\/\/\S+)/.exec(seen);
    if (found) done(found[1]);
  });
  setTimeout(() => fail(new Error("Chrome did not open its DevTools port")), 15000);
});
const socket = new WebSocket(endpoint);
await new Promise(done => socket.addEventListener("open", done, {once: true}));
let nextId = 0;
const waiting = new Map();
const writes = [];      // every request that is not a GET
const exceptions = [];  // every uncaught error in a page
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message); waiting.delete(message.id); }
  if (message.method === "Network.requestWillBeSent" && message.params.request.method !== "GET") {
    writes.push(`${message.params.request.method} ${new URL(message.params.request.url).pathname}`);
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.exception?.description ?? "uncaught error");
});
let sessionId;
const send = (method, params = {}) => new Promise((done, fail) => {
  const id = nextId += 1;
  waiting.set(id, message => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
  socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
});
const {targetId} = await send("Target.createTarget", {url: "about:blank"});
({sessionId} = await send("Target.attachToTarget", {targetId, flatten: true}));
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");

const view = (width, height) => send("Emulation.setDeviceMetricsOverride", {width, height, deviceScaleFactor: 1, mobile: false});
async function js(expression) {
  const result = await send("Runtime.evaluate", {expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "evaluation failed");
  return result.result.value;
}
/** Open a page and wait until the app has drawn it. */
async function open(path, ready = ".study-body") {
  await send("Page.navigate", {url: origin + path});
  for (let tries = 0; tries < 80; tries += 1) {
    await sleep(100);
    const drawn = await js(`return !!document.querySelector(${JSON.stringify(ready)}) && !document.querySelector('[role=status]')?.textContent?.includes('Opening')`).catch(() => false);
    if (drawn) { await sleep(150); return; }
  }
  throw new Error(`${path} did not draw ${ready}`);
}

// Helpers that run in the page.
const PAGE = `
  const rect = el => { const b = el.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height}; };
  const shown = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const hits = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  const all = selector => [...document.querySelectorAll(selector)].filter(shown);
`;
const results = [];
const check = (lesson, name, pass, detail = "") => results.push({lesson, name, pass: !!pass, detail});

/** The rules that hold on every screen. */
async function everyScreen(label) {
  const facts = await js(`${PAGE}
    const main = document.querySelector('.study-body');
    const controls = ['.go', '.bk', '.nav', '.chip', '.hererow', '.fab'];
    return {
      filled: all('.study-body .go').filter(el => !el.disabled).map(el => el.innerText.trim()),
      // A flex or grid container lays its children out itself, and reports
      // them as blocks; anywhere else an icon must be inline.
      blockIcons: all('svg.ic').filter(el => getComputedStyle(el).display !== 'inline-block'
        && !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(getComputedStyle(el.parentElement).display)).length,
      sideways: document.documentElement.scrollWidth - innerWidth,
      cjk: (document.body.innerText.match(/[\\u3400-\\u9fff]/g) ?? []).length,
      offLinks: all('a').filter(el => !controls.some(c => el.matches(c)) && getComputedStyle(el).color !== ${JSON.stringify(PEACOCK)}).map(el => el.innerText.trim().slice(0, 40)),
      column: main ? Math.round(rect(main).w) : 0,
      emptyPanels: all('.panel .panel-body').filter(el => !el.innerText.trim()).length,
    };`);
  check("L-UI-03", `${label}: at most one filled action`, facts.filled.length <= 1, facts.filled.join(" | "));
  check("L-UI-02", `${label}: every icon sits in its line of text`, facts.blockIcons === 0, `${facts.blockIcons} block-level icons`);
  check("L-UI-07", `${label}: no sideways scroll at desktop width`, facts.sideways <= 0, `${facts.sideways}px`);
  check("L-AUTH-08", `${label}: English only`, facts.cjk === 0, `${facts.cjk} CJK characters`);
  check("L-UI-04", `${label}: every link looks like a link`, facts.offLinks.length === 0, facts.offLinks.join(" | "));
  check("L-UI-03", `${label}: no panel is a header over an empty box`, facts.emptyPanels === 0);
  return facts;
}

/** Ask floats: inside the viewport, and on top of nothing she needs to press. */
async function askFloats(label) {
  for (const height of [760, 860, 980]) {
    await view(1280, height);
    await sleep(120);
    const facts = await js(`${PAGE}
      scrollTo(0, 0);
      const pill = document.querySelector('.fab'), why = document.querySelector('.askwhy');
      if (!pill) return {missing: true};
      const over = [pill, why].filter(Boolean).map(rect);
      const pressed = all('.study-body .go, .study-body button:not(.fab)').filter(el => !el.disabled);
      return {
        inside: rect(pill).b <= innerHeight && rect(pill).t >= 0,
        whyWidth: why ? Math.round(rect(why).w) : null,
        covered: pressed.filter(el => over.some(o => hits(rect(el), o))).map(el => el.innerText.trim().slice(0, 30)),
      };`);
    // Called only where Ask belongs: its absence is a failure, not a pass.
    check("L-UI-05", `${label} @${height}: Ask is on the screen`, !facts.missing);
    if (facts.missing) continue;
    check("L-UI-05", `${label} @${height}: Ask is inside the viewport`, facts.inside);
    check("L-UI-05", `${label} @${height}: Ask sits on no button`, facts.covered.length === 0, facts.covered.join(" | "));
    if (facts.whyWidth !== null) check("L-UI-05", `${label} @${height}: the reason card is 220px wide`, facts.whyWidth === 220, `${facts.whyWidth}px`);
  }
  await view(1280, 900);
}

try {
  await view(1280, 900);

  // ---- first run ----
  await open("/");
  const first = await everyScreen("Today, first run");
  check("L-UI-03", "Today, first run: the one action is Begin", first.filled.join() === "Begin", first.filled.join(" | "));
  await askFloats("Today, first run");

  // ---- the map ----
  await open("/curriculum");
  await everyScreen("the map");
  const map = await js(`${PAGE}
    // The session rows: every table but the capstone's, whose rows are sizes.
    const rows = [...document.querySelectorAll('table.wk tr')].filter(row => /^[0-9]+$/.test(row.querySelector('.wn')?.innerText.trim() ?? ''));
    return {
      here: all('.here').length,
      written: rows.filter(row => !row.innerText.includes('not written yet')).map(row => !!row.querySelector('a')),
      rows: rows.filter(row => !row.innerText.includes('not written yet') && !row.querySelector('a')).map(row => row.innerText.slice(0, 60)),
      unwritten: rows.filter(row => row.innerText.includes('not written yet')).filter(row => row.querySelector('a')).length,
    };`);
  check("L-UI-03", "the map: exactly one 'you are here'", map.here === 1, String(map.here));
  check("L-ORDER-05", "the map: every written session's title is a link", map.written.length > 0 && map.written.every(Boolean), JSON.stringify(map.rows));
  check("L-UI-04", "the map: an unwritten row is not a link", map.unwritten === 0);
  await js(`scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 150));`);
  check("L-UI-05", "the map: Ask follows the viewport to the foot of a long page",
    await js(`const b = document.querySelector('.fab').getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0;`));

  // ---- a session ahead: there to read, not to start ----
  await open("/sessions/3");
  const ahead = await everyScreen("a session ahead");
  const preview = await js(`return {notice: document.querySelector('.viewing')?.innerText ?? '', partLinks: document.querySelectorAll('.prow a').length};`);
  check("L-ORDER-05", "a session ahead: says she is looking ahead", preview.notice.includes("looking ahead"), preview.notice);
  check("L-ORDER-05", "a session ahead: nothing to start", ahead.filled.length === 0 && preview.partLinks === 0, `${ahead.filled.join("|")} / ${preview.partLinks} part links`);
  await open("/session/s03-lab-a", "[role=alert]");
  check("L-ORDER-05", "a part that is not open says what it waits for",
    (await js(`return document.querySelector('[role=alert]').innerText;`)).includes("opens once"));
  check("L-ORDER-04", "looking, and a refused start, start nothing", (await api("/api/study/current")).data.plan.current_attempt["s03-lab-a"] === undefined);

  // ---- the lab, before and after the guess is locked ----
  await open("/session/s01-lab-a");
  await everyScreen("the lab, guess open");
  check("L-ASK-02", "the lab, guess open: Ask is off, with its reason",
    await js(`return document.querySelector('.fab')?.disabled === true && !!document.querySelector('.askwhy')?.innerText.trim();`));
  await post("s01-lab-a", "seal", {choice: 0, why: "A new folder might find a newer tool."});
  await open("/session/s01-lab-a");
  const locked = await everyScreen("the lab, guess locked");
  check("L-ASK-01", "the lab, guess locked: Ask is on, on step 1",
    await js(`const pill = document.querySelector('.fab'); return !!pill && !pill.disabled;`));
  await js(`document.querySelector('.fab').click(); await new Promise(r => setTimeout(r, 250));`);
  const panel = await js(`${PAGE}
    const el = document.querySelector('.askpanel');
    return el ? {w: Math.round(rect(el).w), inside: rect(el).t >= 0 && rect(el).b <= innerHeight, text: el.innerText, column: Math.round(rect(document.querySelector('.study-body')).w)} : null;`);
  check("L-UI-09", "the open Ask panel is 330px wide and inside the viewport", panel?.w === 330 && panel?.inside, JSON.stringify(panel && {w: panel.w, inside: panel.inside}));
  check("L-ASK-03", "the open Ask panel says it is not switched on, before she types", !!panel?.text.includes("not switched on"));
  check("L-AUTH-09", "the open Ask panel lists the words this part uses", !!panel?.text.includes("Words this part uses"));
  check("L-UI-05", "the content column is the same width with Ask off, on and open",
    first.column === locked.column && locked.column === panel?.column, `${first.column} / ${locked.column} / ${panel?.column}`);

  // ---- coming back to Today with a part in progress ----
  await open("/");
  const resumed = await everyScreen("Today, lab in progress");
  check("L-UI-03", "Today, lab in progress: the one action is Pick it up", resumed.filled.join() === "Pick it up", resumed.filled.join(" | "));
  await askFloats("Today, lab in progress");

  // ---- a finished part is read-only, and reading it writes nothing ----
  await post("s01-lab-a", "step", {step: "attempt"});
  await post("s01-lab-a", "task/0", {did_pass: true});
  await post("s01-lab-a", "receipt", {raw: "$ uname -m\narm64\n$ python3 -c \"import platform; print(platform.machine())\"\nx86_64"});
  for (const step of ["compare", "record"]) await post("s01-lab-a", "step", {step});
  await post("s01-lab-a", "label", {label: 1});
  const finished = await post("s01-lab-a", "step", {step: "done"});
  check("L-REC-03", "(setup) the lab finished through the routes", finished.status === 200 && !!finished.data?.record?.finished_at, String(finished.status));
  await open("/session/s01-lab-a");
  check("L-REC-03", "a finished part opens on its done screen",
    (await js(`return document.querySelector('.study-body h1')?.innerText ?? '';`)).includes("This part is done"));
  writes.length = 0;
  const reread = await js(`
    const wait = () => new Promise(r => setTimeout(r, 200));
    [...document.querySelectorAll('button')].find(b => b.innerText.includes('Back to the last step')).click(); await wait();
    let live = 0;
    for (const position of [2, 1, 0, 1, 2, 3]) {
      const pips = document.querySelectorAll('.pip');
      if (!pips[position]) continue;
      pips[position].click(); await wait();
      live += [...document.querySelectorAll('.study-body input, .study-body textarea')].filter(el => !el.disabled && !el.readOnly).length;
    }
    return {live};`);
  check("L-REC-03", "re-reading a finished part: no field takes an answer", reread.live === 0, `${reread.live} live fields`);
  check("L-REC-03", "re-reading a finished part: nothing is written", writes.length === 0, writes.join(" | "));
  await everyScreen("a finished lab, re-read");
  // Each of its steps, as she would re-read it: the same rules on every one.
  for (const position of [0, 1, 2, 3]) {
    const there = await js(`const pip = document.querySelectorAll('.pip')[${position}]; if (!pip) return false; pip.click(); await new Promise(r => setTimeout(r, 200)); return true;`);
    if (there) await everyScreen(`a finished lab, step ${position + 1}`);
  }

  // ---- Today once the lab is done: the next part, and the lab as a link ----
  await open("/");
  const after = await everyScreen("Today, lab done");
  const rows = await js(`return [...document.querySelectorAll('.prow')].map(row => ({now: row.classList.contains('now'), link: !!row.querySelector('a'), text: row.innerText}));`);
  check("L-UI-03", "Today, lab done: the one action starts the next part", after.filled.join() === "Start", after.filled.join(" | "));
  check("L-COPY-02", "Today, lab done: the finished lab is a link that says done", rows[0]?.link && rows[0].text.includes("done") && !rows[0].now);
  check("L-ORDER-05", "Today, lab done: only the next part is open", rows[1]?.now && rows[1].link && rows[2] && !rows[2].link);

  // ---- the other part kinds, each opened as she would meet it ----
  await open("/session/s01-interview-a");
  await everyScreen("the interview");
  check("L-ASK-01", "the interview: Ask is not on the screen (its three questions are the conversation)", await js(`return !document.querySelector('.fab');`));
  check("L-AUTH-05", "the interview shows its program and three questions",
    await js(`return !!document.querySelector('.study-body pre') && document.querySelectorAll('.study-body textarea').length === 3;`));
  await post("s01-interview-a", "answers", {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
  const talked = await post("s01-interview-a", "step", {step: "done"});
  check("L-GATE-04", "(setup) the interview finished through the routes", talked.status === 200, String(talked.status));
  await open("/session/s01-withdraw-a");
  await everyScreen("the no-help check");
  check("L-ASK-01", "the no-help check: Ask is not on the screen at all", await js(`return !document.querySelector('.fab');`));
  check("L-GATE-01", "the no-help check: one question at a time, 0 of 3 answered, one box to type in",
    await js(`return document.querySelectorAll('.study-body textarea').length === 1 && document.querySelector('.study-body').innerText.includes('0 of 3 answered');`));

  // ---- the board ----
  await open("/board");
  await everyScreen("the board");
  check("L-COPY-01", "the board: eight skills, no percentages",
    await js(`return document.querySelectorAll('.bar2').length === 8 && !document.querySelector('.study-body').innerText.includes('%');`));

  check("L-UI-01", "no screen threw an error", exceptions.length === 0, exceptions.join(" | ").slice(0, 300));
} catch (error) {
  check("smoke", "the smoke test ran to the end", false, error instanceof Error ? error.message : String(error));
}

// The number of checks is part of the result: a scenario that silently stops
// running would otherwise read as a pass. Raise this when checks are added.
const EXPECTED_AT_LEAST = 141;
if (results.length < EXPECTED_AT_LEAST) check("smoke", `at least ${EXPECTED_AT_LEAST} checks ran`, false, `${results.length} ran`);
const failed = results.filter(result => !result.pass);
for (const result of failed) console.error(`FAIL  ${result.lesson}  ${result.name}${result.detail ? `  [${result.detail}]` : ""}`);
console.log(`smoke-ui: ${results.length - failed.length} of ${results.length} interface checks pass${failed.length ? "" : " (desktop, 1280px; Chrome headless)"}.`);
socket.close();
process.exit(failed.length ? 1 : 0);
