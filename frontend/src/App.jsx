import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";

import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import ViewerDashboard from "./pages/dashboards/ViewerDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/super-admin"
          element={
            <RoleRoute allowedRoles={["super_admin"]}>
              <SuperAdminDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/user"
          element={
            <RoleRoute allowedRoles={["user"]}>
              <UserDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/viewer"
          element={
            <RoleRoute allowedRoles={["viewer"]}>
              <ViewerDashboard />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;