// Her own copy, or the public web trial (PUBLISH.md §6). One variable decides
// it, set in next.config.ts from FORTHREE_MODE, so the server and the browser
// cannot disagree about which one is running.
export const WEB = process.env.NEXT_PUBLIC_FORTHREE_MODE === "web";
