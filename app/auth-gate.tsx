"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "mentor" | "student";
  approved: boolean;
};

function configuredClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_PUBLIC")) return null;
  return createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } });
}

export function useRimauLog() {
  const client = useMemo(configuredClient, []);
  return client;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const client = useRimauLog();
  const [loading, setLoading] = useState(Boolean(client));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    async function resolve(nextUser: User | null) {
      if (!mounted) return;
      setUser(nextUser);
      setProfile(null);
      if (!nextUser) { setLoading(false); return; }
      const { data, error: profileError } = await client!
        .from("profiles")
        .select("id,email,full_name,role,approved")
        .eq("id", nextUser.id)
        .maybeSingle();
      if (!mounted) return;
      if (profileError) setError(profileError.message);
      setProfile(data as Profile | null);
      setLoading(false);
    }
    client.auth.getUser().then(({ data }) => resolve(data.user));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => resolve(session?.user ?? null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [client]);

  if (!client) return <>{children}<div className="demo-badge">DEMO MODE · Connect Supabase for live access</div></>;
  if (loading) return <AuthScreen title="Preparing your workspace…" text="Checking your secure RimauLog access." />;
  if (!user) return <LoginScreen client={client} error={error} />;
  if (!profile?.approved) return <PendingScreen client={client} email={user.email ?? "this Google account"} />;
  return <>{children}<button className="signout" onClick={() => client.auth.signOut()}>Sign out · {profile.full_name ?? profile.email}</button></>;
}

function LoginScreen({ client, error }: { client: SupabaseClient; error: string }) {
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true);
    await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    setBusy(false);
  }
  return <AuthScreen title="Your mentoring journey, in one place." text="Private session records, focused weekly actions, feedback and GitHub-ready evidence.">
    <button className="google-button" onClick={signIn} disabled={busy}><span>G</span>{busy ? "Opening Google…" : "Continue with Google"}</button>
    <small className="access-note">Invitation only. Use the Gmail address approved by your mentor.</small>
    {error && <p className="auth-error">{error}</p>}
  </AuthScreen>;
}

function PendingScreen({ client, email }: { client: SupabaseClient; email: string }) {
  return <AuthScreen title="Access not approved yet" text={`You signed in as ${email}, but this account is not on the RimauLog approved-user list.`}>
    <div className="pending-mark">⌛</div>
    <p className="pending-help">Ask your mentor to approve this exact Gmail address, then sign in again.</p>
    <button className="google-button" onClick={() => client.auth.signOut()}>Use another Google account</button>
  </AuthScreen>;
}

function AuthScreen({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><b>R</b><strong>RimauLog</strong></div><span className="auth-kicker">LOG PROGRESS. BUILD CAPABILITY.</span><h1>{title}</h1><p>{text}</p>{children}<div className="auth-values"><span>Focused</span><span>Practical</span><span>Private</span></div></section><aside><small>SIX-MONTH CLOUD SECURITY MENTORSHIP</small><blockquote>“One objective. One practical action. One clear piece of evidence—every week.”</blockquote><div><b>24</b><span>weekly check-ins</span></div></aside></main>;
}
