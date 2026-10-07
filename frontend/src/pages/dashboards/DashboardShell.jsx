import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./DashboardShell.css";

function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const logoutDialogRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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
    role === "admin";

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
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            A
          </div>

          <div className="sidebar-brand-text">
            <strong>
              AMIANAN-CADP
            </strong>

            <span>
              L.E.N.S.
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}

          <button
            type="button"
            className={`sidebar-link ${
              isActive("/dashboard")
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span className="sidebar-icon">
              ▦
            </span>

            <span>
              Dashboard
            </span>
          </button>

          {/* CADP Site Registration */}

          {canViewCADPSites && (
            <button
              type="button"
              className={`sidebar-link ${
                isActive("/cadp-sites/register")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/cadp-sites/register")
              }
            >
              <span className="sidebar-icon">
                ⌖
              </span>

              <span>
                CADP Site Registration
              </span>
            </button>
          )}

          {/* CADP Profile */}

          {canViewCADPProfile && (
            <button
              type="button"
              className={`sidebar-link ${
                isCADPProfileActive
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/cadp-profile")
              }
            >
              <span className="sidebar-icon">
                ◫
              </span>

              <span>
                CADP Profile
              </span>
            </button>
          )}

          {/* Programs / Projects */}

          {canViewPrograms && (
            <button
              type="button"
              className={`sidebar-link ${
                isActive("/programs-projects")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/programs-projects")
              }
            >
              <span className="sidebar-icon">
                ▤
              </span>

              <span>
                Programs / Projects
              </span>
            </button>
          )}

          {/* User Management */}

          {canViewUserManagement && (
            <button
              type="button"
              className={`sidebar-link ${
                isActive("/user-management")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/user-management")
              }
            >
              <span className="sidebar-icon">
                ♙
              </span>

              <span>
                User Management
              </span>
            </button>
          )}

          {/* Maintenance Logs */}

          {canViewMaintenanceLogs && (
            <button
              type="button"
              className={`sidebar-link ${
                isActive("/maintenance-logs")
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate("/maintenance-logs")
              }
            >
              <span className="sidebar-icon">
                ≡
              </span>

              <span>
                Maintenance Logs
              </span>
            </button>
          )}

          {/* Help */}

          <button
            type="button"
            className="sidebar-link"
            disabled
          >
            <span className="sidebar-icon">
              ?
            </span>

            <span>
              Help
            </span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <small>
              Agency
            </small>

            <strong>
              {profile?.agency ||
                "No Agency Assigned"}
            </strong>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={openLogoutDialog}
          >
            Sign Out
          </button>
        </div>
      </aside>

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