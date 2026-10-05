import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./MaintenanceLogs.css";

const API_URL = import.meta.env.DEV ? "http://localhost:5000" : "";

const roleLabel = (role) =>
  ({
    super_admin: "Super Admin",
    admin: "Admin",
    user: "User",
    viewer: "Viewer",
  }[role] ||
  role ||
  "—");

function MaintenanceLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error(
            "Your session is unavailable. Please sign in again."
          );
        }

        const response = await fetch(
          `${API_URL}/api/maintenance-logs`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load maintenance logs."
          );
        }

        if (active) {
          setLogs(result.logs || []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load maintenance logs."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, []);

  const modules = useMemo(
    () =>
      [...new Set(logs.map((log) => log.module).filter(Boolean))].sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        [
          log.activity,
          log.module,
          log.details,
          log.performed_by_name,
          log.performed_by_role,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesModule =
        !moduleFilter || log.module === moduleFilter;

      const matchesStatus =
        !statusFilter || log.status === statusFilter;

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [logs, search, moduleFilter, statusFilter]);

  const formatDate = (value) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  return (
    <div className="logs-page">
      <header className="logs-header">
        <p>AMIANAN-CADP L.E.N.S.</p>
        <h1>Maintenance Logs</h1>
        <span>
          Automatic, read-only system activity and maintenance history.
        </span>
      </header>

      <section className="logs-card">
        <div className="logs-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search activity, user, or details..."
          />

          <select
            value={moduleFilter}
            onChange={(event) =>
              setModuleFilter(event.target.value)
            }
          >
            <option value="">All Modules</option>

            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <span className="logs-count">
            {filteredLogs.length}{" "}
            {filteredLogs.length === 1 ? "log" : "logs"}
          </span>
        </div>

        {error && (
          <div className="logs-message error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="logs-state">
            Loading maintenance logs...
          </div>
        ) : !error && filteredLogs.length === 0 ? (
          <div className="logs-state">
            No maintenance logs found.
          </div>
        ) : (
          !error && (
            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Activity</th>
                    <th>Module</th>
                    <th>Performed By</th>
                    <th>Role</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="logs-date">
                        {formatDate(log.created_at)}
                      </td>

                      <td>
                        <strong>{log.activity}</strong>
                      </td>

                      <td>{log.module}</td>

                      <td>
                        {log.performed_by_name || "—"}
                      </td>

                      <td>
                        {roleLabel(log.performed_by_role)}
                      </td>

                      <td className="logs-details">
                        {log.details}
                      </td>

                      <td>
                        <span
                          className={`logs-status ${log.status}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </div>
  );
}

export default MaintenanceLogs;