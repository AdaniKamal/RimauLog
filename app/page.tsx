"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate, { useRimauLog, type Profile } from "./auth-gate";
type View =
  | "overview"
  | "students"
  | "timetable"
  | "sessions"
  | "report"
  | "tasks"
  | "notes";
type Student = Profile & {
  mentorship_start?: string | null;
  mentorship_end?: string | null;
  calendar_booking_url?: string | null;
};
type Session = {
  id: string;
  session_number: number;
  title: string;
  scheduled_at: string | null;
  status: string;
  topics: string | null;
  learning_outcomes: string | null;
  knowledge_gaps: string | null;
  mentor_feedback: string | null;
  mentee_reflection: string | null;
  next_session_plan: string | null;
};
type Assignment = {
  id: string;
  title: string;
  objective: string | null;
  instructions: string | null;
  resource_url: string | null;
  due_at: string | null;
  status: string;
  mentor_feedback: string | null;
  completed_at: string | null;
};
type Skill = {
  id: string;
  name: string;
  level: string;
  progress: number;
  mentor_comment: string | null;
};
type Note = {
  id: string;
  author_id: string;
  title: string;
  body_markdown: string;
  proposed_body_markdown: string | null;
  proposal_status: string;
  updated_at: string;
};
type Report = {
  id?: string;
  objective_target: string | null;
  latest_student_update: string | null;
  mentor_comment: string | null;
  progress_percent: number;
};
type ReportHistory = Report & {
  id: string;
  mentee_id: string;
  created_at: string;
};
type Slot = {
  id: string;
  mentor_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  booked_by: string | null;
};
type MeetingRequest = {
  id: string;
  availability_id: string;
  mentor_id: string;
  mentee_id: string;
  requested_start: string;
  requested_end: string;
  status: string;
};
const nav: [View, string, string][] = [
  ["overview", "Overview", "⌂"],
  ["students", "Students", "♙"],
  ["timetable", "Timetable", "◷"],
  ["sessions", "Sessions", "◫"],
  ["report", "Report card", "◎"],
  ["tasks", "Assignments", "✓"],
  ["notes", "Notes", "✎"],
];
export default function Home() {
  return (
    <AuthGate>
      <Workspace />
    </AuthGate>
  );
}
function Workspace() {
  const app = useRimauLog()!,
    { client, profile } = app,
    [view, setView] = useState<View>("overview"),
    [students, setStudents] = useState<Student[]>([]),
    [selected, setSelected] = useState(""),
    [sessions, setSessions] = useState<Session[]>([]),
    [tasks, setTasks] = useState<Assignment[]>([]),
    [skills, setSkills] = useState<Skill[]>([]),
    [notes, setNotes] = useState<Note[]>([]),
    [report, setReport] = useState<Report>({
      objective_target: "",
      latest_student_update: "",
      mentor_comment: "",
      progress_percent: 0,
    }),
    [reportHistory, setReportHistory] = useState<ReportHistory[]>([]),
    [allReports, setAllReports] = useState<ReportHistory[]>([]),
    [slots, setSlots] = useState<Slot[]>([]),
    [requests, setRequests] = useState<MeetingRequest[]>([]),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState("");
  const studentId = profile.role === "student" ? profile.id : selected,
    student = students.find((s) => s.id === studentId);
  const notify = (x: string) => {
    setToast(x);
    setTimeout(() => setToast(""), 3000);
  };
  const loadStudents = useCallback(async () => {
    if (profile.role === "student") {
      const { data, error } = await client
        .from("profiles")
        .select(
          "id,email,full_name,role,approved,mentor_id,mentorship_start,mentorship_end,calendar_booking_url",
        )
        .eq("id", profile.id)
        .single();
      if (error) notify(error.message);
      setStudents([(data || profile) as Student]);
      setSelected(profile.id);
      return;
    }
    const { data, error } = await client
      .from("profiles")
      .select(
        "id,email,full_name,role,approved,mentor_id,mentorship_start,mentorship_end,calendar_booking_url",
      )
      .eq("role", "student")
      .eq("mentor_id", profile.id);
    if (error) notify(error.message);
    const rows = (data || []) as Student[];
    setStudents(rows);
    setSelected((v) => (rows.some((x) => x.id === v) ? v : rows[0]?.id || ""));
  }, [client, profile]);
  const loadRecords = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setSessions([]);
    setTasks([]);
    setSkills([]);
    setNotes([]);
    setReport({
      objective_target: "",
      latest_student_update: "",
      mentor_comment: "",
      progress_percent: 0,
    });
    setReportHistory([]);
    const mentorId =
      profile.role === "mentor" ? profile.id : profile.mentor_id || "";
    const [a, b, c, d, e, f, g, h, i] = await Promise.all([
      client
        .from("sessions")
        .select("*")
        .eq("mentee_id", studentId)
        .order("session_number"),
      client
        .from("assignments")
        .select("*")
        .eq("mentee_id", studentId)
        .order("created_at", { ascending: false }),
      client
        .from("competencies")
        .select("*")
        .eq("mentee_id", studentId)
        .order("name"),
      client
        .from("notes")
        .select("*")
        .eq("mentee_id", studentId)
        .order("updated_at", { ascending: false }),
      client
        .from("progress_reports")
        .select("*")
        .eq("mentee_id", studentId)
        .maybeSingle(),
      client
        .from("availability_slots")
        .select("*")
        .eq("mentor_id", mentorId)
        .order("starts_at"),
      client
        .from("meeting_requests")
        .select("*")
        .eq("mentor_id", mentorId)
        .order("requested_start"),
      client
        .from("progress_report_history")
        .select("*")
        .eq("mentee_id", studentId)
        .order("created_at", { ascending: false }),
      profile.role === "mentor"
        ? client
            .from("progress_reports")
            .select("*")
            .eq("mentor_id", profile.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const err =
      a.error ||
      b.error ||
      c.error ||
      d.error ||
      e.error ||
      f.error ||
      g.error ||
      h.error ||
      i.error;
    if (err) notify(err.message);
    setSessions((a.data || []) as Session[]);
    setTasks((b.data || []) as Assignment[]);
    setSkills((c.data || []) as Skill[]);
    setNotes((d.data || []) as Note[]);
    setReport(
      (e.data as Report) || {
        objective_target: "",
        latest_student_update: "",
        mentor_comment: "",
        progress_percent: 0,
      },
    );
    setSlots((f.data || []) as Slot[]);
    setRequests((g.data || []) as MeetingRequest[]);
    setReportHistory((h.data || []) as ReportHistory[]);
    setAllReports((i.data || []) as ReportHistory[]);
    setLoading(false);
  }, [client, studentId, profile]);
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);
  useEffect(() => {
    if (!studentId) return;
    const ch = client
      .channel(`workspace-${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public" }, loadRecords)
      .subscribe();
    return () => {
      client.removeChannel(ch);
    };
  }, [client, studentId, loadRecords]);
  const role = profile.role,
    name = profile.full_name || profile.email.split("@")[0],
    journey = journeyProgress(
      student?.mentorship_start,
      student?.mentorship_end,
    ),
    pending = requests.filter((r) => r.status === "requested").length;
  return (
    <main className="shell">
      <aside>
        <div className="brand">
          <div className="brand-title">
            <b>R</b>
            <strong>RimauLog</strong>
          </div>
          <small>Log progress. Build capability.</small>
        </div>
        <nav>
          {nav
            .filter((n) => role === "mentor" || n[0] !== "students")
            .map((n) => (
              <button
                key={n[0]}
                className={view === n[0] ? "on" : ""}
                onClick={() => setView(n[0])}
              >
                <span>{n[2]}</span>
                {n[1]}
                {n[0] === "timetable" && pending > 0 && <em>{pending}</em>}
              </button>
            ))}
        </nav>
        <div className="program">
          <small>{student ? "SELECTED STUDENT" : "NO STUDENT SELECTED"}</small>
          <strong>
            {student?.full_name || student?.email || "Add your first student"}
          </strong>
          {student && journey > 0 && (
            <>
              <i>
                <b style={{ width: `${journey}%` }} />
              </i>
              <span>{journey}% of mentoring timeline</span>
            </>
          )}
        </div>
        <div className="me">
          <b>{initials(name)}</b>
          <div>
            <strong>{name}</strong>
            <small>{role === "mentor" ? "Mentor · Admin" : "Student"}</small>
          </div>
        </div>
      </aside>
      <section className="work">
        <header>
          <div>
            <small>{role.toUpperCase()} WORKSPACE</small>
            <h1>{nav.find((n) => n[0] === view)?.[1]}</h1>
          </div>
          <div className="header-tools">
            {role === "mentor" && students.length > 0 && (
              <select
                aria-label="Select student"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.email}
                  </option>
                ))}
              </select>
            )}
            <button className="soft" onClick={() => client.auth.signOut()}>
              Sign out
            </button>
          </div>
        </header>
        <div className="page">
          {loading ? (
            <Empty
              title="Loading live records…"
              text="Your existing data is being loaded securely."
            />
          ) : !student ? (
            <Empty
              title="No active student"
              text="Invite a student and ask them to sign in with their approved Google account."
            />
          ) : view === "overview" ? (
            <Overview
              student={student}
              report={report}
              sessions={sessions}
              tasks={tasks}
              journey={journey}
              role={role}
              students={students}
              allReports={allReports}
            />
          ) : view === "students" ? (
            <Students
              rows={students}
              selected={selected}
              choose={setSelected}
              reload={loadStudents}
              notify={notify}
            />
          ) : view === "timetable" ? (
            <Timetable
              student={student}
              students={students}
              slots={slots}
              reload={loadRecords}
              notify={notify}
            />
          ) : view === "sessions" ? (
            <Sessions
              studentId={studentId}
              rows={sessions}
              reload={loadRecords}
              notify={notify}
            />
          ) : view === "report" ? (
            <ReportCard
              student={student}
              report={report}
              history={reportHistory}
              skills={skills}
              reload={loadRecords}
              notify={notify}
            />
          ) : view === "tasks" ? (
            <Assignments
              studentId={studentId}
              rows={tasks}
              reload={loadRecords}
              notify={notify}
            />
          ) : (
            <Notes
              studentId={studentId}
              rows={notes}
              reload={loadRecords}
              notify={notify}
            />
          )}
        </div>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
function Overview({
  student,
  report,
  sessions,
  tasks,
  journey,
  role,
  students,
  allReports,
}: {
  student: Student;
  report: Report;
  sessions: Session[];
  tasks: Assignment[];
  journey: number;
  role: "mentor" | "student";
  students: Student[];
  allReports: ReportHistory[];
}) {
  const progressFor = (id: string) =>
      allReports.find((r) => r.mentee_id === id)?.progress_percent || 0,
    completed = students.filter((s) => progressFor(s.id) >= 100).length,
    inProgress = students.filter((s) => {
      const p = progressFor(s.id);
      return p > 0 && p < 100;
    }).length,
    registered = students.filter((s) => progressFor(s.id) === 0).length;
  return (
    <>
      {role === "mentor" && (
        <>
          <Intro
            title="Mentor dashboard"
            text="A clear view of every active mentoring journey."
          />
          <div className="student-summary">
            <Stat
              icon="♙"
              label="STUDENTS"
              value={String(students.length)}
              detail="registered"
            />
            <Stat
              icon="↗"
              label="IN PROGRESS"
              value={String(inProgress)}
              detail="active journeys"
            />
            <Stat
              icon="✓"
              label="COMPLETE"
              value={String(completed)}
              detail={`${registered} not started`}
            />
          </div>
          <section className="card progress-table">
            <h3>Student progress</h3>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const p = progressFor(s.id);
                  return (
                    <tr key={s.id}>
                      <td>{s.full_name || s.email}</td>
                      <td>
                        {p === 0
                          ? "Registered"
                          : p >= 100
                            ? "Complete"
                            : "In progress"}
                      </td>
                      <td>
                        <div className="table-progress">
                          <span>{p}%</span>
                          <i>
                            <b style={{ width: `${p}%` }} />
                          </i>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
      <section className="welcome">
        <div>
          <small>
            {role === "mentor"
              ? student.full_name || student.email
              : "YOUR CURRENT OBJECTIVE"}
          </small>
          <h2>{report.objective_target || "Set the next focused objective"}</h2>
          <p>
            {report.latest_student_update ||
              "No latest student update recorded yet."}
          </p>
        </div>
        {student.mentorship_start && student.mentorship_end && (
          <div className="journey">
            <b>{journey}%</b>
            <div>
              <small>MENTORSHIP TIMELINE</small>
              <strong>
                {shortDate(student.mentorship_start)} —{" "}
                {shortDate(student.mentorship_end)}
              </strong>
            </div>
          </div>
        )}
      </section>
      <div className="stats">
        <Stat
          icon="✓"
          label="DONE"
          value={String(tasks.filter((x) => x.status === "completed").length)}
          detail={`/ ${tasks.length} assignments`}
        />
        <Stat
          icon="◫"
          label="SESSIONS"
          value={String(
            sessions.filter((x) => x.status === "completed").length,
          )}
          detail={`/ ${sessions.length} total`}
        />
        <Stat
          icon="↗"
          label="REPORT PROGRESS"
          value={`${report.progress_percent || 0}%`}
          detail="mentor assessed"
        />
      </div>
      <section className="card">
        <h3>Latest mentor comment</h3>
        <p>{report.mentor_comment || "No comment added yet."}</p>
      </section>
    </>
  );
}
function Students({
  rows,
  selected,
  choose,
  reload,
  notify,
}: {
  rows: Student[];
  selected: string;
  choose: (x: string) => void;
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [email, setEmail] = useState("");
  async function approve(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await app.client.from("invitations").upsert(
      {
        email: email.trim().toLowerCase(),
        role: "student",
        invited_by: app.profile.id,
      },
      { onConflict: "email" },
    );
    notify(
      error
        ? error.message
        : "Student approved. Share the RimauLog link manually.",
    );
    if (!error) setEmail("");
    reload();
  }
  return (
    <>
      <Intro
        title="Students"
        text="Approval only—share https://rimau-log.vercel.app manually after adding the email."
      />
      <form className="form-grid card" onSubmit={approve}>
        <Field label="Google email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <button>Add approved student</button>
      </form>
      <section className="student-list">
        {rows.map((s) => (
          <article key={s.id} className={selected === s.id ? "selected" : ""}>
            <div className="student-person">
              <b>{initials(s.full_name || s.email)}</b>
              <div>
                <strong>{s.full_name || "Student"}</strong>
                <small>{s.email}</small>
              </div>
            </div>
            <span className="status accepted">Active</span>
            <button className="soft" onClick={() => choose(s.id)}>
              Open
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
function Timetable({
  student,
  students,
  slots,
  reload,
  notify,
}: {
  student: Student;
  students: Student[];
  slots: Slot[];
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [slotStatus, setSlotStatus] = useState("free"),
    [calendar, setCalendar] = useState(student.calendar_booking_url || ""),
    [chosen, setChosen] = useState<Slot | null>(null),
    [requestStart, setRequestStart] = useState(""),
    [requestEnd, setRequestEnd] = useState(""),
    [requests, setRequests] = useState<MeetingRequest[]>([]);
  const mentorId =
    app.profile.role === "mentor"
      ? app.profile.id
      : app.profile.mentor_id || "";
  const requester = (id: string) =>
    students.find((s) => s.id === id)?.full_name ||
    students.find((s) => s.id === id)?.email ||
    "Student";
  const loadRequests = useCallback(async () => {
    const { data } = await app.client
      .from("meeting_requests")
      .select("*")
      .eq("mentor_id", mentorId)
      .order("requested_start");
    setRequests((data || []) as MeetingRequest[]);
  }, [app, mentorId]);
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await app.client.from("availability_slots").insert({
      mentor_id: app.profile.id,
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(end).toISOString(),
      status: slotStatus,
    });
    notify(error ? error.message : `${pretty(slotStatus)} time added`);
    if (!error) {
      setStart("");
      setEnd("");
    }
    reload();
  }
  async function request() {
    if (!chosen) return;
    const rs = new Date(requestStart),
      re = new Date(requestEnd);
    if (
      rs < new Date(chosen.starts_at) ||
      re > new Date(chosen.ends_at) ||
      re <= rs
    )
      return notify("Choose a time fully inside the available slot");
    const { error } = await app.client.from("meeting_requests").insert({
      availability_id: chosen.id,
      mentor_id: chosen.mentor_id,
      mentee_id: app.profile.id,
      requested_start: rs.toISOString(),
      requested_end: re.toISOString(),
    });
    notify(error ? error.message : "Meeting request sent");
    if (!error) setChosen(null);
    loadRequests();
    reload();
  }
  async function saveCalendar() {
    const { error } = await app.client
      .from("profiles")
      .update({ calendar_booking_url: calendar || null })
      .eq("id", app.profile.role === "mentor" ? app.profile.id : student.id);
    notify(error ? error.message : "Google Calendar link saved");
    reload();
  }
  async function deleteSlot(id: string) {
    if (!window.confirm("Delete this calendar activity?")) return;
    const { error } = await app.client
      .from("availability_slots")
      .delete()
      .eq("id", id);
    notify(error ? error.message : "Calendar activity deleted");
    reload();
  }
  async function deleteRequest(id: string) {
    if (!window.confirm("Delete this meeting activity?")) return;
    const { error } = await app.client
      .from("meeting_requests")
      .delete()
      .eq("id", id);
    notify(error ? error.message : "Meeting activity deleted");
    loadRequests();
    reload();
  }
  const cells = monthCells(month);
  return (
    <>
      <Intro
        title="Monthly timetable"
        text="Empty days have no published availability. Free and blocked time appear directly in the month view."
      />
      {app.profile.role === "mentor" && (
        <>
          <section className="card calendar-connect">
            <Field label="Google Calendar appointment link">
              <input
                placeholder="https://calendar.app.google/..."
                value={calendar}
                onChange={(e) => setCalendar(e.target.value)}
              />
            </Field>
            <button onClick={saveCalendar}>Save link</button>
          </section>
          <form className="form-grid card" onSubmit={add}>
            <Field label="From">
              <input
                required
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="Until">
              <input
                required
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
            <Field label="Calendar status">
              <select
                value={slotStatus}
                onChange={(e) => setSlotStatus(e.target.value)}
              >
                <option value="free">Free</option>
                <option value="blocked">Blocked</option>
              </select>
            </Field>
            <button>Add to calendar</button>
          </form>
        </>
      )}
      <div className="month-head">
        <button
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          ←
        </button>
        <h2>
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          →
        </button>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
          <strong className="weekday" key={x}>
            {x}
          </strong>
        ))}
        {cells.map((day, i) =>
          day ? (
            <div className="calendar-day" key={day.toISOString()}>
              <b>{day.getDate()}</b>
              {slots
                .filter((s) => sameDay(new Date(s.starts_at), day))
                .map((s) => (
                  <button
                    key={s.id}
                    className={`slot-chip ${s.status}`}
                    disabled={
                      app.profile.role === "student" && s.status !== "free"
                    }
                    onClick={() => {
                      if (
                        app.profile.role === "student" &&
                        s.status === "free"
                      ) {
                        setChosen(s);
                        setRequestStart(toLocalInput(s.starts_at));
                        setRequestEnd(toLocalInput(s.ends_at));
                      }
                    }}
                  >
                    {s.status === "free"
                      ? `${time(s.starts_at)}–${time(s.ends_at)} Free`
                      : "Blocked"}
                    {app.profile.role === "mentor" && (
                      <span
                        className="chip-delete"
                        role="button"
                        aria-label="Delete calendar activity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlot(s.id);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
              {requests
                .filter(
                  (r) =>
                    sameDay(new Date(r.requested_start), day) &&
                    r.status !== "cancelled",
                )
                .map((r) => (
                  <span className={`slot-chip ${r.status}`} key={r.id}>
                    {time(r.requested_start)} {pretty(r.status)}
                    {app.profile.role === "mentor" &&
                      ` · ${requester(r.mentee_id)}`}
                  </span>
                ))}
            </div>
          ) : (
            <div className="calendar-day blank" key={`b${i}`} />
          ),
        )}
      </div>
      {chosen && (
        <section className="card request-box">
          <h3>Request meeting within this free time</h3>
          <p>
            Available: {date(chosen.starts_at)} until {date(chosen.ends_at)}
          </p>
          <div className="form-grid">
            <Field label="Request from">
              <input
                type="datetime-local"
                min={toLocalInput(chosen.starts_at)}
                max={toLocalInput(chosen.ends_at)}
                value={requestStart}
                onChange={(e) => setRequestStart(e.target.value)}
              />
            </Field>
            <Field label="Request until">
              <input
                type="datetime-local"
                min={toLocalInput(chosen.starts_at)}
                max={toLocalInput(chosen.ends_at)}
                value={requestEnd}
                onChange={(e) => setRequestEnd(e.target.value)}
              />
            </Field>
            <button onClick={request}>Send request</button>
            <button className="soft" onClick={() => setChosen(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
      {app.profile.role === "mentor" &&
        requests
          .filter((r) => r.status === "requested")
          .map((r) => (
            <section className="card request-row" key={r.id}>
              <div>
                <strong>Meeting request from {requester(r.mentee_id)}</strong>
                <p>
                  {date(r.requested_start)} — {date(r.requested_end)}
                </p>
              </div>
              <button
                onClick={async () => {
                  await app.client
                    .from("meeting_requests")
                    .update({ status: "confirmed" })
                    .eq("id", r.id);
                  loadRequests();
                }}
              >
                Confirm
              </button>
              <button
                className="soft"
                onClick={async () => {
                  await app.client
                    .from("meeting_requests")
                    .update({ status: "declined" })
                    .eq("id", r.id);
                  loadRequests();
                }}
              >
                Decline
              </button>
              <button className="danger" onClick={() => deleteRequest(r.id)}>
                Delete
              </button>
            </section>
          ))}
    </>
  );
}
function Sessions({
  studentId,
  rows,
  reload,
  notify,
}: {
  studentId: string;
  rows: Session[];
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [draft, setDraft] = useState({
      title: "",
      scheduled_at: "",
      topics: "",
      learning_outcomes: "",
      knowledge_gaps: "",
      mentor_feedback: "",
      next_session_plan: "",
    });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await app.client.from("sessions").insert({
      ...draft,
      scheduled_at: draft.scheduled_at
        ? new Date(draft.scheduled_at).toISOString()
        : null,
      mentor_id: app.profile.id,
      mentee_id: studentId,
      session_number: (rows.at(-1)?.session_number || 0) + 1,
      status: "planned",
    });
    notify(error ? error.message : "Session and notes created");
    if (!error)
      setDraft({
        title: "",
        scheduled_at: "",
        topics: "",
        learning_outcomes: "",
        knowledge_gaps: "",
        mentor_feedback: "",
        next_session_plan: "",
      });
    reload();
  }
  return (
    <>
      <Intro
        title="Sessions & mentor notes"
        text="Mentors can reopen any previous session to correct forgotten feedback or remove an incorrect record."
      />
      {app.profile.role === "mentor" && (
        <form className="form-grid card" onSubmit={add}>
          <Field label="Session title">
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Date and time">
            <input
              type="datetime-local"
              value={draft.scheduled_at}
              onChange={(e) =>
                setDraft({ ...draft, scheduled_at: e.target.value })
              }
            />
          </Field>
          <Field label="Agenda / topics">
            <textarea
              value={draft.topics}
              onChange={(e) => setDraft({ ...draft, topics: e.target.value })}
            />
          </Field>
          <Field label="Learning outcomes">
            <textarea
              value={draft.learning_outcomes}
              onChange={(e) =>
                setDraft({ ...draft, learning_outcomes: e.target.value })
              }
            />
          </Field>
          <Field label="Knowledge gaps">
            <textarea
              value={draft.knowledge_gaps}
              onChange={(e) =>
                setDraft({ ...draft, knowledge_gaps: e.target.value })
              }
            />
          </Field>
          <Field label="Mentor feedback">
            <textarea
              value={draft.mentor_feedback}
              onChange={(e) =>
                setDraft({ ...draft, mentor_feedback: e.target.value })
              }
            />
          </Field>
          <Field label="Next-session plan">
            <textarea
              value={draft.next_session_plan}
              onChange={(e) =>
                setDraft({ ...draft, next_session_plan: e.target.value })
              }
            />
          </Field>
          <button>Create session</button>
        </form>
      )}
      <div className="session-stack">
        {rows.map((s) => (
          <SessionItem key={s.id} row={s} reload={reload} notify={notify} />
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="No sessions yet"
          text="Create the first session when ready."
        />
      )}
    </>
  );
}
function SessionItem({
  row,
  reload,
  notify,
}: {
  row: Session;
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [edit, setEdit] = useState({
      ...row,
      scheduled_at: toLocalInput(row.scheduled_at),
    });
  async function save() {
    const { error } = await app.client
      .from("sessions")
      .update({
        ...edit,
        scheduled_at: edit.scheduled_at
          ? new Date(edit.scheduled_at).toISOString()
          : null,
      })
      .eq("id", row.id);
    notify(error ? error.message : "Session updated");
    reload();
  }
  async function remove() {
    if (!window.confirm(`Delete Session ${row.session_number}: ${row.title}?`))
      return;
    const { error } = await app.client
      .from("sessions")
      .delete()
      .eq("id", row.id);
    notify(error ? error.message : "Session deleted");
    reload();
  }
  if (app.profile.role === "student")
    return (
      <article className="card session-read">
        <h3>
          Session {row.session_number}: {row.title}
        </h3>
        <small>
          {date(row.scheduled_at)} · {pretty(row.status)}
        </small>
        <p>
          <strong>Topics:</strong> {row.topics || "—"}
          <br />
          <strong>Learning outcomes:</strong> {row.learning_outcomes || "—"}
          <br />
          <strong>Knowledge gaps:</strong> {row.knowledge_gaps || "—"}
          <br />
          <strong>Mentor feedback:</strong> {row.mentor_feedback || "—"}
          <br />
          <strong>Next plan:</strong> {row.next_session_plan || "—"}
        </p>
      </article>
    );
  return (
    <details className="card session-edit">
      <summary>
        <span>
          Session {row.session_number}: {row.title}
        </span>
        <em>{pretty(row.status)}⌄</em>
      </summary>
      <div className="form-grid">
        <Field label="Title">
          <input
            value={edit.title}
            onChange={(e) => setEdit({ ...edit, title: e.target.value })}
          />
        </Field>
        <Field label="Date and time">
          <input
            type="datetime-local"
            value={edit.scheduled_at || ""}
            onChange={(e) => setEdit({ ...edit, scheduled_at: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <select
            value={edit.status}
            onChange={(e) => setEdit({ ...edit, status: e.target.value })}
          >
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Topics">
          <textarea
            value={edit.topics || ""}
            onChange={(e) => setEdit({ ...edit, topics: e.target.value })}
          />
        </Field>
        <Field label="Learning outcomes">
          <textarea
            value={edit.learning_outcomes || ""}
            onChange={(e) =>
              setEdit({ ...edit, learning_outcomes: e.target.value })
            }
          />
        </Field>
        <Field label="Knowledge gaps">
          <textarea
            value={edit.knowledge_gaps || ""}
            onChange={(e) =>
              setEdit({ ...edit, knowledge_gaps: e.target.value })
            }
          />
        </Field>
        <Field label="Mentor feedback">
          <textarea
            value={edit.mentor_feedback || ""}
            onChange={(e) =>
              setEdit({ ...edit, mentor_feedback: e.target.value })
            }
          />
        </Field>
        <Field label="Next-session plan">
          <textarea
            value={edit.next_session_plan || ""}
            onChange={(e) =>
              setEdit({ ...edit, next_session_plan: e.target.value })
            }
          />
        </Field>
        <button onClick={save}>Save changes</button>
        <button className="danger" onClick={remove}>
          Delete session
        </button>
      </div>
    </details>
  );
}
const competencyCategories = [
  "Cybersecurity foundations",
  "Networking fundamentals",
  "Linux fundamentals",
  "Cloud fundamentals",
  "Identity and access management",
  "Cloud network security",
  "Data protection and encryption",
  "Monitoring and logging",
  "Vulnerability management",
  "Incident response",
  "DevSecOps",
  "Technical communication",
  "Professional documentation",
];
function ReportCard({
  student,
  report,
  history,
  skills,
  reload,
  notify,
}: {
  student: Student;
  report: Report;
  history: ReportHistory[];
  skills: Skill[];
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [form, setForm] = useState(report),
    [dates, setDates] = useState({
      start: student.mentorship_start || "",
      end: student.mentorship_end || "",
    }),
    [skill, setSkill] = useState({
      name: competencyCategories[0],
      level: "not_assessed",
      progress: 0,
      comment: "",
    });
  useEffect(() => setForm(report), [report]);
  useEffect(
    () =>
      setDates({
        start: student.mentorship_start || "",
        end: student.mentorship_end || "",
      }),
    [student.id, student.mentorship_start, student.mentorship_end],
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await app.client.from("progress_reports").upsert(
      {
        ...form,
        mentor_id: app.profile.id,
        mentee_id: student.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mentee_id" },
    );
    await app.client
      .from("profiles")
      .update({
        mentorship_start: dates.start || null,
        mentorship_end: dates.end || null,
      })
      .eq("id", student.id);
    if (!error) {
      const { error: historyError } = await app.client
        .from("progress_report_history")
        .insert({
          mentor_id: app.profile.id,
          mentee_id: student.id,
          objective_target: form.objective_target,
          latest_student_update: form.latest_student_update,
          mentor_comment: form.mentor_comment,
          progress_percent: form.progress_percent || 0,
        });
      if (historyError) {
        notify(historyError.message);
        return;
      }
    }
    notify(error ? error.message : "Report card updated");
    reload();
  }
  async function addSkill() {
    const { error } = await app.client.from("competencies").insert({
      mentor_id: app.profile.id,
      mentee_id: student.id,
      name: skill.name,
      level: skill.level,
      progress: skill.progress,
      mentor_comment: skill.comment,
    });
    notify(error ? error.message : "Competency added");
    reload();
  }
  return (
    <>
      <Intro
        title="Mentor report card"
        text="Competencies use consistent categories and expand only when details are needed."
      />
      {app.profile.role === "mentor" && (
        <>
          <form className="form-grid card" onSubmit={save}>
            <Field label="Mentorship start">
              <input
                type="date"
                value={dates.start}
                onChange={(e) => setDates({ ...dates, start: e.target.value })}
              />
            </Field>
            <Field label="Mentorship end">
              <input
                type="date"
                value={dates.end}
                onChange={(e) => setDates({ ...dates, end: e.target.value })}
              />
            </Field>
            <Field label="Current objective target">
              <textarea
                value={form.objective_target || ""}
                onChange={(e) =>
                  setForm({ ...form, objective_target: e.target.value })
                }
              />
            </Field>
            <Field label="Latest student update">
              <textarea
                value={form.latest_student_update || ""}
                onChange={(e) =>
                  setForm({ ...form, latest_student_update: e.target.value })
                }
              />
            </Field>
            <Field label="Mentor comment">
              <textarea
                value={form.mentor_comment || ""}
                onChange={(e) =>
                  setForm({ ...form, mentor_comment: e.target.value })
                }
              />
            </Field>
            <Field label={`Overall progress: ${form.progress_percent || 0}%`}>
              <input
                type="range"
                min="0"
                max="100"
                value={form.progress_percent || 0}
                onChange={(e) =>
                  setForm({ ...form, progress_percent: Number(e.target.value) })
                }
              />
            </Field>
            <button>Save report card</button>
            <button
              type="button"
              className="soft"
              onClick={() => setForm({ ...form, mentor_comment: "" })}
            >
              Clear overall comment
            </button>
          </form>
          <section className="form-grid card">
            <Field label="Competency category">
              <select
                value={skill.name}
                onChange={(e) => setSkill({ ...skill, name: e.target.value })}
              >
                {competencyCategories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Level">
              <select
                value={skill.level}
                onChange={(e) => setSkill({ ...skill, level: e.target.value })}
              >
                <option value="not_assessed">Not assessed</option>
                <option value="beginner">Beginner</option>
                <option value="developing">Developing</option>
                <option value="independent">Independent</option>
              </select>
            </Field>
            <Field label={`Progress: ${skill.progress}%`}>
              <input
                type="range"
                min="0"
                max="100"
                value={skill.progress}
                onChange={(e) =>
                  setSkill({ ...skill, progress: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Comment">
              <textarea
                value={skill.comment}
                onChange={(e) =>
                  setSkill({ ...skill, comment: e.target.value })
                }
              />
            </Field>
            <button onClick={addSkill}>Add competency</button>
          </section>
        </>
      )}
      <section className="competency-list">
        {skills.map((c) => (
          <CompetencyRow key={c.id} row={c} reload={reload} notify={notify} />
        ))}
      </section>
      {!skills.length && (
        <Empty
          title="No competencies yet"
          text="The mentor has not added a competency assessment."
        />
      )}
      <section className="card report-history">
        <h3>Report card history</h3>
        {history.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Saved</th>
                  <th>Progress</th>
                  <th>Objective</th>
                  <th>Latest update</th>
                  <th>Mentor comment</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{date(item.created_at)}</td>
                    <td>{item.progress_percent}%</td>
                    <td>{item.objective_target || "—"}</td>
                    <td>{item.latest_student_update || "—"}</td>
                    <td>{item.mentor_comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No saved report history yet.</p>
        )}
      </section>
    </>
  );
}
function CompetencyRow({
  row,
  reload,
  notify,
}: {
  row: Skill;
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [edit, setEdit] = useState(row);
  async function save() {
    const { error } = await app.client
      .from("competencies")
      .update({
        name: edit.name,
        level: edit.level,
        progress: edit.progress,
        mentor_comment: edit.mentor_comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    notify(error ? error.message : "Competency updated");
    reload();
  }
  return (
    <details className="card competency-row">
      <summary>
        <span>{row.name}</span>
        <em>
          {row.progress}% · {pretty(row.level)}⌄
        </em>
      </summary>
      <i>
        <b style={{ width: `${row.progress}%` }} />
      </i>
      {app.profile.role === "mentor" ? (
        <div className="form-grid">
          <Field label="Category">
            <select
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            >
              {competencyCategories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Level">
            <select
              value={edit.level}
              onChange={(e) => setEdit({ ...edit, level: e.target.value })}
            >
              <option value="not_assessed">Not assessed</option>
              <option value="beginner">Beginner</option>
              <option value="developing">Developing</option>
              <option value="independent">Independent</option>
            </select>
          </Field>
          <Field label={`Progress: ${edit.progress}%`}>
            <input
              type="range"
              min="0"
              max="100"
              value={edit.progress}
              onChange={(e) =>
                setEdit({ ...edit, progress: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Mentor comment">
            <textarea
              value={edit.mentor_comment || ""}
              onChange={(e) =>
                setEdit({ ...edit, mentor_comment: e.target.value })
              }
            />
          </Field>
          <button onClick={save}>Save competency</button>
          <button
            className="danger"
            onClick={async () => {
              if (!window.confirm("Delete this entire competency record?"))
                return;
              const { error } = await app.client
                .from("competencies")
                .delete()
                .eq("id", row.id);
              notify(error ? error.message : "Competency record deleted");
              reload();
            }}
          >
            Delete competency
          </button>
        </div>
      ) : (
        <p>{row.mentor_comment || "No mentor comment."}</p>
      )}
    </details>
  );
}
function Assignments({
  studentId,
  rows,
  reload,
  notify,
}: {
  studentId: string;
  rows: Assignment[];
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [form, setForm] = useState({
      title: "",
      objective: "",
      instructions: "",
      resource_url: "",
      due_at: "",
      mentor_feedback: "",
    }),
    [statusFilter, setStatusFilter] = useState("all"),
    [dueOrder, setDueOrder] = useState<"asc" | "desc">("asc");
  const visibleRows = rows
    .filter((row) => statusFilter === "all" || row.status === statusFilter)
    .sort((a, b) => {
      const left = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const right = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return dueOrder === "asc" ? left - right : right - left;
    });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await app.client.from("assignments").insert({
      ...form,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      mentor_id: app.profile.id,
      mentee_id: studentId,
    });
    notify(error ? error.message : "Assignment created with details");
    if (!error)
      setForm({
        title: "",
        objective: "",
        instructions: "",
        resource_url: "",
        due_at: "",
        mentor_feedback: "",
      });
    reload();
  }
  return (
    <>
      <Intro
        title="Assignments"
        text="Mentors define the task and resource link. Students can only mark their own completion."
      />
      {app.profile.role === "mentor" && (
        <form className="form-grid card" onSubmit={add}>
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Due date">
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
            />
          </Field>
          <Field label="Objective">
            <textarea
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            />
          </Field>
          <Field label="Instructions">
            <textarea
              value={form.instructions}
              onChange={(e) =>
                setForm({ ...form, instructions: e.target.value })
              }
            />
          </Field>
          <Field label="Kahoot / Google Form / resource link">
            <input
              type="url"
              placeholder="https://..."
              value={form.resource_url}
              onChange={(e) =>
                setForm({ ...form, resource_url: e.target.value })
              }
            />
          </Field>
          <Field label="Mentor feedback">
            <textarea
              value={form.mentor_feedback}
              onChange={(e) =>
                setForm({ ...form, mentor_feedback: e.target.value })
              }
            />
          </Field>
          <button>Create assignment</button>
        </form>
      )}
      <section className="card assignment-tools">
        <Field label="Filter by status">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All assignments</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
        <Field label="Sort by due date">
          <select
            value={dueOrder}
            onChange={(e) => setDueOrder(e.target.value as "asc" | "desc")}
          >
            <option value="asc">Earliest first</option>
            <option value="desc">Latest first</option>
          </select>
        </Field>
      </section>
      <div className="tasks">
        {visibleRows.map((t) => (
          <article className="card" key={t.id}>
            <div>
              <em>{pretty(t.status)}</em>
              <span>{date(t.due_at)}</span>
            </div>
            <h3>{t.title}</h3>
            <p>
              <strong>Objective:</strong> {t.objective || "—"}
              <br />
              <strong>Instructions:</strong> {t.instructions || "—"}
            </p>
            {t.resource_url && (
              <a
                className="primary-link"
                href={t.resource_url}
                target="_blank"
                rel="noreferrer"
              >
                Open activity ↗
              </a>
            )}
            {app.profile.role === "student" && (
              <label className="done-check">
                <input
                  type="checkbox"
                  checked={t.status === "completed"}
                  onChange={async (e) => {
                    const done = e.target.checked;
                    const { error } = await app.client
                      .from("assignments")
                      .update({
                        status: done ? "completed" : "in_progress",
                        completed_at: done ? new Date().toISOString() : null,
                      })
                      .eq("id", t.id);
                    notify(
                      error
                        ? error.message
                        : done
                          ? "Marked done"
                          : "Marked in progress",
                    );
                    reload();
                  }}
                />{" "}
                I have completed this
              </label>
            )}
          </article>
        ))}
      </div>
      {!visibleRows.length && (
        <Empty
          title="No matching assignments"
          text="Change the status filter to view other assignments."
        />
      )}
    </>
  );
}
function Notes({
  studentId,
  rows,
  reload,
  notify,
}: {
  studentId: string;
  rows: Note[];
  reload: () => void;
  notify: (x: string) => void;
}) {
  const app = useRimauLog()!,
    [selectedId, setSelectedId] = useState(rows[0]?.id || "new"),
    selected = rows.find((r) => r.id === selectedId),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [proposal, setProposal] = useState(""),
    [noteMode, setNoteMode] = useState<"preview" | "write">("preview"),
    editorRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setBody(selected.body_markdown);
      setProposal(selected.proposed_body_markdown || selected.body_markdown);
      setNoteMode("preview");
    } else {
      setTitle("");
      setBody("");
      setProposal("");
    }
  }, [selected?.id, selectedId]);
  useEffect(() => {
    if (selectedId !== "new" && !rows.some((r) => r.id === selectedId))
      setSelectedId(rows[0]?.id || "new");
  }, [rows, selectedId]);
  function newNote() {
    setSelectedId("new");
    setTitle("");
    setBody("");
    setProposal("");
    setNoteMode("write");
  }
  function formatNote(before: string, after = "", fallback = "text") {
    const el = editorRef.current;
    if (!el) return;
    const value = app.profile.role === "mentor" ? proposal : body;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const chosen = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${chosen}${after}${value.slice(end)}`;
    if (app.profile.role === "mentor") setProposal(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + chosen.length,
      );
    });
  }
  async function saveStudent() {
    if (!title.trim()) return notify("Add a note title first");
    const payload = {
      author_id: app.profile.id,
      mentee_id: studentId,
      title: title.trim(),
      body_markdown: body,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = selected
      ? await app.client
          .from("notes")
          .update(payload)
          .eq("id", selected.id)
          .select()
          .single()
      : await app.client.from("notes").insert(payload).select().single();
    notify(
      error ? error.message : selected ? "Note updated" : "New note added",
    );
    if (data) setSelectedId(data.id);
    reload();
  }
  async function propose() {
    if (!selected) return notify("Select an existing student note first");
    const { error } = await app.client
      .from("notes")
      .update({
        proposed_body_markdown: proposal,
        proposed_by: app.profile.id,
        proposal_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    notify(error ? error.message : "Edit sent for student approval");
    reload();
  }
  async function decide(accept: boolean) {
    if (!selected) return;
    const update = accept
      ? {
          body_markdown: selected.proposed_body_markdown,
          proposal_status: "accepted",
        }
      : { proposal_status: "rejected" };
    const { error } = await app.client
      .from("notes")
      .update(update)
      .eq("id", selected.id);
    notify(
      error
        ? error.message
        : accept
          ? "Mentor edit accepted"
          : "Mentor edit rejected",
    );
    reload();
  }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/markdown" }));
    a.download = `${(title || "note").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
  }
  return (
    <>
      <div className="intro">
        <div>
          <h2>Notes</h2>
          <p>
            Write normally with the format bar, preview the finished note, and
            download a GitHub-ready Markdown file.
          </p>
        </div>
        {app.profile.role === "student" && (
          <button onClick={newNote}>＋ New note</button>
        )}
      </div>
      <div className="notes-layout">
        <aside className="card notes-list">
          <h3>All notes</h3>
          {rows.map((n) => (
            <button
              key={n.id}
              className={selectedId === n.id ? "active" : ""}
              onClick={() => setSelectedId(n.id)}
            >
              <strong>{n.title}</strong>
              <small>
                {shortDate(n.updated_at.slice(0, 10))}
                {n.proposal_status === "pending" ? " · Edit pending" : ""}
              </small>
            </button>
          ))}
          {!rows.length && <p>No notes yet.</p>}
        </aside>
        <section className="card editor">
          <div className="editor-actions">
            <input
              value={title}
              disabled={app.profile.role === "mentor"}
              placeholder="Note title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <button onClick={download}>Download</button>
            {app.profile.role === "student" && (
              <button onClick={saveStudent}>
                {selected ? "Save note" : "Add note"}
              </button>
            )}
            {app.profile.role === "mentor" && selected && (
              <button onClick={propose}>Request edit</button>
            )}
          </div>
          <div className="note-tabs">
            <button
              className={noteMode === "preview" ? "sel" : ""}
              onClick={() => setNoteMode("preview")}
            >
              Preview
            </button>
            <button
              className={noteMode === "write" ? "sel" : ""}
              onClick={() => setNoteMode("write")}
            >
              Write
            </button>
          </div>
          {noteMode === "write" ? (
            <>
              <div className="format-bar" aria-label="Note formatting">
                <button
                  title="Heading"
                  onClick={() => formatNote("## ", "", "Heading")}
                >
                  H
                </button>
                <button
                  title="Bold"
                  onClick={() => formatNote("**", "**", "bold text")}
                >
                  <b>B</b>
                </button>
                <button
                  title="Italic"
                  onClick={() => formatNote("_", "_", "italic text")}
                >
                  <i>I</i>
                </button>
                <button
                  title="Bullet list"
                  onClick={() => formatNote("- ", "", "list item")}
                >
                  • List
                </button>
                <button
                  title="Numbered list"
                  onClick={() => formatNote("1. ", "", "list item")}
                >
                  1. List
                </button>
                <button
                  title="Quote"
                  onClick={() => formatNote("> ", "", "quote")}
                >
                  ❞
                </button>
                <button
                  title="Link"
                  onClick={() => formatNote("[", "](https://)", "link text")}
                >
                  Link
                </button>
                <button
                  title="Table"
                  onClick={() =>
                    formatNote(
                      "| Column 1 | Column 2 |\n| --- | --- |\n| ",
                      " | Value |",
                      "Value",
                    )
                  }
                >
                  Table
                </button>
              </div>
              <textarea
                ref={editorRef}
                disabled={app.profile.role === "mentor" && !selected}
                value={app.profile.role === "mentor" ? proposal : body}
                onChange={(e) =>
                  app.profile.role === "mentor"
                    ? setProposal(e.target.value)
                    : setBody(e.target.value)
                }
                placeholder="Write your weekly reflection…"
              />
            </>
          ) : (
            <MarkdownPreview
              value={app.profile.role === "mentor" ? proposal : body}
            />
          )}
        </section>
      </div>
      {app.profile.role === "student" &&
        selected?.proposal_status === "pending" && (
          <section className="card approval">
            <h3>Mentor suggested an edit</h3>
            <pre>{selected.proposed_body_markdown}</pre>
            <button onClick={() => decide(true)}>Accept changes</button>
            <button className="soft" onClick={() => decide(false)}>
              Reject changes
            </button>
          </section>
        )}
    </>
  );
}
function MarkdownPreview({ value }: { value: string }) {
  if (!value.trim())
    return (
      <section className="markdown-preview empty-preview">
        <p>Nothing to preview yet. Select Write to start your note.</p>
      </section>
    );
  const lines = value.split("\n"),
    blocks: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("|") && /^\s*\|?\s*:?-+/.test(lines[i + 1] || "")) {
      const header = tableCells(line),
        rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(tableCells(lines[i]));
        i++;
      }
      i--;
      blocks.push(
        <div className="table-wrap" key={`t${i}`}>
          <table>
            <thead>
              <tr>
                {header.map((cell, j) => (
                  <th key={j}>{inlineMarkdown(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k}>{inlineMarkdown(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (line.startsWith("### "))
      blocks.push(<h3 key={i}>{inlineMarkdown(line.slice(4))}</h3>);
    else if (line.startsWith("## "))
      blocks.push(<h2 key={i}>{inlineMarkdown(line.slice(3))}</h2>);
    else if (line.startsWith("# "))
      blocks.push(<h1 key={i}>{inlineMarkdown(line.slice(2))}</h1>);
    else if (/^[-*] /.test(line))
      blocks.push(
        <ul key={i}>
          <li>{inlineMarkdown(line.slice(2))}</li>
        </ul>,
      );
    else if (/^\d+\. /.test(line))
      blocks.push(
        <ol key={i}>
          <li>{inlineMarkdown(line.replace(/^\d+\. /, ""))}</li>
        </ol>,
      );
    else if (line.startsWith("> "))
      blocks.push(
        <blockquote key={i}>{inlineMarkdown(line.slice(2))}</blockquote>,
      );
    else if (line.trim()) blocks.push(<p key={i}>{inlineMarkdown(line)}</p>);
    else blocks.push(<br key={i} />);
  }
  return <section className="markdown-preview">{blocks}</section>;
}
function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((x) => x.trim());
}
function inlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    return part;
  });
}
function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="intro">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="empty">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <b>{icon}</b>
      <div>
        <small>{label}</small>
        <strong>
          {value} <em>{detail}</em>
        </strong>
      </div>
    </article>
  );
}
function initials(x: string) {
  return x
    .split(/[ @.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
}
function pretty(x: string) {
  return x.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
function date(x: string | null) {
  return x ? new Date(x).toLocaleString() : "Date not set";
}
function shortDate(x?: string | null) {
  return x ? new Date(`${x}T00:00:00`).toLocaleDateString() : "Not set";
}
function journeyProgress(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime(),
    b = new Date(end).getTime(),
    n = Date.now();
  return Math.max(0, Math.min(100, Math.round(((n - a) / (b - a)) * 100)));
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function time(x: string) {
  return new Date(x).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function toLocalInput(x: string | null) {
  if (!x) return "";
  const d = new Date(x),
    pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    out: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) out.push(null);
  for (let d = 1; d <= days; d++)
    out.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (out.length % 7) out.push(null);
  return out;
}
