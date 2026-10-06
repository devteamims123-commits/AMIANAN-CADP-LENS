import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import "./MaintenanceLogs.css";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "";

const CHECKLIST_ITEMS = [
  {
    key: "activities_reviewed",
    label:
      "Maintenance activities have been reviewed",
  },
  {
    key: "testing_completed",
    label:
      "Required testing / verification was completed, where applicable",
  },
  {
    key: "backups_completed",
    label:
      "Required backups were completed, where applicable",
  },
  {
    key: "users_informed",
    label:
      "System owner / end-user was informed, where applicable",
  },
  {
    key: "documentation_updated",
    label:
      "Related documentation was updated, where applicable",
  },
];

const EMPTY_CHECKLIST = {
  activities_reviewed: false,
  testing_completed: false,
  backups_completed: false,
  users_informed: false,
  documentation_updated: false,
};

const createEmptyForm = () => ({
  maintenance_date: "",
  status: "active",
  issue: "",
  action_taken: "",
  downtime: "",
  persons_responsible: "",
  observation_result: "",
  action_needed: "",
  checklist: { ...EMPTY_CHECKLIST },
  proof_link: "",
});

function MaintenanceLogs() {
  const [logs, setLogs] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");
  const [dateFilter, setDateFilter] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] =
    useState(false);
  const [showView, setShowView] =
    useState(false);
  const [showDelete, setShowDelete] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [form, setForm] = useState(
    createEmptyForm()
  );

  const [formError, setFormError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session is unavailable. Please sign in again."
      );
    }

    return session.access_token;
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        `${API_URL}/api/maintenance-logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to load maintenance records."
        );
      }

      setLogs(result.logs || []);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load maintenance records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        [
          log.issue,
          log.action_taken,
          log.downtime,
          log.persons_responsible,
          log.observation_result,
          log.action_needed,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        !statusFilter ||
        log.status === statusFilter;

      const matchesDate =
        !dateFilter ||
        log.maintenance_date === dateFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    logs,
    search,
    statusFilter,
    dateFilter,
  ]);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(
      `${value}T00:00:00`
    );

    return new Intl.DateTimeFormat(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }
    ).format(date);
  };

  const statusLabel = (status) => {
    if (status === "for_monitoring") {
      return "For Monitoring";
    }

    if (status === "resolved") {
      return "Resolved";
    }

    if (status === "active") {
      return "Active";
    }

    return status || "—";
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setFormError("");
  };

  const openAdd = () => {
    resetForm();
    setSuccess("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    resetForm();
  };

  const openEdit = (record) => {
    setEditingId(record.id);

    setForm({
      maintenance_date:
        record.maintenance_date || "",

      status:
        record.status || "active",

      issue:
        record.issue || "",

      action_taken:
        record.action_taken || "",

      downtime:
        record.downtime || "",

      persons_responsible:
        record.persons_responsible || "",

      observation_result:
        record.observation_result || "",

      action_needed:
        record.action_needed || "",

      checklist: {
        ...EMPTY_CHECKLIST,
        ...(record.checklist || {}),
      },

      proof_link:
        record.proof_link || "",
    });

    setFormError("");
    setSuccess("");
    setError("");
    setShowView(false);
    setShowForm(true);
  };

  const openView = (record) => {
    setSelectedRecord(record);
    setShowView(true);
  };

  const openDelete = (record) => {
    setSelectedRecord(record);
    setShowDelete(true);
  };

  const handleInputChange = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleChecklistChange = (key) => {
    setForm((current) => ({
      ...current,

      checklist: {
        ...current.checklist,
        [key]:
          !current.checklist[key],
      },
    }));
  };

  const validateForm = () => {
    if (!form.maintenance_date) {
      return "Date is required.";
    }

    if (!form.status) {
      return "Status is required.";
    }

    if (!form.issue.trim()) {
      return "Issue is required.";
    }

    if (!form.action_taken.trim()) {
      return "Action Taken is required.";
    }

    if (
      !form.persons_responsible.trim()
    ) {
      return "Please enter at least one person responsible.";
    }

    if (
      !Object.values(
        form.checklist
      ).some(Boolean)
    ) {
      return "Select at least one maintenance checklist item.";
    }

    if (form.proof_link.trim()) {
      try {
        const url = new URL(
          form.proof_link.trim()
        );

        if (
          !["http:", "https:"].includes(
            url.protocol
          )
        ) {
          return "Please enter a valid proof or reference link.";
        }
      } catch {
        return "Please enter a valid proof or reference link.";
      }
    }

    return "";
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (validationMessage) {
      setFormError(
        validationMessage
      );

      return;
    }

    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      const token =
        await getAccessToken();

      const isEditing =
        Boolean(editingId);

      const endpoint = isEditing
        ? `${API_URL}/api/maintenance-logs/${editingId}`
        : `${API_URL}/api/maintenance-logs`;

      const response = await fetch(
        endpoint,
        {
          method: isEditing
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify(form),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to save maintenance record."
        );
      }

      setShowForm(false);
      resetForm();

      setSuccess(
        isEditing
          ? "Maintenance record updated successfully."
          : "Maintenance record added successfully."
      );

      await loadLogs();
    } catch (err) {
      setFormError(
        err.message ||
          "Unable to save maintenance record."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord?.id) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const token =
        await getAccessToken();

      const response = await fetch(
        `${API_URL}/api/maintenance-logs/${selectedRecord.id}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to delete maintenance record."
        );
      }

      setShowDelete(false);
      setSelectedRecord(null);

      setSuccess(
        "Maintenance record deleted successfully."
      );

      await loadLogs();
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete maintenance record."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="logs-page">
      {/* HEADER */}

      <header className="logs-header">
        <div className="logs-header-copy">
          <p>
            AMIANAN-CADP L.E.N.S.
          </p>

          <h1>Maintenance</h1>

          <span>
            Record and monitor system
            maintenance activities.
          </span>
        </div>

        <button
          type="button"
          className="logs-add-btn"
          onClick={openAdd}
        >
          <span className="logs-add-icon">
            +
          </span>

          <span className="logs-add-text">
            Add Maintenance
          </span>
        </button>
      </header>

      {/* CONTENT */}

      <main className="logs-content">
        {success && (
          <div className="logs-alert success">
            {success}
          </div>
        )}

        {error && (
          <div className="logs-alert error">
            {error}
          </div>
        )}

        <section className="logs-card">
          <div className="logs-toolbar">
            <div className="logs-search">
              <span className="logs-search-icon">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search maintenance records..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="for_monitoring">
                For Monitoring
              </option>

              <option value="resolved">
                Resolved
              </option>
            </select>

            <input
              className="logs-date-filter"
              type="date"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target.value
                )
              }
            />

            <div className="logs-toolbar-bottom">
              <span className="logs-count">
                {filteredLogs.length}{" "}
                {filteredLogs.length === 1
                  ? "record"
                  : "records"}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="logs-state">
              <div className="logs-loader" />

              <span>
                Loading maintenance
                records...
              </span>
            </div>
          ) : filteredLogs.length ===
            0 ? (
            <div className="logs-state">
              <strong>
                No maintenance records
                found
              </strong>

              <span>
                Maintenance records will
                appear here once they are
                added.
              </span>
            </div>
          ) : (
            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Down Time</th>
                    <th>
                      Person/s Responsible
                    </th>
                    <th>Proof</th>
                    <th className="logs-actions-heading">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map(
                    (log) => (
                      <tr key={log.id}>
                        <td className="logs-date">
                          {formatDate(
                            log.maintenance_date
                          )}
                        </td>

                        <td className="logs-issue">
                          <strong>
                            {log.issue}
                          </strong>

                          {log.action_taken && (
                            <span>
                              {
                                log.action_taken
                              }
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`logs-status ${log.status}`}
                          >
                            {statusLabel(
                              log.status
                            )}
                          </span>
                        </td>

                        <td>
                          {log.downtime ||
                            "—"}
                        </td>

                        <td>
                          {log.persons_responsible ||
                            "—"}
                        </td>

                        <td>
                          {log.proof_link ? (
                            <a
                              className="logs-proof-link compact"
                              href={
                                log.proof_link
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open Link ↗
                            </a>
                          ) : (
                            <span className="logs-no-proof">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="logs-actions">
                            <button
                              type="button"
                              className="logs-action-btn view"
                              onClick={() =>
                                openView(log)
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="logs-action-btn edit"
                              onClick={() =>
                                openEdit(log)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="logs-action-btn delete"
                              onClick={() =>
                                openDelete(
                                  log
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div
          className="logs-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
        >
          <div className="logs-modal">
            <div className="logs-modal-header">
              <div>
                <p>
                  MAINTENANCE RECORD
                </p>

                <h2>
                  {editingId
                    ? "Edit Maintenance"
                    : "Add Maintenance"}
                </h2>

                <span>
                  {editingId
                    ? "Update the maintenance information below."
                    : "Complete the maintenance information below."}
                </span>
              </div>

              <button
                type="button"
                className="logs-modal-close"
                onClick={closeForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              className="logs-form"
              onSubmit={handleSubmit}
            >
              {formError && (
                <div className="logs-form-error">
                  {formError}
                </div>
              )}

              <div className="logs-form-grid">
                <div className="logs-field">
                  <label htmlFor="maintenance_date">
                    Date
                    <span>*</span>
                  </label>

                  <input
                    id="maintenance_date"
                    name="maintenance_date"
                    type="date"
                    value={
                      form.maintenance_date
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  />
                </div>

                <div className="logs-field">
                  <label htmlFor="status">
                    Status
                    <span>*</span>
                  </label>

                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={
                      handleInputChange
                    }
                    required
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="for_monitoring">
                      For Monitoring
                    </option>

                    <option value="resolved">
                      Resolved
                    </option>
                  </select>
                </div>
              </div>

              <div className="logs-field">
                <label htmlFor="issue">
                  Issue
                  <span>*</span>
                </label>

                <textarea
                  id="issue"
                  name="issue"
                  value={form.issue}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Describe the maintenance issue..."
                  rows={4}
                  required
                />
              </div>

              <div className="logs-field">
                <label htmlFor="action_taken">
                  Action Taken
                  <span>*</span>
                </label>

                <textarea
                  id="action_taken"
                  name="action_taken"
                  value={
                    form.action_taken
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Describe the action taken..."
                  rows={4}
                  required
                />
              </div>

              <div className="logs-field">
                <label htmlFor="downtime">
                  Down Time
                </label>

                <input
                  id="downtime"
                  name="downtime"
                  type="text"
                  value={form.downtime}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: 2 hours"
                />
              </div>

              <div className="logs-section">
                <div className="logs-section-title">
                  <h3>
                    Persons Responsible
                    <span>*</span>
                  </h3>

                  <p>
                    Enter one or more
                    personnel responsible
                    for this maintenance
                    activity.
                  </p>
                </div>

                <div className="logs-field">
                  <input
                    name="persons_responsible"
                    type="text"
                    value={
                      form.persons_responsible
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="Example: Juan Dela Cruz, Development Team"
                    required
                  />
                </div>
              </div>

              <div className="logs-field">
                <label htmlFor="observation_result">
                  Observation /
                  Monitoring Result
                </label>

                <textarea
                  id="observation_result"
                  name="observation_result"
                  value={
                    form.observation_result
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter monitoring observations or results..."
                  rows={4}
                />
              </div>

              <div className="logs-field">
                <label htmlFor="action_needed">
                  Action Needed
                </label>

                <textarea
                  id="action_needed"
                  name="action_needed"
                  value={
                    form.action_needed
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter any additional action needed..."
                  rows={4}
                />
              </div>

              <div className="logs-section">
                <div className="logs-section-title">
                  <h3>
                    Maintenance Checklist
                    <span>*</span>
                  </h3>

                  <p>
                    Select at least one
                    applicable item.
                  </p>
                </div>

                <div className="logs-checklist">
                  {CHECKLIST_ITEMS.map(
                    (item) => (
                      <label
                        className="logs-check-item"
                        key={item.key}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(
                            form.checklist[
                              item.key
                            ]
                          )}
                          onChange={() =>
                            handleChecklistChange(
                              item.key
                            )
                          }
                        />

                        <span>
                          {item.label}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="logs-section">
                <div className="logs-section-title">
                  <h3>
                    Proof / Reference Link
                  </h3>

                  <p>
                    Add a link to
                    supporting
                    documentation such as
                    Google Drive, GitHub,
                    OneDrive, SharePoint,
                    or another authorized
                    source.
                  </p>
                </div>

                <div className="logs-field">
                  <label htmlFor="proof_link">
                    Supporting Link
                  </label>

                  <input
                    id="proof_link"
                    name="proof_link"
                    type="url"
                    value={
                      form.proof_link
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="https://drive.google.com/... or https://github.com/..."
                  />
                </div>
              </div>

              <div className="logs-modal-footer">
                <button
                  type="button"
                  className="logs-btn secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="logs-btn primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Save Maintenance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}

      {showView &&
        selectedRecord && (
          <div
            className="logs-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowView(false);
              }
            }}
          >
            <div className="logs-modal logs-view-modal">
              <div className="logs-modal-header">
                <div>
                  <p>
                    MAINTENANCE RECORD
                  </p>

                  <h2>
                    Maintenance Details
                  </h2>

                  <span>
                    View the complete
                    maintenance
                    information.
                  </span>
                </div>

                <button
                  type="button"
                  className="logs-modal-close"
                  onClick={() =>
                    setShowView(false)
                  }
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="logs-view-content">
                <div className="logs-view-top">
                  <div>
                    <span>Date</span>

                    <strong>
                      {formatDate(
                        selectedRecord.maintenance_date
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>

                    <strong>
                      <span
                        className={`logs-status ${selectedRecord.status}`}
                      >
                        {statusLabel(
                          selectedRecord.status
                        )}
                      </span>
                    </strong>
                  </div>

                  <div>
                    <span>
                      Down Time
                    </span>

                    <strong>
                      {selectedRecord.downtime ||
                        "—"}
                    </strong>
                  </div>
                </div>

                <ViewField
                  label="Issue"
                  value={
                    selectedRecord.issue
                  }
                />

                <ViewField
                  label="Action Taken"
                  value={
                    selectedRecord.action_taken
                  }
                />

                <ViewField
                  label="Person/s Responsible"
                  value={
                    selectedRecord.persons_responsible
                  }
                />

                <ViewField
                  label="Observation / Monitoring Result"
                  value={
                    selectedRecord.observation_result
                  }
                />

                <ViewField
                  label="Action Needed"
                  value={
                    selectedRecord.action_needed
                  }
                />

                <div className="logs-view-section">
                  <span className="logs-view-label">
                    Maintenance
                    Checklist
                  </span>

                  <div className="logs-view-checklist">
                    {CHECKLIST_ITEMS.map(
                      (item) => (
                        <div
                          key={
                            item.key
                          }
                          className={
                            selectedRecord
                              .checklist?.[
                              item.key
                            ]
                              ? "checked"
                              : ""
                          }
                        >
                          <span>
                            {selectedRecord
                              .checklist?.[
                              item.key
                            ]
                              ? "✓"
                              : "—"}
                          </span>

                          {item.label}
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="logs-view-section">
                  <span className="logs-view-label">
                    Proof / Reference
                    Link
                  </span>

                  {selectedRecord.proof_link ? (
                    <a
                      className="logs-proof-link"
                      href={
                        selectedRecord.proof_link
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Supporting
                      Document ↗
                    </a>
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>

              <div className="logs-modal-footer">
                <button
                  type="button"
                  className="logs-btn secondary"
                  onClick={() =>
                    setShowView(false)
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="logs-btn primary"
                  onClick={() =>
                    openEdit(
                      selectedRecord
                    )
                  }
                >
                  Edit Maintenance
                </button>
              </div>
            </div>
          </div>
        )}

      {/* DELETE MODAL */}

      {showDelete &&
        selectedRecord && (
          <div className="logs-modal-overlay">
            <div className="logs-delete-modal">
              <div className="logs-delete-icon">
                !
              </div>

              <h2>
                Delete Maintenance
                Record?
              </h2>

              <p>
                This will permanently
                delete the maintenance
                record for{" "}
                <strong>
                  {
                    selectedRecord.issue
                  }
                </strong>
                .
              </p>

              <div className="logs-delete-actions">
                <button
                  type="button"
                  className="logs-btn secondary"
                  onClick={() => {
                    setShowDelete(
                      false
                    );

                    setSelectedRecord(
                      null
                    );
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="logs-btn danger"
                  onClick={
                    handleDelete
                  }
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Record"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function ViewField({
  label,
  value,
}) {
  return (
    <div className="logs-view-section">
      <span className="logs-view-label">
        {label}
      </span>

      <p>{value || "—"}</p>
    </div>
  );
}

export default MaintenanceLogs;