# RimauLog

**Tagline:** Log progress. Build capability.

RimauLog is a private multi-student mentoring workspace for a six-month cloud-security journey. A mentor can switch between students, track weekly sessions, manage assignments, maintain competency report cards, and collect GitHub-ready Markdown evidence.

## Included

- Invitation-only Google sign-in through Supabase Auth
- Mentor and student roles
- Separate records for every student
- Weekly sessions and focused next actions
- Assignments, evidence links and feedback
- Competency progress report cards
- Markdown notes with preview and `.md` download
- Supabase Row Level Security policies
- Responsive desktop and mobile interface

## Stack

- Next.js 16
- React 19
- Supabase Auth and PostgreSQL
- Vercel

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Without Supabase environment values, the app opens in demonstration mode. Follow [VERCEL_SETUP.md](./VERCEL_SETUP.md) to activate Google authentication and persistent records.

## Security model

Google establishes identity, while Supabase invitations and database policies determine access. An account is approved only when its exact email exists in `public.invitations`. Students can access their own journey; mentors can manage students assigned to them.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit real environment files.
