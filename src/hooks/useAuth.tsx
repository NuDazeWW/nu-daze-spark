import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearPackageDrafts } from "@/lib/packageDrafts";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleCheckedFor, setRoleCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const applySession = (nextSession: Session | null) => {
      if (ignore) return;
      setSession(nextSession);
      // Keep the same user object on token refresh so the app doesn't reload mid-edit.
      setUser((prev) => {
        const next = nextSession?.user ?? null;
        return prev && next && prev.id === next.id ? prev : next;
      });
      setAuthReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) clearPackageDrafts();
      applySession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        applySession(initialSession);
      })
      .catch(() => {
        if (ignore) return;
        setSession(null);
        setUser(null);
        setAuthReady(true);
      });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    let ignore = false;
    setRoleLoading(true);

    async function loadRole() {
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (ignore) return;
        if (error) throw error;
        setIsAdmin(Boolean(data));
      } catch {
        if (ignore) return;
        setIsAdmin(false);
      } finally {
        if (ignore) return;
        setRoleLoading(false);
        setRoleCheckedFor(user.id);
      }
    }

    void loadRole();

    return () => {
      ignore = true;
    };
  }, [authReady, user?.id]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: !authReady || (!!user && roleCheckedFor !== user.id),
        isAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
