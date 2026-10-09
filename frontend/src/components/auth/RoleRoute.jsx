import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

const ALL_ROLES = ["super_admin", "admin", "user", "viewer"];

export default function RoleRoute({ allowedRoles = ALL_ROLES, children }) {
  const allowedRolesKey = allowedRoles.join("|");
  const [retry, setRetry] = useState(0);
  const [access, setAccess] = useState({ status: "checking", role: null });

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      setAccess({ status: "checking", role: null });
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          if (active) setAccess({ status: "signed_out", role: null });
          return;
        }
        const { data, error } = await supabase.from("profiles")
          .select("role").eq("id", session.user.id).single();
        if (error) throw error;
        if (!data?.role) throw new Error("Profile role is missing");
        if (active) setAccess({ status: "ready", role: data.role });
      } catch (error) {
        console.error("Unable to verify role:", error);
        if (active) setAccess({ status: "error", role: null });
      }
    }
    checkAccess();
    return () => { active = false; };
  }, [allowedRolesKey, retry]);

  if (access.status === "checking") return <div role="status" style={{ padding: 32 }}>Checking access...</div>;
  if (access.status === "signed_out") return <Navigate to="/login" replace />;
  if (access.status === "error") return <div role="alert" style={{ padding: 32 }}>
    Unable to verify your permissions. <button type="button" onClick={() => setRetry((n) => n + 1)}>Retry</button>
  </div>;
  if (!allowedRolesKey.split("|").includes(access.role)) return <div role="alert" style={{ padding: 32 }}>
    <h2>Access denied</h2><p>You do not have permission to view this page.</p>
  </div>;
  return children;
}
