import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

import DashboardShell from "./pages/dashboards/DashboardShell";
import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import ViewerDashboard from "./pages/dashboards/ViewerDashboard";

import CADPSiteRegistration from "./pages/CADPSiteRegistration";
import ProgramsProjects from "./pages/ProgramsProjects";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

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
          {/* Super Admin Dashboard */}
          <Route
            path="/super-admin"
            element={
              <RoleRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </RoleRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />

          {/* User Dashboard */}
          <Route
            path="/user"
            element={
              <RoleRoute allowedRoles={["user"]}>
                <UserDashboard />
              </RoleRoute>
            }
          />

          {/* Viewer Dashboard */}
          <Route
            path="/viewer"
            element={
              <RoleRoute allowedRoles={["viewer"]}>
                <ViewerDashboard />
              </RoleRoute>
            }
          />

          {/* CADP Site Registration */}
          <Route
            path="/cadp-sites/register"
            element={
              <RoleRoute allowedRoles={["super_admin", "admin"]}>
                <CADPSiteRegistration />
              </RoleRoute>
            }
          />

          {/* Programs / Projects */}
          <Route
            path="/programs-projects"
            element={
              <RoleRoute
                allowedRoles={["super_admin", "admin", "user"]}
              >
                <ProgramsProjects />
              </RoleRoute>
            }
          />

          {/* User Management */}
          <Route
            path="/user-management"
            element={
              <RoleRoute allowedRoles={["super_admin"]}>
                <UserManagement />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      {/* Unknown Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;