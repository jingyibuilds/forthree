# Security

This is a public repo backing a private, single-user app. The rules below are
hard requirements, enforced by tooling where possible.

## What never enters this repo

- API keys, tokens, passwords, connection strings — of any kind, even expired
- `.env.local` or any file with real environment values (gitignored)
- PII: real names, emails, addresses
- Learning data (attempts, profiles, usage) — lives only in the owner's Supabase project
- Screenshots or logs containing any of the above

## Enforcement layers

1. **Pre-commit hook** — `gitleaks` scans staged changes and blocks the commit
   (installed by `scripts/setup.sh`).
2. **CI** — `gitleaks/gitleaks-action` re-scans full history on every push/PR.
3. **GitHub repo settings** — push protection and secret scanning enabled
   (Settings → Code security).
4. **Secrets live only in**: `.env.local` (local, gitignored) and the Vercel
   dashboard (production). `.env.example` carries placeholder names only.

## Runtime security

- Supabase Row Level Security on every table; user-scoped tables enforce
  `user_id = auth.uid()`.
- The service-role/secret key is server-only and never shipped to the client.
- All LLM calls go through one server-side route (`/api/llm`); no LLM keys or
  calls exist client-side.
- Auth is passwordless (Supabase magic link). Signup is gated by `INVITE_CODE`,
  so the deployed app stays private even though the code is public.

## If a secret ever leaks

1. Revoke/rotate the key at its provider immediately — rotation is the fix;
   history rewriting is cleanup, not remediation.
2. Then scrub git history (`git filter-repo`) and force-push.
