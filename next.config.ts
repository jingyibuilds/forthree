import type { NextConfig } from "next";

// Her own copy, or the public web trial (PUBLISH.md §6). One variable decides
// it, for the server and for the browser, so the two halves cannot disagree
// about which one is running. On Vercel it is the trial unless something says
// otherwise: forgetting a dashboard setting would otherwise deploy the local
// app, which expects a disk it does not have there.
const mode = process.env.FORTHREE_MODE ?? (process.env.VERCEL ? "web" : "local");

const nextConfig: NextConfig = {
  // The checks and review copies build into their own folder, so a build
  // never writes where the owner's running dev server keeps its cache: on
  // 2026-11-11 that cache went bad after many builds into the same `.next`
  // (docs/MAINTENANCE.md). Unset, it is Next's default.
  ...(process.env.FORTHREE_DIST_DIR ? {distDir: process.env.FORTHREE_DIST_DIR} : {}),
  env: {NEXT_PUBLIC_FORTHREE_MODE: mode, FORTHREE_MODE: mode},
  // The course is files: sessions, the sealed bank, the lab kits. They are
  // read with process.cwd() at request time, so a serverless build has to be
  // told to carry them — without this the trial deploys and every page 500s
  // on a file that is right there in the repository.
  // "/**" and not "/**/*": Next matches these keys against the route path, so
  // the second form covers /sessions/[n] and the API routes and silently
  // covers none of /, /board, /curriculum or /reading-log.
  outputFileTracingIncludes: {"/**": ["./content/**", "./curriculum/**"]},
};

export default nextConfig;
