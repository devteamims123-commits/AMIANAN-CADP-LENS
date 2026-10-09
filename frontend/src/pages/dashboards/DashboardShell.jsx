import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import amiananLogo from "../../assets/amianan-logo.png";
import "./DashboardShell.css";

function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const logoutDialogRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const openOnHover = (event) => {
    if (window.matchMedia("(min-width: 1101px) and (hover: hover)").matches) {
      event.currentTarget.open = true;
    }
  };

  const closeOnLeave = (event) => {
    if (window.matchMedia("(min-width: 1101px) and (hover: hover)").matches) {
      event.currentTarget.open = false;
    }
  };

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate("/login", { replace: true });
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, username, email, role, agency")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        if (active) setProfile(data);
      } catch (error) {
        console.error("Unable to load profile:", error);
      } finally {
        if (active) setLoadingProfile(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, [navigate]);

  const role = profile?.role || "";
  const canViewCADPSites = role === "super_admin" || role === "admin";
  const canViewCADPProfile = canViewCADPSites || role === "user";
  const canViewPrograms = canViewCADPProfile;
  const canViewUserManagement = role === "super_admin";
  const canViewMaintenanceLogs = canViewCADPSites;
  const isActive = (path) => location.pathname === path;
  const isCADPProfileActive = location.pathname === "/cadp-profile" || location.pathname.startsWith("/cadp-profile/");

  const goTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const openLogoutDialog = () => {
    setLogoutError("");
    if (logoutDialogRef.current && !logoutDialogRef.current.open) {
      logoutDialogRef.current.showModal();
    }
  };

  const closeLogoutDialog = () => {
    if (loggingOut) return;
    setLogoutError("");
    if (logoutDialogRef.current?.open) logoutDialogRef.current.close();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (logoutDialogRef.current?.open) logoutDialogRef.current.close();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setLogoutError(error.message || "Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  if (loadingProfile) return <div className="page-loader">Loading...</div>;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-sidebar">
        <div className="sidebar-brand">
          <img src={amiananLogo} alt="AMIANAN-CADP L.E.N.S. Logo" className="navbar-logo" />
          <div className="sidebar-brand-text">
            <strong>AMIANAN-CADP</strong>
            <span>L.E.N.S.</span>
          </div>
        </div>

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          ☰
        </button>

        <nav className={`sidebar-nav ${menuOpen ? "open" : ""}`}>
          <button
            type="button"
            className={`sidebar-link ${isActive("/dashboard") ? "active" : ""}`}
            onClick={() => goTo("/dashboard")}
          >
            Dashboard
          </button>

          {role === "user" ? (
            <button
              type="button"
              className={`sidebar-link ${isCADPProfileActive ? "active" : ""}`}
              onClick={() => goTo("/cadp-profile")}
            >
              CADP Profile
            </button>
          ) : (
            (canViewCADPSites || canViewCADPProfile) && (
              <details
                className="nav-dropdown"
                key={`cadp-${location.pathname}`}
                onMouseEnter={openOnHover}
                onMouseLeave={closeOnLeave}
              >
                <summary className={`sidebar-link ${isActive("/cadp-sites/register") || isCADPProfileActive ? "active" : ""}`}>
                  CADP Management <span className="nav-chevron" aria-hidden="true" />
                </summary>
                <div className="nav-dropdown-menu">
                  {canViewCADPSites && (
                    <button type="button" className={`dropdown-link ${isActive("/cadp-sites/register") ? "active" : ""}`} onClick={() => goTo("/cadp-sites/register")}>
                      CADP Site Registration
                    </button>
                  )}
                  {canViewCADPProfile && (
                    <button type="button" className={`dropdown-link ${isCADPProfileActive ? "active" : ""}`} onClick={() => goTo("/cadp-profile")}>
                      CADP Profile
                    </button>
                  )}
                </div>
              </details>
            )
          )}

          {canViewPrograms && (
            <button
              type="button"
              className={`sidebar-link ${isActive("/programs-projects") ? "active" : ""}`}
              onClick={() => goTo("/programs-projects")}
            >
              Programs / Projects
            </button>
          )}

          {(canViewUserManagement || canViewMaintenanceLogs) && (
            <details
              className="nav-dropdown"
              key={`admin-${location.pathname}`}
              onMouseEnter={openOnHover}
              onMouseLeave={closeOnLeave}
            >
              <summary className={`sidebar-link ${isActive("/user-management") || isActive("/maintenance-logs") ? "active" : ""}`}>
                Administration <span className="nav-chevron" aria-hidden="true" />
              </summary>
              <div className="nav-dropdown-menu">
                {canViewUserManagement && (
                  <button
                    type="button"
                    className={`dropdown-link ${isActive("/user-management") ? "active" : ""}`}
                    onClick={() => goTo("/user-management")}
                  >
                    User Management
                  </button>
                )}
                {canViewMaintenanceLogs && (
                  <button
                    type="button"
                    className={`dropdown-link ${isActive("/maintenance-logs") ? "active" : ""}`}
                    onClick={() => goTo("/maintenance-logs")}
                  >
                    Maintenance Logs
                  </button>
                )}
              </div>
            </details>
          )}
          <button type="button" className="sidebar-link" disabled>Help</button>
        </nav>

        <div className="sidebar-footer navbar-user-section">
          <div className="navbar-user-info">
            <span className="navbar-user-label">AGENCY</span>
            <strong className="navbar-user-name" title={profile?.agency || "No Agency Assigned"}>
              {profile?.agency || "No Agency Assigned"}
            </strong>
          </div>
          <button
            type="button"
            className="navbar-signout-icon"
            onClick={openLogoutDialog}
            aria-label="Sign Out"
            title="Sign Out"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      <main className="dashboard-main"><Outlet /></main>

      <dialog
        ref={logoutDialogRef}
        className="logout-dialog"
        onCancel={(event) => {
          event.preventDefault();
          if (!loggingOut) closeLogoutDialog();
        }}
      >
        <div className="logout-dialog-mark">A</div>
        <p className="logout-dialog-eyebrow">AMIANAN-CADP L.E.N.S.</p>
        <h2>Sign out?</h2>
        <p className="logout-dialog-copy">Are you sure you want to sign out of your account?</p>
        {logoutError && <p className="logout-dialog-error">{logoutError}</p>}
        <div className="logout-dialog-actions">
          <button type="button" className="logout-dialog-cancel" onClick={closeLogoutDialog} disabled={loggingOut}>Cancel</button>
          <button type="button" className="logout-dialog-confirm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export default DashboardShell;
