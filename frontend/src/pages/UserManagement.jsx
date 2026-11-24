import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./UserManagement.css";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "";

const EMPTY_FORM = {
  fullName: "",
  username: "",
  email: "",
  role: "",
  organizationType: "",
  organizationId: "",
  password: "",
  confirmPassword: "",
};

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3 3.7M6.2 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9.9 9.9A3 3 0 0 0 14.1 14.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function canRetryVerification(application, status, now) {
  if (application.status !== "approved" || !application.auth_user_id || status !== "approved") return false;
  const last = Date.parse(application.last_invitation_attempt_at || "");
  if (Number.isFinite(last) && now - last < 60000) return false;
  if (["failed", "not_sent"].includes(application.invitation_status)) return true;
  if (application.invitation_status === "sent") return now - Date.parse(application.invitation_sent_at || "") >= 3600000;
  if (application.invitation_status === "sending") return now - last >= 300000;
  return false;
}

function UserManagement() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [applicationFilter, setApplicationFilter] = useState("pending");
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [applicationError, setApplicationError] = useState("");
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [accountStatuses, setAccountStatuses] = useState({});

  const loadApplications = async () => {
    setApplicationLoading(true);
    setApplicationError("");
    try {
      const { data, error } = await supabase.from("pending_registrations")
        .select("id,full_name,username,email,organization_type,agency_lgu_id,status,invitation_status,rejection_reason,created_at,auth_user_id,invitation_attempts,invitation_sent_at,last_invitation_attempt_at,invitation_error")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApplications(data || []);
      const profiles = await supabase.from("profiles").select("id,account_status");
      if (profiles.error) { setAccountStatuses({}); throw profiles.error; }
      setAccountStatuses(Object.fromEntries((profiles.data || []).map(p => [p.id, p.account_status])));
    } catch (error) {
      setApplicationError(error.message || "Unable to load applications.");
    } finally { setApplicationLoading(false); }
  };

  const openReview = (application, action) => {
    setReview({ application, action }); setReason(""); setReviewError("");
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!review || reviewBusy) return;
    if (review.action === "rejected" && !reason.trim()) { setReviewError("Rejection reason is required."); return; }
    setReviewBusy(true); setReviewError("");
    try {
      const { data, error } = await supabase.functions.invoke("review-account", {
        body: { registration_id: review.application.id, action: review.action, reason: reason.trim() || null }
      });
      if (error) {
        let detail;
        try { detail = await error.context?.json(); } catch { /* no JSON response */ }
        throw new Error(detail?.error || error.message);
      }
      if (data?.success !== true) throw new Error(data?.error || data?.message || "Review failed.");
      setMessage(data?.message || "Registration review completed.");
      setMessageType((data?.requires_attention || (data?.email_sent === false && data?.account_status !== "active" && review.action !== "rejected")) ? "error" : "success");
      setReview(null);
      await Promise.all([loadApplications(), loadUsers()]);
    } catch (error) { setReviewError(error.message || "Review failed."); await Promise.all([loadApplications(), loadUsers()]); }
    finally { setReviewBusy(false); }
  };
  const [organizations, setOrganizations] = useState([]);
  const [organizationError, setOrganizationError] = useState("");
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("");

  const [modalError, setModalError] =
    useState("");

  const [modalMode, setModalMode] =
    useState(null);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  /* =========================================
     API
  ========================================= */

  const apiRequest = async (
    path,
    options = {}
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    const response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,

        headers: {
          "Content-Type": "application/json",

          Authorization:
            `Bearer ${session.access_token}`,

          ...(options.headers || {}),
        },
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Request failed."
      );
    }

    return data;
  };

  /* =========================================
     LOAD USERS
  ========================================= */

  const loadUsers = async () => {
    setLoading(true);

    try {
      const data =
        await apiRequest(
          "/api/users"
        );

      setUsers(
        data.users || []
      );

      setCurrentUserId(
        data.currentUserId || ""
      );
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadApplications();
    let active = true;
    supabase.from("agencies_lgus").select("id, name, organization_type")
      .order("name", { ascending: true }).then(({ data, error }) => {
        if (!active) return;
        if (error) setOrganizationError("Unable to load registered organizations.");
        else setOrganizations(data || []);
      });
    return () => { active = false; };
  }, []);

  /* =========================================
     FILTER USERS
  ========================================= */

  const filteredUsers =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const matchesRole =
            roleFilter === "all" ||
            user.role ===
              roleFilter;

          const matchesSearch =
            !term ||
            user.full_name
              ?.toLowerCase()
              .includes(term) ||
            user.username
              ?.toLowerCase()
              .includes(term) ||
            user.email
              ?.toLowerCase()
              .includes(term) ||
            user.organization?.toLowerCase().includes(term);

          return (
            matchesRole &&
            matchesSearch
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
    ]);

  /* =========================================
     RESET MODAL STATE
  ========================================= */

  const resetModalState = () => {
    setModalError("");

    setShowPassword(false);
    setShowConfirmPassword(false);

    setChangingPassword(false);
  };

  /* =========================================
     CREATE
  ========================================= */

  const openCreate = () => {
    setSelectedUser(null);

    setForm({
      ...EMPTY_FORM,
    });

    resetModalState();

    setModalMode("create");
  };

  /* =========================================
     EDIT
  ========================================= */

  const openEdit = (user) => {
    setSelectedUser(user);

    setForm({
      fullName:
        user.full_name || "",

      username:
        user.username || "",

      email:
        user.email || "",

      role:
        user.role || "user",

      organizationType:
        user.organization_type || "",

      organizationId:
        user.agency_lgu_id ||
        organizations.find((item) =>
          item.name === user.organization &&
          item.organization_type?.toLowerCase() === user.organization_type?.toLowerCase()
        )?.id || "",

      password: "",

      confirmPassword: "",
    });

    resetModalState();

    setModalMode("edit");
  };

  /* =========================================
     DELETE
  ========================================= */

  const openDelete = (user) => {
    setSelectedUser(user);

    resetModalState();

    setModalMode("delete");
  };

  /* =========================================
     CLOSE
  ========================================= */

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);

    setSelectedUser(null);

    setForm({
      ...EMPTY_FORM,
    });

    resetModalState();
  };

  /* =========================================
     CHANGE INPUT
  ========================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "organizationType" ? { organizationId: "" } : {}),
    }));

    if (modalError) {
      setModalError("");
    }
  };

  /* =========================================
     CHANGE PASSWORD BUTTON
  ========================================= */

  const enablePasswordChange = () => {
    setChangingPassword(true);

    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));

    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalError("");
  };

  const cancelPasswordChange = () => {
    setChangingPassword(false);

    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));

    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalError("");
  };

  /* =========================================
     SAVE
  ========================================= */

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    setModalError("");

    if (
      modalMode === "create" &&
      !form.role
    ) {
      setModalError(
        "Please select a role."
      );

      return;
    }

    const passwordRequired =
      modalMode === "create" ||
      changingPassword;

    if (
      passwordRequired &&
      !form.password
    ) {
      setModalError(
        "Please enter a password."
      );

      return;
    }

    if (
      passwordRequired &&
      form.password.length < 6
    ) {
      setModalError(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (
      passwordRequired &&
      form.password !==
        form.confirmPassword
    ) {
      setModalError(
        "Passwords do not match."
      );

      return;
    }

    if (form.organizationType && !organizations.some((item) =>
      String(item.id) === String(form.organizationId) &&
      item.organization_type?.toLowerCase() === form.organizationType.toLowerCase())) {
      setModalError("Select a registered Agency / LGU.");
      return;
    }
    if (!form.organizationType && form.organizationId) {
      setModalError("Select an organization type.");
      return;
    }
    setSaving(true);

    try {
      if (
        modalMode === "create"
      ) {
        await apiRequest(
          "/api/users",
          {
            method: "POST",

            body: JSON.stringify({
              fullName:
                form.fullName,

              username:
                form.username,

              email:
                form.email,

              role:
                form.role,

              organizationType: form.organizationType || null,
              organizationId: form.organizationId || null,

              password:
                form.password,
            }),
          }
        );

        setMessage(
          "Account created successfully."
        );
      } else {
        const updatePayload = {
          fullName:
            form.fullName,

          username:
            form.username,

          email:
            form.email,

          role:
            selectedUser.id ===
            currentUserId
              ? "super_admin"
              : form.role,
          organizationType: form.organizationType || null,
          organizationId: form.organizationId || null,
        };

        /*
          This sends password only when
          Change Password is enabled.

          Your backend PUT /api/users/:id
          must support password updates.
        */
        if (changingPassword) {
          updatePayload.password =
            form.password;
        }

        await apiRequest(
          `/api/users/${selectedUser.id}`,
          {
            method: "PUT",

            body:
              JSON.stringify(
                updatePayload
              ),
          }
        );

        setMessage(
          changingPassword
            ? "Account and password updated successfully."
            : "Account updated successfully."
        );
      }

      setMessageType(
        "success"
      );

      setModalMode(null);
      setSelectedUser(null);

      setForm({
        ...EMPTY_FORM,
      });

      resetModalState();

      await Promise.all([loadUsers(), loadApplications()]);
    } catch (error) {
      /*
        API errors while modal is open
        now appear INSIDE the modal.
      */
      setModalError(
        error.message
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     DELETE
  ========================================= */

  const handleDelete =
    async () => {
      setSaving(true);
      setModalError("");

      try {
        await apiRequest(
          `/api/users/${selectedUser.id}`,
          {
            method: "DELETE",
          }
        );

        setMessage(
          "Account deleted successfully."
        );

        setMessageType(
          "success"
        );

        setModalMode(null);
        setSelectedUser(null);

        await Promise.all([loadUsers(), loadApplications()]);
      } catch (error) {
        setModalError(
          error.message
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <section className="um-page">
      {/* =================================
          HEADER
      ================================= */}

      <header className="um-header">
        <div>
          <p>
            AMIANAN-CADP L.E.N.S.
          </p>

          <h1>
            User Management
          </h1>

          <span>
            Manage system accounts
            and access roles.
          </span>
        </div>

        <button
          type="button"
          className="um-create"
          onClick={openCreate}
        >
          + Create New Account
        </button>
      </header>

      {/* =================================
          PAGE CONTENT
      ================================= */}

      <div className="um-content">
        {message && (
          <div
            className={`um-message ${messageType}`}
          >
            {message}
          </div>
        )}

        <div className="um-table-card" style={{ marginBottom: 24 }}>
          <div style={{ padding: 16 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 19 }}>Registration Applications</h2>
            <p style={{ margin: "0 0 12px" }}>Approve or reject registrations. Approved applicants must verify their email before accessing CADP.</p>
            <div className="um-toolbar">
              <select aria-label="Application status" value={applicationFilter} onChange={e => setApplicationFilter(e.target.value)}>
                { ["pending", "approved", "rejected", "all"].map(status => <option key={status} value={status}>{status === "all" ? "All applications" : status[0].toUpperCase() + status.slice(1)} ({applications.filter(a => status === "all" || a.status === status).length})</option>) }
              </select>
              <button type="button" className="um-edit" onClick={loadApplications} disabled={applicationLoading || reviewBusy}>Refresh</button>
            </div>
          </div>
          {applicationError ? <div className="um-message error" role="alert">{applicationError}</div> : applicationLoading ? <div className="um-state">Loading applications...</div> : (
            <div className="um-table-wrap"><table className="um-table">
              <thead><tr><th>Applicant</th><th>Email</th><th>Organization</th><th>Status</th><th>Verification Email</th><th>Actions</th></tr></thead>
              <tbody>{applications.filter(a => applicationFilter === "all" || a.status === applicationFilter).map(a => (
                <tr key={a.id}>
                  <td><strong>{a.full_name}</strong><br/><small>{a.username}</small></td>
                  <td>{a.email}</td>
                  <td>{organizations.find(o => o.id === a.agency_lgu_id)?.name || "—"}<br/><small>{a.organization_type}</small></td>
                  <td>{a.status === "approved" && accountStatuses[a.auth_user_id] === "active" ? "Active" : a.status === "approved" ? "Approved — awaiting verification" : a.status === "pending" ? "Pending approval" : "Rejected"}{a.rejection_reason && <><br/><small>{a.rejection_reason}</small></>}</td>
                  <td>{accountStatuses[a.auth_user_id] === "active" ? "Verified" : (a.invitation_status || "not_sent").replaceAll("_", " ")}
                    {accountStatuses[a.auth_user_id] !== "active" && a.invitation_status === "sent" && <><br/><small>Request accepted; delivery not guaranteed</small></>}
                    {a.invitation_error && accountStatuses[a.auth_user_id] !== "active" && <><br/><small>{a.invitation_error}</small></>}
                    {a.invitation_attempts > 0 && <><br/><small>Attempts: {a.invitation_attempts}</small></>}
                  </td>
                  <td><div className="um-actions">
                    {a.status === "pending" && <><button type="button" className="um-edit" disabled={reviewBusy || !a.auth_user_id || accountStatuses[a.auth_user_id] !== "pending"} onClick={() => openReview(a, "approved")}>Approve</button><button type="button" className="um-delete" disabled={reviewBusy || !a.auth_user_id || accountStatuses[a.auth_user_id] !== "pending"} onClick={() => openReview(a, "rejected")}>Reject</button></>}
                    {canRetryVerification(a, accountStatuses[a.auth_user_id], now) && <button type="button" className="um-edit" disabled={reviewBusy} onClick={() => openReview(a, "retry_invitation")}>Retry Verification Email</button>}
                  </div></td>
                </tr>
              ))}{!applications.some(a => applicationFilter === "all" || a.status === applicationFilter) && <tr><td colSpan={6}>No applications found.</td></tr>}</tbody>
            </table></div>
          )}
        </div>
        <h2 style={{ fontSize: 19 }}>System Accounts</h2>
        <div className="um-toolbar">
          <input
            type="search"
            placeholder="Search name, username, email, or organization..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Roles
            </option>

            <option value="super_admin">
              Super Admin
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="user">
              User
            </option>

            <option value="viewer">
              Viewer
            </option>
          </select>
        </div>

        {/* =================================
            TABLE
        ================================= */}

        <div className="um-table-card">
          {loading ? (
            <div className="um-state">
              Loading users...
            </div>
          ) : filteredUsers.length ===
            0 ? (
            <div className="um-state">
              No users found.
            </div>
          ) : (
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>
                      Full Name
                    </th>

                    <th>
                      Username
                    </th>

                    <th>
                      Email
                    </th>

                    <th>Organization</th>
                    <th>Type</th>
                    <th>Account Status</th>
                    <th>
                      Role
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (user) => {
                      const isSelf =
                        user.id ===
                        currentUserId;

                      const reviewManaged = applications.some(a => a.auth_user_id === user.id) && accountStatuses[user.id] !== "active";

                       const protectedSuperAdmin =
                        user.role ===
                          "super_admin" &&
                        !isSelf;

                      return (
                        <tr
                          key={
                            user.id
                          }
                        >
                          <td>
                            <strong>
                              {user.full_name ||
                                "—"}
                            </strong>

                            {isSelf && (
                              <small className="um-you">
                                You
                              </small>
                            )}
                          </td>

                          <td>
                            {user.username ||
                              "—"}
                          </td>

                          <td>
                            {user.email ||
                              "—"}
                          </td>

                          <td>{user.organization || "—"}</td>
                          <td>{user.organization_type || "—"}</td>
                          <td>{accountStatuses[user.id] || user.account_status || "—"}</td>
                          <td>
                            <span
                              className={`um-role ${user.role}`}
                            >
                              {user.role?.replace(
                                "_",
                                " "
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="um-actions">
                              <button
                                type="button"
                                className="um-edit"
                                disabled={reviewManaged || applicationLoading || Boolean(applicationError)}
                                onClick={() =>
                                  openEdit(
                                    user
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="um-delete"
                                disabled={
                                  isSelf || reviewManaged || applicationLoading || Boolean(applicationError) ||
                                  protectedSuperAdmin
                                }
                                onClick={() =>
                                  openDelete(
                                    user
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =================================
          CREATE / EDIT MODAL
      ================================= */}

      {(modalMode === "create" ||
        modalMode === "edit") && (
        <div
          className="um-modal-backdrop"
          onMouseDown={
            closeModal
          }
        >
          <div
            className="um-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="um-modal-head">
              <div>
                <p>
                  USER MANAGEMENT
                </p>

                <h2>
                  {modalMode ===
                  "create"
                    ? "Create New Account"
                    : "Edit Account"}
                </h2>
              </div>

              <button
                type="button"
                className="um-modal-close"
                onClick={
                  closeModal
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* ERROR NOW INSIDE MODAL */}

            {modalError && (
              <div
                className="um-modal-error"
                role="alert"
              >
                <span className="um-modal-error-icon">
                  !
                </span>

                <span>
                  {modalError}
                </span>
              </div>
            )}

            <form
              onSubmit={
                handleSave
              }
              autoComplete="off"
            >
              <div className="um-form-grid">
                {/* FULL NAME */}

                <label>
                  <span>
                    Full Name
                  </span>

                  <input
                    name="fullName"
                    type="text"
                    value={
                      form.fullName
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="off"
                    required
                  />
                </label>

                {/* USERNAME */}

                <label>
                  <span>
                    Username
                  </span>

                  <input
                    name="username"
                    type="text"
                    value={
                      form.username
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="off"
                    required
                  />
                </label>

                {/* EMAIL */}

                <label className="um-full">
                  <span>
                    Email
                  </span>

                  <input
                    name="email"
                    type="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    autoComplete="off"
                    required
                  />
                </label>

                {/* ROLE */}

                <label className="um-full">
                  <span>
                    Role
                  </span>

                  {selectedUser?.id ===
                  currentUserId ? (
                    <input
                      value="Super Admin"
                      disabled
                    />
                  ) : (
                    <select
                      name="role"
                      value={
                        form.role
                      }
                      onChange={
                        handleChange
                      }
                      required
                    >
                      {modalMode ===
                        "create" && (
                        <option
                          value=""
                          disabled
                        >
                          Select Role
                        </option>
                      )}

                      <option value="admin">
                        Admin
                      </option>

                      <option value="user">
                        User
                      </option>

                      <option value="viewer">
                        Viewer
                      </option>
                    </select>
                  )}
                </label>

                {/* ORGANIZATION TYPE */}
                <label>
                  <span>Organization Type</span>
                  <select
                    name="organizationType"
                    value={form.organizationType}
                    onChange={handleChange}
                  >
                    <option value="">None</option>
                    <option value="Agency">Agency</option>
                    <option value="LGU">LGU</option>
                  </select>
                </label>

                {/* REGISTERED ORGANIZATION */}
                <label>
                  <span>Registered Agency / LGU</span>
                  <select
                    name="organizationId"
                    value={form.organizationId}
                    onChange={handleChange}
                    disabled={!form.organizationType || Boolean(organizationError)}
                    required={Boolean(form.organizationType)}
                  >
                    <option value="">Select Organization</option>
                    {organizations
                      .filter((item) =>
                        item.organization_type?.toLowerCase() ===
                        form.organizationType.toLowerCase()
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  {organizationError && (
                    <small role="alert">{organizationError}</small>
                  )}
                </label>

                {/* =================================
                    EDIT: CHANGE PASSWORD BUTTON
                ================================= */}

                {modalMode ===
                  "edit" &&
                  !changingPassword && (
                    <div className="um-full um-change-password-row">
                      <div>
                        <strong>
                          Password
                        </strong>

                        <small>
                          Keep the current
                          password or set a
                          new one.
                        </small>
                      </div>

                      <button
                        type="button"
                        className="um-change-password-button"
                        onClick={
                          enablePasswordChange
                        }
                      >
                        Change Password
                      </button>
                    </div>
                  )}

                {/* =================================
                    PASSWORD FIELDS
                ================================= */}

                {(modalMode ===
                  "create" ||
                  changingPassword) && (
                  <>
                    <label>
                      <span>
                        {modalMode ===
                        "edit"
                          ? "New Password"
                          : "Password"}
                      </span>

                      <div className="um-password-field">
                        <input
                          name="password"
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            form.password
                          }
                          onChange={
                            handleChange
                          }
                          autoComplete="new-password"
                          minLength="6"
                          required
                        />

                        <button
                          type="button"
                          className="um-password-toggle"
                          onClick={() =>
                            setShowPassword(
                              (
                                current
                              ) =>
                                !current
                            )
                          }
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          title={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <EyeIcon
                            visible={
                              showPassword
                            }
                          />
                        </button>
                      </div>
                    </label>

                    <label>
                      <span>
                        Confirm Password
                      </span>

                      <div className="um-password-field">
                        <input
                          name="confirmPassword"
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            form.confirmPassword
                          }
                          onChange={
                            handleChange
                          }
                          autoComplete="new-password"
                          minLength="6"
                          required
                        />

                        <button
                          type="button"
                          className="um-password-toggle"
                          onClick={() =>
                            setShowConfirmPassword(
                              (
                                current
                              ) =>
                                !current
                            )
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          title={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <EyeIcon
                            visible={
                              showConfirmPassword
                            }
                          />
                        </button>
                      </div>
                    </label>

                    {modalMode ===
                      "edit" && (
                      <div className="um-full um-password-cancel-row">
                        <button
                          type="button"
                          className="um-cancel-password-button"
                          onClick={
                            cancelPasswordChange
                          }
                        >
                          Cancel Password Change
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* =================================
                  ACTIONS
              ================================= */}

              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-cancel"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="um-save"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Saving..."
                    : modalMode ===
                        "create"
                      ? "Create Account"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================
          DELETE MODAL
      ================================= */}

      {modalMode === "delete" &&
        selectedUser && (
          <div
            className="um-modal-backdrop"
            onMouseDown={
              closeModal
            }
          >
            <div
              className="um-modal um-delete-modal"
              onMouseDown={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="um-delete-mark">
                !
              </div>

              <h2>
                Delete account?
              </h2>

              {modalError && (
                <div
                  className="um-modal-error"
                  role="alert"
                >
                  <span className="um-modal-error-icon">
                    !
                  </span>

                  <span>
                    {modalError}
                  </span>
                </div>
              )}

              <p>
                This will
                permanently delete{" "}
                <strong>
                  {
                    selectedUser.full_name
                  }
                </strong>
                's account. This
                action cannot be
                undone.
              </p>

              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-cancel"
                  onClick={
                    closeModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="um-confirm-delete"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Deleting..."
                    : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      {review && <div className="um-modal-backdrop" onMouseDown={() => !reviewBusy && setReview(null)}>
        <div className="um-modal" role="dialog" aria-modal="true" aria-label="Review registration" onMouseDown={e => e.stopPropagation()}>
          <div className="um-modal-head"><h2>{review.action === "approved" ? "Approve Registration" : review.action === "rejected" ? "Reject Registration" : "Retry Verification Email"}</h2></div>
          <p>{review.application.full_name} — {review.application.email}</p>
          {reviewError && <div className="um-modal-error" role="alert">{reviewError}</div>}
          <form onSubmit={submitReview}>
            {review.action === "rejected" ? <label>Rejection reason<textarea style={{ width: "100%", minHeight: 90 }} required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={reviewBusy}/></label> : <p>This will request a verification email if the account is approved and not yet verified. The applicant keeps their original password.</p>}
            <div className="um-modal-actions"><button type="button" className="um-cancel" disabled={reviewBusy} onClick={() => setReview(null)}>Cancel</button><button type="submit" className={review.action === "rejected" ? "um-confirm-delete" : "um-save"} disabled={reviewBusy}>{reviewBusy ? "Processing..." : "Confirm"}</button></div>
          </form>
        </div>
      </div>}
    </section>
  );
}

export default UserManagement;