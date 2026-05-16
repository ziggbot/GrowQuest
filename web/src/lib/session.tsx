import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { childMode } from "./childMode";

interface SessionState {
  loading: boolean;
  user: User | null;
  familyId: string | null;
  childId: string | null;          // device-locked child id, null when in parent mode
  setChildId: (id: string | null) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [childId, setChildIdState] = useState<string | null>(childMode.get());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const apply = async (s: Session | null) => {
      if (!active) return;
      if (!s) {
        setUser(null);
        setFamilyId(null);
        setLoading(false);
        return;
      }
      setUser(s.user);
      const { data } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", s.user.id)
        .limit(1)
        .maybeSingle();
      if (!active) return;
      setFamilyId(data?.family_id ?? null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const sub = supabase.auth.onAuthStateChange((_event, s) => {
      void apply(s);
    });

    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const setChildId = (id: string | null) => {
    if (id) childMode.set(id);
    else childMode.clear();
    setChildIdState(id);
  };

  const signOut = async () => {
    childMode.clear();
    setChildIdState(null);
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ loading, user, familyId, childId, setChildId, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}
