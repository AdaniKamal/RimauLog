# RimauLog — Vercel + Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Enable Google under Authentication → Providers and add the Google OAuth credentials.
3. Add the localhost and Vercel callback URLs shown by Supabase to Google Cloud.
4. Copy `.env.example` values into Vercel Project Settings → Environment Variables.
5. Import this repository into Vercel. Vercel will detect Next.js automatically; keep the build command as `npm run build`.
6. Sign in using `adanikamal@gmail.com`; the database invitation automatically creates the approved mentor profile.
7. Add each student Gmail address to `public.invitations`. Each student becomes approved automatically on their first Google sign-in.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit a real `.env` file.

## Required Vercel environment values

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; reserved for mentor administration)
- `NEXT_PUBLIC_SITE_URL` (your production Vercel URL)

After the first deployment, add the production callback URL to Supabase Authentication → URL Configuration, then redeploy.
