import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { region1Locations } from "../data/region1Locations";
import "./CADPSiteRegistration.css";
import "./BarangaySelection.css";

const initialForm = {
  province: "",
  municipalityCity: "",
  barangay: [],
  yearStarted: "",
  convergenceName: "",
};

// Keep the existing text column compatible with pages that display site.barangay.
const parseBarangays = (value) => Array.from(new Set(
  (Array.isArray(value) ? value : String(value || "").split(";"))
    .map((name) => name.trim()).filter(Boolean)
));
const serializeBarangays = (value) => parseBarangays(value)
  .sort((a, b) => a.localeCompare(b)).join("; ");
const barangayKey = (value) => parseBarangays(value)
  .map((name) => name.toLowerCase()).sort().join(";");

function CADPSiteRegistration() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deletingSite, setDeletingSite] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [barangaySearch, setBarangaySearch] = useState("");

  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const provinces = Object.keys(region1Locations);

  const municipalities = useMemo(() => {
    if (!form.province) return [];

    return Object.keys(
      region1Locations[form.province] || {}
    );
  }, [form.province]);

  const barangays = useMemo(() => {
    if (!form.province || !form.municipalityCity) {
      return [];
    }

    return (
      region1Locations[form.province]?.[
        form.municipalityCity
      ] || []
    );
  }, [form.province, form.municipalityCity]);

  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    return Array.from(
      { length: currentYear - 1899 },
      (_, index) => currentYear - index
    );
  }, [currentYear]);

  /* ========================================
     LOAD CADP SITES
  ======================================== */

  const loadSites = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

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
            created_at,
            updated_at
          `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSites(data || []);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to load registered CADP sites."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  /* ========================================
     FILTERED SITES
  ======================================== */

  const filteredSites = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesProvince =
        !provinceFilter ||
        site.province === provinceFilter;

      const searchableText = [
        site.province,
        site.municipality_city,
        site.barangay,
        site.year_started,
        site.convergence_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      return matchesProvince && matchesSearch;
    });
  }, [sites, search, provinceFilter]);

  /* ========================================
     FORM UPDATE
  ======================================== */

  const update = (field, value) => {
    setErrorMessage("");

    if (field === "province") {
      setBarangaySearch("");
      setForm((previous) => ({
        ...previous,
        province: value,
        municipalityCity: "",
        barangay: [],
      }));

      return;
    }

    if (field === "municipalityCity") {
      setBarangaySearch("");
      setForm((previous) => ({
        ...previous,
        municipalityCity: value,
        barangay: [],
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* ========================================
     OPEN REGISTER MODAL
  ======================================== */

  const openModal = () => {
    setEditingSite(null);
    setForm(initialForm);
    setBarangaySearch("");
    setErrorMessage("");
    setShowModal(true);
  };

  /* ========================================
     OPEN EDIT MODAL
  ======================================== */

  const openEditModal = (site) => {
    setEditingSite(site);
    setBarangaySearch("");

    setForm({
      province: site.province || "",
      municipalityCity: site.municipality_city || "",
      barangay: parseBarangays(site.barangay),
      yearStarted: String(site.year_started || ""),
      convergenceName: site.convergence_name || "",
    });

    setErrorMessage("");
    setMessage("");
    setShowModal(true);
  };

  /* ========================================
     CLOSE FORM MODAL
  ======================================== */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSite(null);
    setForm(initialForm);
    setErrorMessage("");
  };

  /* ========================================
     CHECK DUPLICATE

     Duplicate ONLY when ALL FIVE match:
     Province
     Municipality / City
     Barangay
     Year Started
     Convergence Name
  ======================================== */

  const isDuplicate = () => {
    const province = form.province
      .trim()
      .toLowerCase();

    const municipality = form.municipalityCity
      .trim()
      .toLowerCase();

    const barangay = barangayKey(form.barangay);

    const convergence = form.convergenceName
      .trim()
      .toLowerCase();

    const year = Number(form.yearStarted);

    return sites.some((site) => {
      // Ignore the record currently being edited.
      if (
        editingSite &&
        site.id === editingSite.id
      ) {
        return false;
      }

      return (
        site.province?.trim().toLowerCase() ===
          province &&
        site.municipality_city
          ?.trim()
          .toLowerCase() === municipality &&
        barangayKey(site.barangay) === barangay &&
        Number(site.year_started) === year &&
        site.convergence_name
          ?.trim()
          .toLowerCase() === convergence
      );
    });
  };

  /* ========================================
     REGISTER / UPDATE CADP SITE
  ======================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setMessage("");

    if (
      !form.province ||
      !form.municipalityCity ||
      !form.barangay.length ||
      !form.yearStarted ||
      !form.convergenceName.trim()
    ) {
      setErrorMessage(
        "Please complete all fields."
      );
      return;
    }

    if (isDuplicate()) {
      setErrorMessage(
        "This exact CADP site entry is already registered."
      );
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

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        !["super_admin", "admin"].includes(
          profile?.role
        )
      ) {
        throw new Error(
          "You are not authorized to manage CADP sites."
        );
      }

      const siteData = {
        province: form.province.trim(),
        municipality_city:
          form.municipalityCity.trim(),
        barangay: serializeBarangays(form.barangay),
        year_started: Number(
          form.yearStarted
        ),
        convergence_name:
          form.convergenceName.trim(),
      };

      /* ---------- EDIT ---------- */

      if (editingSite) {
        const { error } = await supabase
          .from("cadp_sites")
          .update(siteData)
          .eq("id", editingSite.id);

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "This exact CADP site entry is already registered."
            );
          }

          throw error;
        }

        setMessage(
          "CADP site updated successfully."
        );
      }

      /* ---------- REGISTER ---------- */

      else {
        const { error } = await supabase
          .from("cadp_sites")
          .insert({
            ...siteData,
            created_by: user.id,
          });

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "This exact CADP site entry is already registered."
            );
          }

          throw error;
        }

        setMessage(
          "CADP site registered successfully."
        );
      }

      setShowModal(false);
      setEditingSite(null);
      setForm(initialForm);

      await loadSites();

      window.setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to save CADP site."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ========================================
     DELETE CADP SITE
  ======================================== */

  const handleDelete = async () => {
    if (!deletingSite) return;

    setDeleting(true);
    setMessage("");
    setErrorMessage("");

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

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (
        !["super_admin", "admin"].includes(
          profile?.role
        )
      ) {
        throw new Error(
          "You are not authorized to delete CADP sites."
        );
      }

      const { error } = await supabase
        .from("cadp_sites")
        .delete()
        .eq("id", deletingSite.id);

      if (error) throw error;

      setDeletingSite(null);

      setMessage(
        "CADP site deleted successfully."
      );

      await loadSites();

      window.setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to delete CADP site."
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ========================================
     RENDER
  ======================================== */

  return (
    <div className="cadp-page">
      {/* ================= HEADER ================= */}

      <header className="cadp-header">
        <div className="cadp-header-text">
          <p>AMIANAN-CADP L.E.N.S.</p>

          <h1>CADP Sites</h1>

          <span>
            View and manage registered Convergence
            and Development Plan (CADP) sites.
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

      {/* ================= CONTENT ================= */}

      <main className="cadp-content">
        {/* SUCCESS / ERROR */}

        {message && (
          <div className="cadp-message success">
            {message}
          </div>
        )}

        {errorMessage && !showModal && (
          <div className="cadp-message error">
            {errorMessage}
          </div>
        )}

        {/* ================= FILTERS ================= */}

        <div className="cadp-toolbar">
          <div className="cadp-search-box">
            <span className="cadp-search-icon">
              ⌕
            </span>

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
              setProvinceFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All Provinces
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
        </div>

        {/* ================= TABLE CARD ================= */}

        <section className="cadp-sites-card">
          <div className="cadp-sites-card-header">
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
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          <div className="cadp-table-wrapper">
            <table className="cadp-table">
              <thead>
                <tr>
                  <th>Province</th>
                  <th>Municipality / City</th>
                  <th>Barangay</th>
                  <th>Year Started</th>
                  <th>Convergence Name</th>
                  <th className="cadp-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="cadp-empty-state"
                    >
                      Loading registered CADP
                      sites...
                    </td>
                  </tr>
                ) : filteredSites.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="cadp-empty-state"
                    >
                      No registered CADP sites
                      found.
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

                      <td>
                        {site.municipality_city}
                      </td>

                      <td>{site.barangay}</td>

                      <td>
                        {site.year_started}
                      </td>

                      <td>
                        <strong>
                          {
                            site.convergence_name
                          }
                        </strong>
                      </td>

                      <td className="cadp-row-actions">
                        <button
                          type="button"
                          className="cadp-edit-button"
                          onClick={() =>
                            openEditModal(site)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="cadp-delete-button"
                          onClick={() =>
                            setDeletingSite(site)
                          }
                        >
                          Delete
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

      {/* ========================================
          REGISTER / EDIT MODAL
      ======================================== */}

      {showModal && (
        <div
          className="cadp-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
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
                <p>
                  {editingSite
                    ? "EDIT CADP SITE"
                    : "NEW CADP SITE"}
                </p>

                <h2 id="cadp-modal-title">
                  {editingSite
                    ? "Edit CADP Site"
                    : "Register CADP Site"}
                </h2>

                <span>
                  {editingSite
                    ? "Update the information for this CADP site."
                    : "Enter the information for the new CADP site."}
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

            <form onSubmit={handleSubmit}>
              <div className="cadp-grid">
                {/* PROVINCE */}

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

                    {provinces.map(
                      (province) => (
                        <option
                          key={province}
                          value={province}
                        >
                          {province}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {/* MUNICIPALITY */}

                <label>
                  <span>
                    Municipality / City
                  </span>

                  <select
                    value={
                      form.municipalityCity
                    }
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

                {/* BARANGAYS */}
                <div className="cadp-barangay-field">
                  <span id="cadp-barangay-label">Barangays *</span>
                  {!form.municipalityCity ? (
                    <div className="cadp-barangay-disabled">Select a municipality / city first</div>
                  ) : (
                    <details className="cadp-barangay-select" key={`${form.province}-${form.municipalityCity}`}>
                      <summary aria-labelledby="cadp-barangay-label cadp-barangay-summary">
                        <span id="cadp-barangay-summary">
                          {form.barangay.length ? `${form.barangay.length} barangay${form.barangay.length === 1 ? "" : "s"} selected` : "Select barangays"}
                        </span>
                      </summary>
                      <div className="cadp-barangay-panel">
                        <input type="search" aria-label="Search barangays" placeholder="Search barangays"
                          value={barangaySearch} disabled={saving}
                          onChange={(event) => setBarangaySearch(event.target.value)} />
                        <div className="cadp-barangay-options" role="group" aria-label="Available barangays">
                          {Array.from(new Set([...barangays, ...form.barangay]))
                            .filter((name) => name.toLowerCase().includes(barangaySearch.trim().toLowerCase()))
                            .map((name) => (
                              <label key={name} className="cadp-barangay-option">
                                <input type="checkbox" checked={form.barangay.includes(name)} disabled={saving}
                                  onChange={(event) => update("barangay", event.target.checked
                                    ? [...form.barangay, name]
                                    : form.barangay.filter((item) => item !== name))} />
                                <span>{name}</span>
                              </label>
                            ))}
                          {!Array.from(new Set([...barangays, ...form.barangay])).some((name) =>
                            name.toLowerCase().includes(barangaySearch.trim().toLowerCase())) && (
                            <p className="cadp-barangay-empty">No matching barangays.</p>
                          )}
                        </div>
                      </div>
                    </details>
                  )}
                  {form.barangay.length > 0 && (
                    <div className="cadp-barangay-tags" aria-label="Selected barangays">
                      {form.barangay.map((name) => (
                        <span key={name}>{name}<button type="button" disabled={saving}
                          aria-label={`Remove ${name}`} onClick={() => update("barangay", form.barangay.filter((item) => item !== name))}>×</button></span>
                      ))}
                    </div>
                  )}
                  <small className="cadp-barangay-hint">Select one or more barangays.</small>
                </div>

                {/* YEAR STARTED */}

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

                {/* CONVERGENCE */}

                <label className="cadp-full">
                  <span>
                    Convergence Name
                  </span>

                  <input
                    type="text"
                    value={
                      form.convergenceName
                    }
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
                <div className="cadp-message error cadp-modal-message">
                  {errorMessage}
                </div>
              )}

              <div className="cadp-modal-footer">
                <p className="cadp-note">
                  Available to Super Admin and
                  Admin accounts. Location
                  choices are limited to Region
                  I.
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
                      ? editingSite
                        ? "Saving..."
                        : "Registering..."
                      : editingSite
                        ? "Save Changes"
                        : "Register CADP Site"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================
          DELETE CONFIRMATION MODAL
      ======================================== */}

      {deletingSite && (
        <div
          className="cadp-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deleting
            ) {
              setDeletingSite(null);
            }
          }}
        >
          <div
            className="cadp-delete-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="cadp-delete-icon">
              !
            </div>

            <h2>Delete CADP Site?</h2>

            <p>
              Are you sure you want to delete
              this CADP site? This action cannot
              be undone.
            </p>

            <div className="cadp-delete-site-preview">
              <strong>
                {
                  deletingSite.convergence_name
                }
              </strong>

              <span>
                {deletingSite.province} •{" "}
                {
                  deletingSite.municipality_city
                }{" "}
                • {deletingSite.barangay}
              </span>

              <span>
                Year Started:{" "}
                {deletingSite.year_started}
              </span>
            </div>

            <div className="cadp-delete-actions">
              <button
                type="button"
                className="cadp-delete-cancel"
                onClick={() =>
                  setDeletingSite(null)
                }
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="cadp-delete-confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CADPSiteRegistration;
