import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { childMode } from "./childMode";

interface SessionState {
  loading: boolean;
  user: User | null;
  familyId: string | null;
  childId: string | null;          // device-locked child id, null when in parent mode
  recovery: boolean;               // user landed via the password-reset email link
  clearRecovery: () => void;
  setChildId: (id: string | null) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [childId, setChildIdState] = useState<string | null>(childMode.get());
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

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
      const [memberRes, childRes] = await Promise.all([
        supabase
          .from("family_members")
          .select("family_id, role")
          .eq("user_id", s.user.id),
        supabase
          .from("child_profiles")
          .select("id, family_id")
          .eq("auth_user_id", s.user.id)
          .maybeSingle()
      ]);
      if (!active) return;
      // A user linked to a child profile belongs to that profile's
      // family — NOT the bootstrap family the signup trigger gave them.
      // Every new auth user (including invited children) gets their own
      // empty family on signup, so an unordered limit(1) could pick the
      // wrong one and leave the child staring at an empty app.
      const memberships = (memberRes.data ?? []) as { family_id: string; role: string }[];
      if (childRes.data?.family_id) {
        setFamilyId(childRes.data.family_id);
      } else {
        const parentish = memberships.find((m) => m.role === "parent" || m.role === "co_parent");
        setFamilyId(parentish?.family_id ?? memberships[0]?.family_id ?? null);
      }
      // If this auth user is linked to a child profile, lock the device
      // to that child automatically (same code path as the parent
      // manually choosing the child on their device).
      if (childRes.data?.id) {
        setChildIdState(childRes.data.id);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const sub = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
      }
      void apply(s);
    });

    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const clearRecovery = () => setRecovery(false);

  const setChildId = (id: string | null) => {
    if (id) childMode.set(id);
    else childMode.clear();
    setChildIdState(id);
  };

  const signOut = async () => {
    childMode.clear();
    setChildIdState(null);
    await supabase.auth.signOut();
    // Best-effort: drop the old service-worker runtime cache of Supabase
    // responses so family data doesn't linger on a shared device.
    try {
      await caches.delete("supabase");
    } catch {
      /* Cache API unavailable — nothing to clear */
    }
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        user,
        familyId,
        childId,
        recovery,
        clearRecovery,
        setChildId,
        signOut
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside <SessionProvider>");
  return v;
}
