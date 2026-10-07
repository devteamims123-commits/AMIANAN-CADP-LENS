import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

import DashboardShell from "./pages/dashboards/DashboardShell";
import Dashboard from "./pages/dashboards/Dashboard";

import CADPSiteRegistration from "./pages/CADPSiteRegistration";
import CADPProfile from "./pages/CADPProfile";
import CADPProfileView from "./pages/CADPProfileView";
import ProgramsProjects from "./pages/ProgramsProjects";
import UserManagement from "./pages/UserManagement";
import MaintenanceLogs from "./pages/MaintenanceLogs";

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

      {/* ================= PROTECTED ROUTES ================= */}

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <RoleRoute
              allowedRoles={[
                "super_admin",
                "admin",
                "user",
                "viewer",
              ]}
            >
              <DashboardShell />
            </RoleRoute>
          }
        >
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

          {/* ================= CADP PROFILE ================= */}
          {/* Super Admin + Admin + User */}

          <Route
            path="/cadp-profile"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                  "user",
                ]}
              >
                <CADPProfile />
              </RoleRoute>
            }
          />

          {/* ================= CADP PROFILE VIEW ================= */}
          {/* Super Admin + Admin + User */}

          <Route
            path="/cadp-profile/:siteId"
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