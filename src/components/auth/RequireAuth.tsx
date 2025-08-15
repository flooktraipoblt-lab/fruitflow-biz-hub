import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      // fetch profile in a separate tick to avoid deadlocks
      if (session?.user) {
        const uid = session.user.id;
        setTimeout(async () => {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("approved")
            .eq("id", uid)
            .maybeSingle();
          setApproved(profile?.approved ?? false);
        }, 0);
      } else {
        setApproved(null);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthed(!!session);
      if (session?.user) {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("approved")
          .eq("id", session.user.id)
          .maybeSingle();
        setApproved(profile?.approved ?? false);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-[hsl(var(--brand-2))] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!authed) return <Navigate to="/auth" replace />;
  if (approved === false) return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
}
