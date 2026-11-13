import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Every other build this repo makes: the checks' own (next.config.ts) and
    // the web trial's dev server (npm run dev:web). A build is output, and
    // linting Next's own chunks reports hundreds of errors in code nobody
    // here wrote.
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "legacy/**",
    // scripts/setup-python.sh installs the course Python here, and pyright
    // ships bundled JavaScript that is not ours to lint.
    ".venv/**",
    "study/**",
  ]),
]);

export default eslintConfig;
