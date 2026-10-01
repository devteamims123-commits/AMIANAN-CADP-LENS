import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function DashboardShell({ title, role }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">AMIANAN-CADP L.E.N.S.</p>
          <h1>{title}</h1>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-card">
          <span>Current Role</span>
          <strong>{role}</strong>

          <p>
            Authentication is working. The actual dashboard modules
            will be added here next.
          </p>
        </div>
      </section>
    </main>
  );
}

export default DashboardShell;