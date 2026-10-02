import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./DashboardShell.css";

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
  viewer: "Viewer",
};

const dashboardPaths = {
  super_admin: "/super-admin",
  admin: "/admin",
  user: "/user",
  viewer: "/viewer",
};

function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) console.error("Unable to load user role:", error);
      if (mounted) {
        setRole(data?.role || null);
        setLoading(false);
      }
    };

    loadRole();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) return <div className="page-loader">Loading dashboard...</div>;
  if (!role) return <div className="page-loader">Unable to load your role.</div>;

  const canManageCADPSites = ["super_admin", "admin"].includes(role);
  const canAccessPrograms = ["super_admin", "admin", "user"].includes(role);
  const isActive = (path) => location.pathname === path;

  return (
    <main className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">L</div>
          <div className="sidebar-brand-text">
            <strong>AMIANAN-CADP</strong>
            <span>L.E.N.S.</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button type="button" className={`sidebar-link ${isActive(dashboardPaths[role]) ? "active" : ""}`} onClick={() => navigate(dashboardPaths[role])}>
            <span className="sidebar-icon">▦</span><span>Dashboard</span>
          </button>

          {canManageCADPSites && (
            <button type="button" className={`sidebar-link ${isActive("/cadp-sites/register") ? "active" : ""}`} onClick={() => navigate("/cadp-sites/register")}>
              <span className="sidebar-icon">⌖</span><span>CADP Site Registration</span>
            </button>
          )}

          {canAccessPrograms && (
            <button type="button" className="sidebar-link" disabled title="Coming next">
              <span className="sidebar-icon">▤</span><span>Programs / Projects</span>
            </button>
          )}

          {role === "super_admin" && (
            <button type="button" className="sidebar-link" disabled title="Coming next">
              <span className="sidebar-icon">♙</span><span>User Management</span>
            </button>
          )}

          {["super_admin", "admin"].includes(role) && (
            <button type="button" className="sidebar-link" disabled title="Coming next">
              <span className="sidebar-icon">⚙</span><span>Maintenance Logs</span>
            </button>
          )}

          <button type="button" className="sidebar-link" disabled title="Coming next">
            <span className="sidebar-icon">?</span><span>Help</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user"><small>Current Role</small><strong>{roleLabels[role] || role}</strong></div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <section className="dashboard-main"><Outlet /></section>
    </main>
  );
}

export default DashboardShell;
