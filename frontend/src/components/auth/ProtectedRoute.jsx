import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function ProtectedRoute() {
  const [auth, setAuth] = useState({ status: "checking", session: null, error: "" });

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setAuth({ status: "signed_out", session: null, error: "" });
      } else if (session && ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        setAuth({ status: "authenticated", session, error: "" });
      } else if (event === "INITIAL_SESSION" && !session) {
        setAuth((previous) => previous.status === "authenticated" ? previous : { status: "signed_out", session: null, error: "" });
      }
    });

    // Initial check only. Temporary network errors must not be treated as sign-out.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Session check failed:", error);
        setAuth((previous) => previous.status === "authenticated" ? previous : { status: "error", session: null, error: "Unable to verify your session. Check your connection and retry." });
      } else {
        setAuth((previous) => previous.status === "authenticated" ? previous : data?.session
          ? { status: "authenticated", session: data.session, error: "" }
          : { status: "signed_out", session: null, error: "" });
      }
    }).catch((error) => {
      console.error("Session check failed:", error);
      if (active) setAuth((previous) => previous.status === "authenticated" ? previous : { status: "error", session: null, error: "Unable to verify your session. Check your connection and retry." });
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (auth.status === "checking") return <div className="page-loader">Loading...</div>;
  if (auth.status === "error") return (
    <div role="alert" className="page-loader" style={{ flexDirection: "column", gap: 12 }}>
      <p>{auth.error}</p>
      <button type="button" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  if (auth.status === "signed_out") return <Navigate to="/login" replace />;
  return <Outlet />;
}
