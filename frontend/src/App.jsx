import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

import DashboardShell from "./pages/dashboards/DashboardShell";
import Dashboard from "./pages/dashboards/Dashboard";

import CADPSiteRegistration from "./pages/CADPSiteRegistration";
import CADPProfile from "./pages/CADPProfile";
import CADPProfileView from "./pages/CADPProfileView";
import ProgramsProjects from "./pages/ProgramsProjects";
import UserManagement from "./pages/UserManagement";
import AgencyLGURegistration from "./pages/AgencyLGURegistration";
import MaintenanceLogs from "./pages/MaintenanceLogs";
import Help from "./pages/Help";

function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* ================= PROTECTED ROUTES ================= */}

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardShell />}>
          <Route path="/help" element={<Help />} />

          {/* ================= DASHBOARD ================= */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Old dashboard URLs */}

          <Route
            path="/super-admin"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/admin"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/user"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/viewer"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* ================= CADP SITE REGISTRATION ================= */}
          {/* Super Admin + Admin only */}

          <Route
            path="/cadp-sites/register"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                ]}
              >
                <CADPSiteRegistration />
              </RoleRoute>
            }
          />


          {/* ================= CADP PROFILE (USER ONLY) ================= */}
          <Route
            path="/cadp-profile"
            element={
              <RoleRoute allowedRoles={["user"]}>
                <CADPProfile />
              </RoleRoute>
            }
          />

          {/* Keep the existing CADPProfile listing's View links working. */}
          <Route
            path="/cadp-profile/:siteId"
            element={
              <RoleRoute allowedRoles={["user"]}>
                <CADPProfileView />
              </RoleRoute>
            }
          />

          {/* ================= CADP SITE DETAILS ================= */}
          {/* Super Admin + Admin + User */}

          <Route
            path="/cadp-sites/:siteId"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "user",
                ]}
              >
                <CADPProfileView />
              </RoleRoute>
            }
          />

          {/* ================= PROGRAMS / PROJECTS ================= */}

          <Route
            path="/programs-projects"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "user",
                ]}
              >
                <ProgramsProjects />
              </RoleRoute>
            }
          />

          {/* ================= USER MANAGEMENT ================= */}
          {/* Super Admin only */}

          <Route
            path="/user-management"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                ]}
              >
                <UserManagement />
              </RoleRoute>
            }
          />

          {/* ================= AGENCY / LGU REGISTRATION ================= */}
          {/* Super Admin only */}
          <Route
            path="/agency-lgu-registration"
            element={
              <RoleRoute allowedRoles={["super_admin"]}>
                <AgencyLGURegistration />
              </RoleRoute>
            }
          />

          {/* ================= MAINTENANCE LOGS ================= */}
          {/* Super Admin + Admin */}

          <Route
            path="/maintenance-logs"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                ]}
              >
                <MaintenanceLogs />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      {/* ================= UNKNOWN ROUTE ================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
