import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./ProgramsProjects.css";

const TARGET_PERIODS = [
  {
    label: "2025–2026",
    field: "physical_target_2025_2026",
  },
  {
    label: "2026–2027",
    field: "physical_target_2026_2027",
  },
  {
    label: "2027–2028",
    field: "physical_target_2027_2028",
  },
  {
    label: "2028–2029",
    field: "physical_target_2028_2029",
  },
];

const STATUS_OPTIONS = [
  "Proposed",
  "Ongoing",
  "Completed",
  "On Hold",
  "Cancelled",
];

const initialForm = {
  cadpSiteId: "",
  intervention: "",
  kpi: "",
  sourceOfFund: "",
  status: "Proposed",

  physicalTarget2025_2026: "",
  physicalTarget2026_2027: "",
  physicalTarget2027_2028: "",
  physicalTarget2028_2029: "",

  financialTarget: "",
  remarks: "",
};

function ProgramsProjects() {
  const [records, setRecords] = useState([]);
  const [sites, setSites] = useState([]);

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedPeriod, setSelectedPeriod] =
    useState("physical_target_2025_2026");

  const [search, setSearch] = useState("");

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [sitesResult, recordsResult] =
        await Promise.all([
          supabase
            .from("cadp_sites")
            .select(
              "id, convergence_name, province, municipality_city, barangay"
            )
            .order("convergence_name"),

          supabase
            .from("programs_projects")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),
        ]);

      if (sitesResult.error) {
        throw sitesResult.error;
      }

      if (recordsResult.error) {
        throw recordsResult.error;
      }

      const siteData = sitesResult.data || [];
      const recordData = recordsResult.data || [];

      setSites(siteData);
      setRecords(recordData);

      if (!selectedSite && siteData.length > 0) {
        setSelectedSite(siteData[0].id);
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to load Programs and Projects."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedPeriodLabel =
    TARGET_PERIODS.find(
      (period) => period.field === selectedPeriod
    )?.label || "2025–2026";

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSite =
        !selectedSite ||
        record.cadp_site_id === selectedSite;

      const matchesSearch =
        !query ||
        [
          record.intervention,
          record.kpi,
          record.source_of_fund,
          record.status,
          record.physical_target_2025_2026,
          record.physical_target_2026_2027,
          record.physical_target_2027_2028,
          record.physical_target_2028_2029,
          record.financial_target,
          record.remarks,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      return matchesSite && matchesSearch;
    });
  }, [records, selectedSite, search]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrorMessage("");
  };

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      ...initialForm,
      cadpSiteId:
        selectedSite || sites[0]?.id || "",
    });

    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const openEditForm = (record) => {
    setEditingId(record.id);

    setForm({
      cadpSiteId:
        record.cadp_site_id || "",

      intervention:
        record.intervention || "",

      kpi:
        record.kpi || "",

      sourceOfFund:
        record.source_of_fund || "",

      status:
        record.status || "Proposed",

      physicalTarget2025_2026:
        record.physical_target_2025_2026 || "",

      physicalTarget2026_2027:
        record.physical_target_2026_2027 || "",

      physicalTarget2027_2028:
        record.physical_target_2027_2028 || "",

      physicalTarget2028_2029:
        record.physical_target_2028_2029 || "",

      financialTarget:
        record.financial_target !== null &&
        record.financial_target !== undefined
          ? String(record.financial_target)
          : "",

      remarks:
        record.remarks || "",
    });

    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
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

      if (
        !form.cadpSiteId ||
        !form.intervention.trim() ||
        !form.kpi.trim() ||
        !form.sourceOfFund.trim() ||
        !form.status
      ) {
        throw new Error(
          "Please complete all required fields."
        );
      }

      const financialTarget =
        form.financialTarget === ""
          ? null
          : Number(form.financialTarget);

      if (
        financialTarget !== null &&
        (!Number.isFinite(financialTarget) ||
          financialTarget < 0)
      ) {
        throw new Error(
          "Financial Target must be a valid positive amount."
        );
      }

      const payload = {
        cadp_site_id:
          form.cadpSiteId,

        intervention:
          form.intervention.trim(),

        kpi:
          form.kpi.trim(),

        source_of_fund:
          form.sourceOfFund.trim(),

        status:
          form.status,

        physical_target_2025_2026:
          form.physicalTarget2025_2026.trim() ||
          null,

        physical_target_2026_2027:
          form.physicalTarget2026_2027.trim() ||
          null,

        physical_target_2027_2028:
          form.physicalTarget2027_2028.trim() ||
          null,

        physical_target_2028_2029:
          form.physicalTarget2028_2029.trim() ||
          null,

        financial_target:
          financialTarget,

        remarks:
          form.remarks.trim() || null,

        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("programs_projects")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        setMessage(
          "Program / Project updated successfully."
        );
      } else {
        const { error } = await supabase
          .from("programs_projects")
          .insert({
            ...payload,
            created_by: user.id,
          });

        if (error) {
          throw error;
        }

        setMessage(
          "Program / Project added successfully."
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);

      await loadData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to save Program / Project."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this Program / Project?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("programs_projects")
        .delete()
        .eq("id", record.id);

      if (error) {
        throw error;
      }

      setMessage(
        "Program / Project deleted successfully."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message ||
          "Unable to delete Program / Project."
      );
    }
  };

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(value));
  };

  return (
    <div className="programs-page">
      <header className="module-header programs-header">
        <div>
          <p className="module-eyebrow">
            AMIANAN-CADP L.E.N.S.
          </p>

          <h1>Programs and Projects</h1>

          <p>
            Manage programs, projects, physical targets,
            and funding information for registered CADP
            sites.
          </p>
        </div>

        <button
          type="button"
          className="programs-add-button"
          onClick={openAddForm}
        >
          + Add Program / Project
        </button>
      </header>

      <section className="programs-content">
        <div className="programs-toolbar">
          <label className="programs-site-field">
            <span>CADP Site</span>

            <select
              value={selectedSite}
              onChange={(event) =>
                setSelectedSite(event.target.value)
              }
            >
              <option value="">
                All CADP Sites
              </option>

              {sites.map((site) => (
                <option
                  key={site.id}
                  value={site.id}
                >
                  {site.convergence_name}
                </option>
              ))}
            </select>
          </label>

          <label className="programs-period-field">
            <span>Physical Target Year</span>

            <select
              value={selectedPeriod}
              onChange={(event) =>
                setSelectedPeriod(event.target.value)
              }
            >
              {TARGET_PERIODS.map((period) => (
                <option
                  key={period.field}
                  value={period.field}
                >
                  {period.label}
                </option>
              ))}
            </select>
          </label>

          <label className="programs-search-field">
            <span>Search</span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Programs / Projects..."
            />
          </label>

          <p className="programs-result-count">
            {filteredRecords.length}{" "}
            {filteredRecords.length === 1
              ? "record"
              : "records"}
          </p>
        </div>

        {message && (
          <div className="programs-message success">
            {message}
          </div>
        )}

        {errorMessage && !showForm && (
          <div className="programs-message error">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="programs-empty-state">
            Loading Programs and Projects...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="programs-empty-state">
            <h2>
              No Programs and Projects found
            </h2>

            <p>
              Add a Program / Project to the selected
              CADP site.
            </p>
          </div>
        ) : (
          <div className="programs-table-scroll">
            <table className="programs-table">
              <thead>
                <tr>
                  <th>
                    Proposed Inputs, Activities,
                    Interventions
                  </th>

                  <th>
                    KPI (Key Performance Indicators)
                  </th>

                  <th>Source of Fund</th>

                  <th>Status</th>

                  <th>
                    Physical Target
                    <span className="programs-period-label">
                      {selectedPeriodLabel}
                    </span>
                  </th>

                  <th>Financial Target</th>

                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {record.intervention}
                    </td>

                    <td>
                      {record.kpi}
                    </td>

                    <td>
                      {record.source_of_fund}
                    </td>

                    <td>
                      <span
                        className={`programs-status ${record.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {record.status}
                      </span>
                    </td>

                    <td className="programs-target">
                      {record[selectedPeriod] || "—"}
                    </td>

                    <td className="programs-financial">
                      {formatMoney(
                        record.financial_target
                      )}
                    </td>

                    <td>
                      <div className="programs-actions">
                        <button
                          type="button"
                          className="programs-edit"
                          onClick={() =>
                            openEditForm(record)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="programs-delete"
                          onClick={() =>
                            handleDelete(record)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="programs-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <form
            className="programs-modal"
            onSubmit={handleSubmit}
          >
            <div className="programs-modal-header">
              <div>
                <p className="module-eyebrow">
                  AMIANAN-CADP L.E.N.S.
                </p>

                <h2>
                  {editingId
                    ? "Edit Program / Project"
                    : "Add Program / Project"}
                </h2>
              </div>

              <button
                type="button"
                className="programs-modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="programs-form-grid">
              <label className="programs-full">
                <span>CADP Site *</span>

                <select
                  value={form.cadpSiteId}
                  onChange={(event) =>
                    updateForm(
                      "cadpSiteId",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select CADP Site
                  </option>

                  {sites.map((site) => (
                    <option
                      key={site.id}
                      value={site.id}
                    >
                      {site.convergence_name} —{" "}
                      {site.municipality_city},{" "}
                      {site.province}
                    </option>
                  ))}
                </select>
              </label>

              <label className="programs-full">
                <span>
                  Proposed Inputs, Activities,
                  Interventions *
                </span>

                <textarea
                  value={form.intervention}
                  onChange={(event) =>
                    updateForm(
                      "intervention",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label className="programs-full">
                <span>
                  KPI (Key Performance Indicators) *
                </span>

                <textarea
                  value={form.kpi}
                  onChange={(event) =>
                    updateForm(
                      "kpi",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                <span>Source of Fund *</span>

                <input
                  type="text"
                  value={form.sourceOfFund}
                  onChange={(event) =>
                    updateForm(
                      "sourceOfFund",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                <span>Status *</span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm(
                      "status",
                      event.target.value
                    )
                  }
                  required
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="programs-full programs-target-section">
                <div className="programs-target-title">
                  Physical Target
                </div>

                <div className="programs-target-inputs">
                  <label>
                    <span>2025–2026</span>

                    <input
                      type="text"
                      value={
                        form.physicalTarget2025_2026
                      }
                      onChange={(event) =>
                        updateForm(
                          "physicalTarget2025_2026",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 10 km"
                    />
                  </label>

                  <label>
                    <span>2026–2027</span>

                    <input
                      type="text"
                      value={
                        form.physicalTarget2026_2027
                      }
                      onChange={(event) =>
                        updateForm(
                          "physicalTarget2026_2027",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 15 km"
                    />
                  </label>

                  <label>
                    <span>2027–2028</span>

                    <input
                      type="text"
                      value={
                        form.physicalTarget2027_2028
                      }
                      onChange={(event) =>
                        updateForm(
                          "physicalTarget2027_2028",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 20 km"
                    />
                  </label>

                  <label>
                    <span>2028–2029</span>

                    <input
                      type="text"
                      value={
                        form.physicalTarget2028_2029
                      }
                      onChange={(event) =>
                        updateForm(
                          "physicalTarget2028_2029",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 25 km"
                    />
                  </label>
                </div>
              </div>

              <label className="programs-full">
                <span>Financial Target</span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.financialTarget}
                  onChange={(event) =>
                    updateForm(
                      "financialTarget",
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                />
              </label>

              <label className="programs-full">
                <span>Remarks</span>

                <textarea
                  value={form.remarks}
                  onChange={(event) =>
                    updateForm(
                      "remarks",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            {errorMessage && (
              <div className="programs-message error">
                {errorMessage}
              </div>
            )}

            <div className="programs-modal-actions">
              <button
                type="button"
                className="programs-cancel"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="programs-save"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Program / Project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ProgramsProjects;