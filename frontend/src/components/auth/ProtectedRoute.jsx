import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../../services/supabase";

function ProtectedRoute() {
  const [auth, setAuth] = useState({ loading: true, session: null });

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setAuth({ loading: false, session });
      }
    );

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Unable to load session:", error);
        setAuth((previous) => ({
          loading: false,
          session: data?.session ?? previous.session,
        }));
      })
      .catch((error) => {
        console.error("Unable to load session:", error);
        if (active) setAuth((previous) => ({ ...previous, loading: false }));
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Only the first authentication check may use the full-screen loader.
  if (auth.loading) {
    return <div className="page-loader">Loading...</div>;
  }

  if (!auth.session) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
