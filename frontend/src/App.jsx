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
      {/* Public Routes */}

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

      {/* Protected Routes */}

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
          {/* Dashboard - All Roles */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Old dashboard URLs redirect to Dashboard */}

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

          {/* CADP Site Registration */}

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

          {/* CADP Profile - Registered Sites */}

          <Route
            path="/cadp-profile"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                ]}
              >
                <CADPProfile />
              </RoleRoute>
            }
          />

          {/* CADP Profile - View Individual Site */}

          <Route
            path="/cadp-profile/:siteId"
            element={
              <RoleRoute
                allowedRoles={[
                  "super_admin",
                  "admin",
                ]}
              >
                <CADPProfileView />
              </RoleRoute>
            }
          />

          {/* Programs / Projects */}

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

          {/* User Management */}

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

          {/* Maintenance Logs */}

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

      {/* Unknown Route */}

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