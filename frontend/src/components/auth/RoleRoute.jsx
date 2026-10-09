import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

const ALL_ROLES = ["super_admin", "admin", "user", "viewer"];

function RoleRoute({ allowedRoles = ALL_ROLES, children }) {
  // A stable string prevents a new inline allowedRoles array in App.jsx
  // from restarting the access check on every parent render.
  const allowedRolesKey = allowedRoles.join("|");
  const [access, setAccess] = useState({ loading: true, role: null, signedIn: true });

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      setAccess((previous) => ({ ...previous, loading: true }));
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          if (active) setAccess({ loading: false, role: null, signedIn: false });
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error || !data?.role) {
          console.error("Unable to load user role:", error);
          if (active) setAccess({ loading: false, role: null, signedIn: true });
          return;
        }

        if (active) setAccess({ loading: false, role: data.role, signedIn: true });
      } catch (error) {
        console.error("Unable to check access:", error);
        if (active) setAccess({ loading: false, role: null, signedIn: true });
      }
    }

    checkAccess();
    return () => { active = false; };
  }, [allowedRolesKey]);

  if (access.loading) {
    return (
      <div role="status" style={{ minHeight: 180, display: "grid", placeItems: "center", color: "#235e26", fontWeight: 600 }}>
        Checking access...
      </div>
    );
  }

  if (!access.signedIn) return <Navigate to="/login" replace />;

  if (!access.role || !allowedRolesKey.split("|").includes(access.role)) {
    return (
      <div role="alert" style={{ padding: "32px", color: "#174c2d" }}>
        <h2>Access denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}

export default RoleRoute;
