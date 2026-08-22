# RimauLog

**Tagline:** Log progress. Build capability.

RimauLog is a private multi-student mentoring workspace for a six-month cloud-security journey. A mentor can switch between students, track weekly sessions, manage assignments, maintain competency report cards, and collect GitHub-ready Markdown evidence.

## Included

- Invitation-only Google sign-in through Supabase Auth
- PKCE Google OAuth; authentication tokens are not placed in the visible URL
- Email invitations with Pending and Accepted status
- Mentor and student roles
- Separate records for every student
- Weekly sessions and focused next actions
- Detailed session agendas, outcomes, gaps, feedback and next-session plans
- Mentor timetable with student meeting requests and optional Google Calendar Appointment Schedule link
- Assignments, evidence links and feedback
- Mentor-only assignment authoring with Kahoot, Google Form or learning-resource links
- Competency progress report cards
- Mentor-set programme start/end dates, objective target, latest update and progress bar
- Markdown notes with preview and `.md` download
- Student-owned Markdown with mentor edit proposals requiring student approval
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

RimauLog has no demonstration mode and contains no sample students. Without valid Supabase environment values it shows a configuration screen and does not open the workspace. Follow [VERCEL_SETUP.md](./VERCEL_SETUP.md) to activate Google authentication and persistent records.

All students, sessions, assignments, competencies and Markdown notes shown in the interface are read from Supabase. Realtime subscriptions refresh the selected student's records after database changes.

## Security model

Google establishes identity, while Supabase invitations and database policies determine access. An account is approved only when its exact email exists in `public.invitations`. Students can access their own journey; mentors can manage students assigned to them.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit real environment files.

`SUPABASE_SERVICE_ROLE_KEY` is required in Vercel for the server-only email invitation endpoint. It must never use the `NEXT_PUBLIC_` prefix.
