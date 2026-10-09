import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./DashboardShell.css";
import amiananLogo from "../../assets/amianan-logo.png";

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
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoadingProfile(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, email, role, agency"
        )
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error(
        "Unable to load profile:",
        error
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  const role = profile?.role || "";

  const canViewCADPSites =
    role === "super_admin" ||
    role === "admin";

  const canViewCADPProfile =
    role === "super_admin" ||
    role === "admin" ||
    role === "user";

  const canViewPrograms =
    role === "super_admin" ||
    role === "admin" ||
    role === "user";

  const canViewUserManagement =
    role === "super_admin";

  const canViewMaintenanceLogs =
    role === "super_admin" ||
    role === "admin";

  const isActive = (path) =>
    location.pathname === path;

  const isCADPProfileActive =
    location.pathname === "/cadp-profile" ||
    location.pathname.startsWith("/cadp-profile/");

  const openLogoutDialog = () => {
    setLogoutError("");

    if (
      logoutDialogRef.current &&
      !logoutDialogRef.current.open
    ) {
      logoutDialogRef.current.showModal();
    }
  };

  const closeLogoutDialog = () => {
    if (loggingOut) return;

    setLogoutError("");

    if (logoutDialogRef.current?.open) {
      logoutDialogRef.current.close();
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      if (logoutDialogRef.current?.open) {
        logoutDialogRef.current.close();
      }

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setLogoutError(
        error.message ||
          "Unable to sign out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="page-loader">
        Loading...
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-sidebar">
        <div className="sidebar-brand">
          <img
              src={amiananLogo}
              alt="AMIANAN-CADP L.E.N.S. Logo"
              className="navbar-logo"
            />

          <div className="sidebar-brand-text">
            <strong>
              AMIANAN-CADP
            </strong>

            <span>
              L.E.N.S.
            </span>
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
            onClick={() => { navigate("/dashboard"); setMenuOpen(false); }}
          >
            Dashboard
          </button>

          {(canViewCADPSites || canViewCADPProfile) && (
            <details onMouseEnter={openOnHover} onMouseLeave={closeOnLeave} className="nav-dropdown" key={`cadp-${location.pathname}`}>
              <summary className={`sidebar-link ${isActive("/cadp-sites/register") || isCADPProfileActive ? "active" : ""}`}>
                CADP Management <span className="nav-chevron">⌄</span>
              </summary>
              <div className="nav-dropdown-menu">
                {canViewCADPSites && (
                  <button type="button" className={`dropdown-link ${isActive("/cadp-sites/register") ? "active" : ""}`}
                    onClick={() => { navigate("/cadp-sites/register"); setMenuOpen(false); }}>
                    CADP Site Registration
                  </button>
                )}
                {canViewCADPProfile && (
                  <button type="button" className={`dropdown-link ${isCADPProfileActive ? "active" : ""}`}
                    onClick={() => { navigate("/cadp-profile"); setMenuOpen(false); }}>
                    CADP Profile
                  </button>
                )}
              </div>
            </details>
          )}

          {canViewPrograms && (
            <button type="button" className={`sidebar-link ${isActive("/programs-projects") ? "active" : ""}`}
              onClick={() => { navigate("/programs-projects"); setMenuOpen(false); }}>
              Programs / Projects
            </button>
          )}

          {(canViewUserManagement || canViewMaintenanceLogs) && (
            <details onMouseEnter={openOnHover} onMouseLeave={closeOnLeave} className="nav-dropdown" key={`admin-${location.pathname}`}>
              <summary className={`sidebar-link ${isActive("/user-management") || isActive("/maintenance-logs") ? "active" : ""}`}>
                Administration <span className="nav-chevron">⌄</span>
              </summary>
              <div className="nav-dropdown-menu">
                {canViewUserManagement && (
                  <button type="button" className={`dropdown-link ${isActive("/user-management") ? "active" : ""}`}
                    onClick={() => { navigate("/user-management"); setMenuOpen(false); }}>
                    User Management
                  </button>
                )}
                {canViewMaintenanceLogs && (
                  <button type="button" className={`dropdown-link ${isActive("/maintenance-logs") ? "active" : ""}`}
                    onClick={() => { navigate("/maintenance-logs"); setMenuOpen(false); }}>
                    Maintenance Logs
                  </button>
                )}
              </div>
            </details>
          )}

          <button type="button" className="sidebar-link" disabled>Help</button>
        </nav>

        <div className="sidebar-footer">
          <details onMouseEnter={openOnHover} onMouseLeave={closeOnLeave} className="nav-dropdown profile-dropdown">
            <summary className="sidebar-link profile-trigger">
              Profile <span className="nav-chevron">⌄</span>
            </summary>
            <div className="nav-dropdown-menu profile-menu">
              <div className="profile-menu-info">
                <small>Agency</small>
                <strong>{profile?.agency || "No Agency Assigned"}</strong>
              </div>
              <button type="button" className="dropdown-link signout-link" onClick={openLogoutDialog}>
                Sign Out
              </button>
            </div>
          </details>
        </div>
      </header>

      <main className="dashboard-main">
        <Outlet />
      </main>

      <dialog
        ref={logoutDialogRef}
        className="logout-dialog"
        onCancel={(event) => {
          event.preventDefault();

          if (!loggingOut) {
            closeLogoutDialog();
          }
        }}
      >
        <div className="logout-dialog-mark">
          A
        </div>

        <p className="logout-dialog-eyebrow">
          AMIANAN-CADP L.E.N.S.
        </p>

        <h2>
          Sign out?
        </h2>

        <p className="logout-dialog-copy">
          Are you sure you want to sign
          out of your account?
        </p>

        {logoutError && (
          <p className="logout-dialog-error">
            {logoutError}
          </p>
        )}

        <div className="logout-dialog-actions">
          <button
            type="button"
            className="logout-dialog-cancel"
            onClick={closeLogoutDialog}
            disabled={loggingOut}
          >
            Cancel
          </button>

          <button
            type="button"
            className="logout-dialog-confirm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? "Signing Out..."
              : "Sign Out"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export default DashboardShell;
