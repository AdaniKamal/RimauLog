# RimauLog

RimauLog is a private multi-student mentoring workspace for a six-month cloud-security journey. A mentor can switch between students, track weekly sessions, manage assignments, maintain competency report cards, and collect GitHub-ready Markdown evidence.

## Project status

| Item                | Current status                                               |
| ------------------- | ------------------------------------------------------------ |
| Current version     | **v9.1**                                                     |
| Release stage       | Usable beta / active development                             |
| Last updated        | 22 August 2026                                               |
| Hosting             | Vercel                                                       |
| Database            | Supabase PostgreSQL                                          |
| Authentication      | Google OAuth through Supabase (PKCE)                         |
| Access              | Invitation-only, with mentor and student roles               |
| Invitation delivery | Manual link sharing                                          |
| Data mode           | Live Supabase data only; no demo students or automatic login |

## Version history

| Version | Date           | Project update                                                                                                                                                                                                                                  | Database action                                                                    |
| ------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| v1.0    | August 2026    | Initial interface prototype with a single sample student and demo data. Historical version only.                                                                                                                                                | None                                                                               |
| v2.0    | August 2026    | Removed demo mode, sample students and automatic login. Connected the workspace to Supabase and Google sign-in.                                                                                                                                 | Run `supabase/schema.sql` for a new project                                        |
| v3.0    | August 2026    | Added the invitation workflow, Pending/Accepted states, and Privacy and Terms pages.                                                                                                                                                            | None                                                                               |
| v4.0    | August 2026    | Corrected the invitation acceptance lifecycle and student access status.                                                                                                                                                                        | Run `supabase/upgrade-invitation-status.sql` when upgrading from an older database |
| v5.0    | August 2026    | Added PKCE Google OAuth and removed authentication tokens from the visible URL.                                                                                                                                                                 | None                                                                               |
| v6.0    | August 2026    | Added secure, single-use invitation confirmation using `token_hash`.                                                                                                                                                                            | None                                                                               |
| v7.0    | August 2026    | Expanded timetable, sessions, report cards, assignments, programme dates, progress bars and student-owned notes with mentor change approval.                                                                                                    | Run `supabase/upgrade-mentoring-workspace.sql`                                     |
| v7.1    | August 2026    | Fixed expanded student-profile fields loading in the student view.                                                                                                                                                                              | None                                                                               |
| v8.0    | 22 August 2026 | Added the monthly availability calendar, constrained meeting requests, multiple notes, competency selectors, comment deletion, and session editing/deletion.                                                                                    | Run `supabase/upgrade-monthly-workflow.sql`                                        |
| v8.1    | 22 August 2026 | Added project-status and version-history documentation and clarified the manual invitation workflow.                                                                                                                                            | None                                                                               |
| v9.0    | 22 August 2026 | Added the mentor dashboard, consistent per-student progress, report-card history, identifiable timetable requests and notifications, deletable calendar activity, rich note formatting with Markdown preview, and assignment filtering/sorting. | Run `supabase/upgrade-v9-dashboard-history.sql`                                    |
| v9.1    | 22 August 2026 | Corrected mentor-dashboard status to use each student's mentorship timeline and fixed the sidebar logo alignment.                                                                                                                               | None                                                                               |

For an existing deployment, run only the migration files that have not already been applied. Do not rerun a completed migration simply because the README version changed.

## Included

- Invitation-only Google sign-in through Supabase Auth
- PKCE Google OAuth; authentication tokens are not placed in the visible URL
- Manual invitation approval with Pending and Accepted access status
- Mentor and student roles
- Separate records for every student
- Weekly sessions and focused next actions
- Detailed session agendas, outcomes, gaps, feedback and next-session plans
- Mentor timetable with student meeting requests and optional Google Calendar Appointment Schedule link
- Monthly calendar view with free, blocked, requested and confirmed time markers
- Assignments, evidence links and feedback
- Mentor-only assignment authoring with Kahoot, Google Form or learning-resource links
- Competency progress report cards
- Mentor-set programme start/end dates, objective target, latest update and progress bar
- Predefined competency categories with collapsible assessments and removable comments
- Simple Notes workspace with a formatting toolbar, default preview and `.md` download
- Mentor dashboard with registered, in-progress and completed student counts
- Ordered report-card history table for every saved update
- Assignment status filters and ascending/descending due-date sorting
- Student-owned Markdown with mentor edit proposals requiring student approval
- Multiple student notes with explicit `+ New note`; mentors can view the complete note list
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

The default RimauLog interface uses manual link sharing and does not require `SUPABASE_SERVICE_ROLE_KEY`. The key is needed only if you later enable the optional server-side email invitation endpoint, and it must never use the `NEXT_PUBLIC_` prefix.
