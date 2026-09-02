# Supabase setup

Current schema map: [SCHEMA.md](./SCHEMA.md).

One-time steps in the [Supabase dashboard](https://supabase.com/dashboard):

1. **Create a project** (org: personal, region: closest to you, free tier).
2. **Apply the schema:** SQL Editor → paste each migration listed below, in
   order, and run it.
3. **Get the keys:** Settings → API Keys → copy *Project URL*, the *anon /
   publishable* key, and a server-only secret key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SECRET_KEY`).
4. **Auth settings:** Authentication → URL Configuration:
   - *Site URL*: your production URL (or `http://localhost:3000` until then)
   - *Redirect URLs*: add both `http://localhost:3000/**` and
     `https://YOUR-VERCEL-DOMAIN/**`
5. **Magic-link template: no change needed.** Supabase only allows editing
   email templates after configuring custom SMTP, so the app supports the
   default `{{ .ConfirmationURL }}` flow out of the box (`?code=` exchange in
   `src/app/auth/confirm/`). Note the PKCE constraint: the emailed link must
   be opened in the same browser that requested it. If custom SMTP (e.g.
   Resend) is ever added, the template can switch to the `token_hash` flow —
   also supported:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

Migrations are applied manually via the SQL Editor for now; the Supabase CLI
can take over when migration volume justifies it. Apply them in order:

1. `migrations/0001_init.sql`
2. `migrations/0002_phase1_content_in_repo.sql`
3. `migrations/0003_lesson_assistant_history.sql`
4. `migrations/0004_explicit_data_api_grants.sql`
5. `migrations/0005_server_owned_learner_profiles.sql`
6. `migrations/0006_active_lesson_time.sql`

After applying migrations, run the non-destructive preview check:

```bash
npm run check:supabase
```

The check confirms the expected tables and columns exist through the Data API
using `SUPABASE_SECRET_KEY`, and that signed-out anon access cannot reach app
tables. It does not write data or print secrets.
