"use client";
import { useEffect, useState } from "react";
import BoardView, { BoardData } from "@/components/board-view";
import { studyFetch } from "@/lib/study-fetch";

// The board on the public web trial (PUBLISH.md §6). This screen exists to say
// where the visitor stands, and the record it reads is in their browser, so it
// is drawn there rather than on a server that cannot see it. Same markup, same
// rules, one fetch.
export default function BoardWeb() {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    studyFetch("/api/board", {cache: "no-store"})
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw Error(body?.message ?? "The board could not be read.");
        setData(body.data ?? body);
      })
      .catch(problem => setError(problem instanceof Error ? problem.message : "The board could not be read."));
  }, []);

  if (error) return <p className="inline miss" role="alert">{error}</p>;
  if (!data) return <p className="sub">Reading what this browser has kept…</p>;
  return <BoardView data={data} />;
}
