import { useProtectedAuth } from "./ProtectedRoute";

const ALL_ROLES = ["super_admin", "admin", "user", "viewer"];

export default function RoleRoute({ allowedRoles = ALL_ROLES, children }) {
  const { role } = useProtectedAuth();

  if (!allowedRoles.includes(role)) {
    return (
      <div role="alert" style={{ padding: 32 }}>
        <h2>Access denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
