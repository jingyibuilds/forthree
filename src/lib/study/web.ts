import { enterRecord } from "./store-memory";

// A screen that renders on the server in the public web trial (PUBLISH.md §6).
// There is no record on the server there, and the visitor's lives in their
// browser, so the render runs inside an empty one: what it writes goes into a
// Map that is thrown away with the response. The page it produces is the
// course as someone who has not started sees it, which is the truth for a
// first visit and is labelled on the screen for every visit after.
export function withEmptyRecord<T>(run: () => Promise<T>): Promise<T> {
  if (process.env.FORTHREE_MODE !== "web") return run();
  return enterRecord(new Map(), run);
}
