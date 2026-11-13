"use client";
import { useRef, useState } from "react";
import { readRecord, writeRecord } from "@/lib/study-fetch";

// The web trial keeps the visitor's record in this browser and nowhere else
// (PUBLISH.md §6), so clearing site data is starting over. Rather than hide
// that, the trial says it and hands them the file: one download to keep a
// place, one upload to get it back, on this machine or another.
export default function RecordKeeper() {
  const file = useRef<HTMLInputElement>(null);
  const [said, setSaid] = useState("");

  function download() {
    const record = readRecord();
    if (!Object.keys(record).length) { setSaid("There is nothing to save yet."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "forthree-record.json";
    link.click();
    URL.revokeObjectURL(url);
    setSaid("Saved. Load that file here to come back to this point.");
  }

  async function load(chosen: File) {
    try {
      const parsed = JSON.parse(await chosen.text()) as Record<string, unknown>;
      const kept = Object.entries(parsed).filter(([, value]) => typeof value === "string");
      if (!kept.length) throw Error("empty");
      writeRecord(Object.fromEntries(kept) as Record<string, string>);
      setSaid("Loaded. Open a session and it picks up from there.");
    } catch {
      setSaid("That file is not a record this trial wrote.");
    }
  }

  function startOver() {
    writeRecord({});
    setSaid("Cleared. Nothing of what you did is left in this browser.");
  }

  return (
    <div className="keeper">
      <div className="row">
        <button className="secondary" onClick={download}>Save my record</button>
        <button className="secondary" onClick={() => file.current?.click()}>Load a record</button>
        <button className="secondary" onClick={startOver}>Start over</button>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={event => { const chosen = event.target.files?.[0]; if (chosen) void load(chosen); }}
        />
      </div>
      {said && <p className="hint" role="status">{said}</p>}
    </div>
  );
}
