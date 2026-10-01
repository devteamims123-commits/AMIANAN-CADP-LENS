import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

const rolePaths = {
  super_admin: "/super-admin",
  admin: "/admin",
  user: "/user",
  viewer: "/viewer",
};

function RoleRoute({ allowedRoles, children }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Unable to load user role:", error);
        setLoading(false);
        return;
      }

      setRole(data.role);
      setAuthorized(allowedRoles.includes(data.role));
      setLoading(false);
    };

    checkRole();
  }, [allowedRoles]);

  if (loading) {
    return <div className="page-loader">Checking access...</div>;
  }

  if (!authorized) {
    return <Navigate to={rolePaths[role] || "/login"} replace />;
  }

  return children;
}

export default RoleRoute;