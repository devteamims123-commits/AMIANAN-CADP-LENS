import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    organization: "",
    organizationType: "",
    organizationId: "",
    password: "",
    confirmPassword: "",
  });

  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("agencies_lgus")
        .select("id, organization_type, name")
        .order("name", { ascending: true });
      if (!active) return;
      if (error) setOrganizationsError("Unable to load registered organizations.");
      else setOrganizations(data || []);
      setOrganizationsLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const filteredOrganizations = organizations.filter(
    (organization) => organization.organization_type === form.organizationType
  );

  const handleOrganizationType = (event) => {
    setForm((current) => ({ ...current, organizationType: event.target.value, organizationId: "", organization: "" }));
  };
  const handleOrganization = (event) => {
    const selected = organizations.find((item) => item.id === event.target.value && item.organization_type === form.organizationType);
    setForm((current) => ({ ...current, organizationId: selected?.id || "", organization: selected?.name || "" }));
  };

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!form.organizationType || !form.organizationId || !organizations.some((item) => item.id === form.organizationId && item.organization_type === form.organizationType)) {
      setMessage("Select a registered agency or LGU.");
      return;
    }

    if (form.password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            username: form.username.trim(),
            organization: form.organization.trim(),
            organization_type: form.organizationType,
            agency_lgu_id: form.organizationId,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      setSuccess(true);
      setMessage(
        "Account created successfully. Please check your email for verification."
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (error) {
      setMessage(error.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-large">
        <div className="auth-brand">
          <div>
            <h1>Create Account</h1>
            <p>Register for AMIANAN-CADP L.E.N.S.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">Username</label>

              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerEmail">Email</label>

              <input
                id="registerEmail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="organizationType">Organization Type</label>
              <select id="organizationType" value={form.organizationType} onChange={handleOrganizationType} required>
                <option value="">Select organization type</option>
                <option value="Agency">Agency</option>
                <option value="LGU">LGU</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="organizationId">Registered Agency / LGU</label>
              <select id="organizationId" value={form.organizationId} onChange={handleOrganization} disabled={!form.organizationType || organizationsLoading || Boolean(organizationsError)} required>
                <option value="">{organizationsLoading ? "Loading organizations..." : "Select registered organization"}</option>
                {filteredOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          </div>
          {organizationsError && <div className="form-message error">{organizationsError}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="registerPassword">Password</label>

              <input
                id="registerPassword"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {message && (
            <div
              className={`form-message ${
                success ? "success" : "error"
              }`}
            >
              {message}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={loading || organizationsLoading || Boolean(organizationsError)}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign In</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;