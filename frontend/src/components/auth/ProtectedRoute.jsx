import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../../services/supabase";

const ProtectedAuthContext = createContext(null);

export function useProtectedAuth() {
  const value = useContext(ProtectedAuthContext);
  if (!value) throw new Error("useProtectedAuth must be used inside ProtectedRoute");
  return value;
}

export default function ProtectedRoute() {
  const [auth, setAuth] = useState({ status: "checking", profile: null, error: "" });
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    let currentUserId = null;

    async function loadProfile(session) {
      if (!session?.user?.id) {
        currentUserId = null;
        requestId.current += 1;
        if (active) setAuth({ status: "signed_out", profile: null, error: "" });
        return;
      }

      const userId = session.user.id;
      if (currentUserId === userId) return;
      currentUserId = userId;
      const request = ++requestId.current;
      setAuth({ status: "checking", profile: null, error: "" });

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, email, role, agency")
          .eq("id", userId)
          .single();
        if (error) throw error;
        if (!data?.role) throw new Error("Your profile has no assigned role.");
        if (active && request === requestId.current) {
          setAuth({ status: "ready", profile: data, error: "" });
        }
      } catch (error) {
        console.error("Unable to load profile:", error);
        if (active && request === requestId.current) {
          currentUserId = null;
          setAuth({
            status: "error",
            profile: null,
            error: "Unable to verify your account. Check your connection and retry.",
          });
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        currentUserId = null;
        requestId.current += 1;
        setAuth({ status: "signed_out", profile: null, error: "" });
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // A token refresh does not restart the profile check or hide the page.
        void loadProfile(session);
      }
    });

    // Covers clients where INITIAL_SESSION is delayed or unavailable.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) throw error;
      void loadProfile(data.session);
    }).catch((error) => {
      console.error("Unable to check session:", error);
      if (active && currentUserId === null) {
        setAuth({ status: "error", profile: null, error: "Unable to check your session. Please retry." });
      }
    });

    return () => {
      active = false;
      requestId.current += 1;
      subscription.unsubscribe();
    };
  }, [retry]);

  if (auth.status === "checking") return null;
  if (auth.status === "signed_out") return <Navigate to="/login" replace />;
  if (auth.status === "error") {
    return (
      <div role="alert" style={{ padding: 32 }}>
        <p>{auth.error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
      </div>
    );
  }

  return (
    <ProtectedAuthContext.Provider value={{ profile: auth.profile, role: auth.profile.role }}>
      <Outlet />
    </ProtectedAuthContext.Provider>
  );
}
