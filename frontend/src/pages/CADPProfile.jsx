
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useProtectedAuth } from "../components/auth/ProtectedRoute";
import "./CADPProfile.css";

function CADPProfile() {
  const navigate = useNavigate();
  const { profile, role } = useProtectedAuth();

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isLGU =
    role === "user" &&
    profile?.organization_type?.toLowerCase() === "lgu";

  const loadSites = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("cadp_sites")
        .select(`
          id,
          province,
          municipality_city,
          barangay,
          year_started,
          convergence_name,
          created_at
        `);

      if (isLGU) {
        if (!profile?.agency_lgu_id) {
          throw new Error(
            "Your account is not linked to a registered LGU."
          );
        }

        const { data: registeredLGU, error: lguError } =
          await supabase
            .from("agency_lgus")
            .select("province, municipality_city")
            .eq("id", profile.agency_lgu_id)
            .single();

        if (lguError) throw lguError;

        if (
          !registeredLGU?.province ||
          !registeredLGU?.municipality_city
        ) {
          throw new Error(
            "Your LGU registration has incomplete location information."
          );
        }

        query = query
          .eq("province", registeredLGU.province)
          .eq(
            "municipality_city",
            registeredLGU.municipality_city
          );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      setSites(data || []);
    } catch (error) {
      console.error("Unable to load CADP sites:", error);
      setSites([]);
      setErrorMessage(
        error.message || "Unable to load registered CADP sites."
      );
    } finally {
      setLoading(false);
    }
  }, [isLGU, profile?.agency_lgu_id]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const filteredSites = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return sites;

    return sites.filter((site) =>
      [
        site.province,
        site.municipality_city,
        site.barangay,
        site.year_started,
        site.convergence_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [sites, search]);

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div>
          <p>AMIANAN-CADP L.E.N.S.</p>
          <h1>CADP Profile</h1>

          <span>
            View the complete profile of each registered
            convergence area.
          </span>
        </div>
      </header>

      <main className="profile-page-content">
        {errorMessage && (
          <div className="profile-message error">
            {errorMessage}
          </div>
        )}

        <div className="profile-toolbar">
          <div className="profile-search">
            <span>⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search CADP sites..."
            />
          </div>
        </div>

        <section className="profile-sites-card">
          <div className="profile-card-header">
            <div>
              <h2>Registered CADP Sites</h2>

              <p>
                {filteredSites.length}{" "}
                {filteredSites.length === 1
                  ? "registered site"
                  : "registered sites"}
              </p>
            </div>

            <button
              type="button"
              className="profile-refresh"
              onClick={loadSites}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="profile-table-wrapper">
            <table className="profile-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Municipality / City</th>
                  <th>Barangay</th>
                  <th>Year Started</th>
                  <th>Convergence Name</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="profile-empty">
                      Loading registered CADP sites...
                    </td>
                  </tr>
                ) : filteredSites.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="profile-empty">
                      {errorMessage
                        ? "Unable to display CADP sites."
                        : "No registered CADP sites found."}
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <span className="profile-province">
                          {site.province}
                        </span>
                      </td>

                      <td>{site.municipality_city}</td>
                      <td>{site.barangay}</td>
                      <td>{site.year_started}</td>

                      <td>
                        <strong>
                          {site.convergence_name}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="profile-view-button"
                          onClick={() =>
                            navigate(
                              `/cadp-profile/${site.id}`
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CADPProfile;
