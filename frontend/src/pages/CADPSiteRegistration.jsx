import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { region1Locations } from "../data/region1Locations";
import "./CADPSiteRegistration.css";

const initialForm = {
  province: "",
  municipalityCity: "",
  barangay: "",
  yearStarted: "",
  convergenceName: "",
};

function CADPSiteRegistration() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const provinces = Object.keys(region1Locations);

  const municipalities = useMemo(() => {
    if (!form.province) return [];

    return Object.keys(region1Locations[form.province] || {});
  }, [form.province]);

  const barangays = useMemo(() => {
    if (!form.province || !form.municipalityCity) return [];

    return (
      region1Locations[form.province]?.[form.municipalityCity] || []
    );
  }, [form.province, form.municipalityCity]);

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: currentYear - 1899 },
    (_, index) => currentYear - index
  );

  /* ========================================
     LOAD REGISTERED CADP SITES
  ======================================== */

  const loadSites = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("cadp_sites")
        .select(
          `
          id,
          province,
          municipality_city,
          barangay,
          year_started,
          convergence_name,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSites(data || []);
    } catch (error) {
      console.error("Unable to load CADP sites:", error);

      setErrorMessage(
        error.message || "Unable to load registered CADP sites."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  /* ========================================
     FILTERED TABLE
  ======================================== */

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesProvince =
        !provinceFilter || site.province === provinceFilter;

      const matchesSearch =
        !query ||
        site.province?.toLowerCase().includes(query) ||
        site.municipality_city?.toLowerCase().includes(query) ||
        site.barangay?.toLowerCase().includes(query) ||
        String(site.year_started || "")
          .toLowerCase()
          .includes(query) ||
        site.convergence_name?.toLowerCase().includes(query);

      return matchesProvince && matchesSearch;
    });
  }, [sites, search, provinceFilter]);

  /* ========================================
     FORM UPDATE
  ======================================== */

  const update = (field, value) => {
    setErrorMessage("");

    if (field === "province") {
      setForm((previous) => ({
        ...previous,
        province: value,
        municipalityCity: "",
        barangay: "",
      }));

      return;
    }

    if (field === "municipalityCity") {
      setForm((previous) => ({
        ...previous,
        municipalityCity: value,
        barangay: "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* ========================================
     OPEN MODAL
  ======================================== */

  const openModal = () => {
    setForm(initialForm);
    setErrorMessage("");
    setShowModal(true);
  };

  /* ========================================
     CLOSE MODAL
  ======================================== */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setForm(initialForm);
    setErrorMessage("");
  };

  /* ========================================
     REGISTER CADP SITE
  ======================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setMessage("");

    if (
      !form.province ||
      !form.municipalityCity ||
      !form.barangay ||
      !form.yearStarted ||
      !form.convergenceName.trim()
    ) {
      setErrorMessage("Please complete all fields.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your session is unavailable. Please sign in again."
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!["super_admin", "admin"].includes(profile?.role)) {
        throw new Error(
          "You are not authorized to register CADP sites."
        );
      }

      /*
       * Friendly duplicate check.
       *
       * A duplicate means ALL FIVE values are the same:
       * Province
       * Municipality / City
       * Barangay
       * Year Started
       * Convergence Name
       */

      const normalizedConvergenceName =
        form.convergenceName.trim();

      const duplicate = sites.some((site) => {
        return (
          site.province?.trim().toLowerCase() ===
            form.province.trim().toLowerCase() &&
          site.municipality_city?.trim().toLowerCase() ===
            form.municipalityCity.trim().toLowerCase() &&
          site.barangay?.trim().toLowerCase() ===
            form.barangay.trim().toLowerCase() &&
          Number(site.year_started) ===
            Number(form.yearStarted) &&
          site.convergence_name?.trim().toLowerCase() ===
            normalizedConvergenceName.toLowerCase()
        );
      });

      if (duplicate) {
        setErrorMessage(
          "This CADP site entry is already registered."
        );

        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("cadp_sites")
        .insert({
          province: form.province,
          municipality_city: form.municipalityCity,
          barangay: form.barangay,
          year_started: Number(form.yearStarted),
          convergence_name: normalizedConvergenceName,
          created_by: user.id,
        });

      if (error) {
        /*
         * PostgreSQL duplicate violation.
         * This catches duplicates blocked by the
         * cadp_sites_unique_entry database index.
         */
        if (error.code === "23505") {
          setErrorMessage(
            "This CADP site entry is already registered."
          );

          return;
        }

        throw error;
      }

      setForm(initialForm);
      setShowModal(false);

      setMessage("CADP site registered successfully.");

      await loadSites();

      window.setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message || "Unable to register CADP site."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cadp-page">
      {/* PAGE HEADER */}

      <header className="cadp-header">
        <div>
          <p>AMIANAN-CADP L.E.N.S.</p>

          <h1>CADP Sites</h1>

          <span>
            View and manage registered Convergence and
            Development Plan (CADP) sites.
          </span>
        </div>

        <button
          type="button"
          className="cadp-register-button"
          onClick={openModal}
        >
          + Register CADP Site
        </button>
      </header>

      {/* MAIN CONTENT */}

      <main className="cadp-content">
        {message && (
          <div className="cadp-page-message success">
            {message}
          </div>
        )}

        {/* FILTERS */}

        <section className="cadp-toolbar">
          <div className="cadp-search-wrapper">
            <span className="cadp-search-icon">⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search CADP sites..."
            />
          </div>

          <select
            className="cadp-province-filter"
            value={provinceFilter}
            onChange={(event) =>
              setProvinceFilter(event.target.value)
            }
          >
            <option value="">All Provinces</option>

            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </section>

        {/* TABLE */}

        <section className="cadp-table-card">
          <div className="cadp-table-heading">
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
              className="cadp-refresh-button"
              onClick={loadSites}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="cadp-table-container">
            <table className="cadp-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Municipality / City</th>
                  <th>Barangay</th>
                  <th>Year Started</th>
                  <th>Convergence Name</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="cadp-table-state"
                    >
                      Loading registered CADP sites...
                    </td>
                  </tr>
                ) : filteredSites.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="cadp-table-state"
                    >
                      No CADP sites found.
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <span className="cadp-province-badge">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ====================================
          REGISTER CADP SITE MODAL
      ==================================== */}

      {showModal && (
        <div
          className="cadp-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="cadp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cadp-modal-title"
          >
            <div className="cadp-modal-header">
              <div>
                <p>NEW CADP SITE</p>

                <h2 id="cadp-modal-title">
                  Register CADP Site
                </h2>

                <span>
                  Enter the information for the new CADP
                  site.
                </span>
              </div>

              <button
                type="button"
                className="cadp-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              className="cadp-modal-form"
              onSubmit={handleSubmit}
            >
              <div className="cadp-grid">
                <label>
                  <span>Province</span>

                  <select
                    value={form.province}
                    onChange={(event) =>
                      update(
                        "province",
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Province
                    </option>

                    {provinces.map((province) => (
                      <option
                        key={province}
                        value={province}
                      >
                        {province}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Municipality / City</span>

                  <select
                    value={form.municipalityCity}
                    onChange={(event) =>
                      update(
                        "municipalityCity",
                        event.target.value
                      )
                    }
                    disabled={!form.province}
                    required
                  >
                    <option value="">
                      Select Municipality / City
                    </option>

                    {municipalities.map(
                      (municipality) => (
                        <option
                          key={municipality}
                          value={municipality}
                        >
                          {municipality}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  <span>Barangay</span>

                  <select
                    value={form.barangay}
                    onChange={(event) =>
                      update(
                        "barangay",
                        event.target.value
                      )
                    }
                    disabled={!form.municipalityCity}
                    required
                  >
                    <option value="">
                      Select Barangay
                    </option>

                    {barangays.map((barangay) => (
                      <option
                        key={barangay}
                        value={barangay}
                      >
                        {barangay}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Year Started</span>

                  <select
                    value={form.yearStarted}
                    onChange={(event) =>
                      update(
                        "yearStarted",
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Year
                    </option>

                    {years.map((year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="cadp-full">
                  <span>Convergence Name</span>

                  <input
                    type="text"
                    value={form.convergenceName}
                    onChange={(event) =>
                      update(
                        "convergenceName",
                        event.target.value
                      )
                    }
                    placeholder="Enter convergence name"
                    required
                  />
                </label>
              </div>

              {errorMessage && (
                <div className="cadp-message error">
                  {errorMessage}
                </div>
              )}

              <p className="cadp-note">
                Available to Super Admin and Admin
                accounts. Location choices are limited to
                Region I.
              </p>

              <div className="cadp-actions">
                <button
                  type="button"
                  className="cadp-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cadp-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Registering..."
                    : "Register CADP Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CADPSiteRegistration;