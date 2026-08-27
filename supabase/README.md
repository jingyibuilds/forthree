# Supabase setup (Phase 0)

One-time steps in the [Supabase dashboard](https://supabase.com/dashboard):

1. **Create a project** (org: personal, region: closest to you, free tier).
2. **Apply the schema:** SQL Editor → paste the contents of
   `migrations/0001_init.sql` → Run.
3. **Get the keys:** Settings → API → copy *Project URL* and the *anon /
   publishable* key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. **Auth settings:** Authentication → URL Configuration:
   - *Site URL*: your production URL (or `http://localhost:3000` until then)
   - *Redirect URLs*: add both `http://localhost:3000/**` and
     `https://YOUR-VERCEL-DOMAIN/**`
5. **Magic-link template:** Authentication → Emails → *Magic Link* — replace the
   default `{{ .ConfirmationURL }}` link with:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

   (Required for the server-side `verifyOtp` flow in `src/app/auth/confirm/`.)

Migrations are applied manually via the SQL Editor for now; the Supabase CLI
can take over when migration volume justifies it.
