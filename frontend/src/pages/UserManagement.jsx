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

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const apiRequest = async (path, options = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Request failed."
      );
    }

    return data;
  };

  const loadUsers = async () => {
    setLoading(true);

    try {
      const data = await apiRequest("/api/users");

      setUsers(data.users || []);
      setCurrentUserId(
        data.currentUserId || ""
      );
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

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
    });
  }, [
    users,
    search,
    roleFilter,
  ]);

  /* =========================
     OPEN CREATE
  ========================= */

  const openCreate = () => {
    setSelectedUser(null);

    setForm({
      fullName: "",
      username: "",
      email: "",
      role: "",
      password: "",
      confirmPassword: "",
    });

    setModalMode("create");
    setMessage("");
    setMessageType("");
  };

  /* =========================
     OPEN EDIT
  ========================= */

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

    setModalMode("edit");
    setMessage("");
    setMessageType("");
  };

  /* =========================
     OPEN DELETE
  ========================= */

  const openDelete = (user) => {
    setSelectedUser(user);
    setModalMode("delete");
    setMessage("");
    setMessageType("");
  };

  /* =========================
     CLOSE MODAL
  ========================= */

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setSelectedUser(null);

    setForm({
      ...EMPTY_FORM,
    });
  };

  /* =========================
     FORM CHANGE
  ========================= */

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
  };

  /* =========================
     CREATE / UPDATE
  ========================= */

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (
      modalMode === "create" &&
      !form.role
    ) {
      setMessage(
        "Please select a role."
      );
      setMessageType("error");
      return;
    }

    if (
      modalMode === "create" &&
      form.password !==
        form.confirmPassword
    ) {
      setMessage(
        "Passwords do not match."
      );
      setMessageType("error");
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
        await apiRequest(
          `/api/users/${selectedUser.id}`,
          {
            method: "PUT",

            body: JSON.stringify({
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
            }),
          }
        );

        setMessage(
          "Account updated successfully."
        );
      }

      setMessageType("success");

      setModalMode(null);
      setSelectedUser(null);

      setForm({
        ...EMPTY_FORM,
      });

      await loadUsers();
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete =
    async () => {
      setSaving(true);

      setMessage("");
      setMessageType("");

      try {
        await apiRequest(
          `/api/users/${selectedUser.id}`,
          {
            method:
              "DELETE",
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
        setMessage(
          error.message
        );

        setMessageType(
          "error"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <section className="um-page">
      {/* =========================
          HEADER
      ========================= */}

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

      {/* =========================
          CONTENT
      ========================= */}

      <div className="um-content">
        {message && (
          <div
            className={`um-message ${messageType}`}
          >
            {message}
          </div>
        )}

        {/* =========================
            FILTERS
        ========================= */}

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

        {/* =========================
            TABLE
        ========================= */}

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

      {/* =========================
          CREATE / EDIT MODAL
      ========================= */}

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
                onClick={
                  closeModal
                }
              >
                ×
              </button>
            </div>

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

                {/* PASSWORDS */}

                {modalMode ===
                  "create" && (
                  <>
                    <label>
                      <span>
                        Password
                      </span>

                      <input
                        name="password"
                        type="password"
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
                    </label>

                    <label>
                      <span>
                        Confirm Password
                      </span>

                      <input
                        name="confirmPassword"
                        type="password"
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
                    </label>
                  </>
                )}
              </div>

              {/* =========================
                  ACTIONS
              ========================= */}

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

      {/* =========================
          DELETE MODAL
      ========================= */}

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