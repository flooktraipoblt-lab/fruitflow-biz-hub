import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthData {
  loading: boolean;
  session: any;
  profile: { id: string; email: string; display_name: string | null; approved: boolean } | null;
  roles: string[];
  isAdmin: boolean;
}

export function useAuthData(): AuthData {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<AuthData["profile"]>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        const uid = s.user.id;
        setTimeout(async () => {
          const [{ data: p }, { data: r }] = await Promise.all([
            (supabase as any).from("profiles").select("id,email,display_name,approved").eq("id", uid).maybeSingle(),
            (supabase as any).from("user_roles").select("role").eq("user_id", uid),
          ]);
          setProfile(p ?? null);
          setRoles((r ?? []).map((x: any) => x.role));
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const uid = session.user.id;
        const [{ data: p }, { data: r }] = await Promise.all([
          (supabase as any).from("profiles").select("id,email,display_name,approved").eq("id", uid).maybeSingle(),
          (supabase as any).from("user_roles").select("role").eq("user_id", uid),
        ]);
        setProfile(p ?? null);
        setRoles((r ?? []).map((x: any) => x.role));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");

  return { loading, session, profile, roles, isAdmin };
}
