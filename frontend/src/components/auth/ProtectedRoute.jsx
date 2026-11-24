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

    async function loadProfile(session, force = false) {
      if (!active) return;
      if (!session?.user?.id) {
        currentUserId = null;
        requestId.current += 1;
        if (active) setAuth({ status: "signed_out", profile: null, error: "" });
        return;
      }

      const userId = session.user.id;
      if (currentUserId === userId && !force) return;
      currentUserId = userId;
      const request = ++requestId.current;
      setAuth({ status: "checking", profile: null, error: "" });

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, email, role, organization, organization_type, agency_lgu_id, account_status")
          .eq("id", userId)
          .single();
        if (error) throw error;
        const { data: permitted, error: permissionError } = await supabase.rpc("cadp_is_active_account");
        if (permissionError) throw permissionError;
        if (!active || request !== requestId.current) return;
        if (data?.account_status !== "active" || permitted !== true ||
            !["super_admin", "admin", "user", "viewer"].includes(data?.role)) {
          setAuth({ status: "denied", profile: null, error: "Your account must be approved, active and email verified before accessing CADP." });
          return;
        }
        if (active && request === requestId.current) {
          setAuth({ status: "ready", profile: { ...data, agency: data.organization ?? "" }, error: "" });
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
      } else if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        // Defer Supabase queries until the auth callback has returned.
        const force = event === "TOKEN_REFRESHED" || event === "USER_UPDATED";
        setTimeout(() => { if (active) void loadProfile(session, force); }, 0);
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
  if (auth.status === "error" || auth.status === "denied") {
    return (
      <div role="alert" style={{ padding: 32 }}>
        <p>{auth.error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
        <button type="button" onClick={async () => {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) setAuth({ status: "error", profile: null, error: "Unable to sign out. Please retry." });
        }}>Sign Out</button>
      </div>
    );
  }

  if (auth.status !== "ready" || !auth.profile) return null;

  return (
    <ProtectedAuthContext.Provider value={{ profile: auth.profile, role: auth.profile.role }}>
      <Outlet />
    </ProtectedAuthContext.Provider>
  );
}
