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

function UserManagement() {
  const [users, setUsers] = useState([]);
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
              .includes(term);

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

      await loadUsers();
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

        await loadUsers();
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

        <div className="um-toolbar">
          <input
            type="search"
            placeholder="Search name, username, or email..."
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
                                  isSelf ||
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
    </section>
  );
}

export default UserManagement;