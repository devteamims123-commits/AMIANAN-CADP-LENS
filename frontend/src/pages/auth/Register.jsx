import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Register() {

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || success) return;
    setMessage("");
    setSuccess(false);

    if (!form.organizationType || !form.organizationId || !organizations.some((item) => item.id === form.organizationId && item.organization_type === form.organizationType)) {
      setMessage("Select a registered agency or LGU.");
      return;
    }

    if (!form.username.trim()) {
      setMessage("Please enter a username.");
      return;
    }

    if (form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) {
      setMessage("Password must contain at least 8 characters and no more than 72 UTF-8 bytes.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-pending-user", {
        body: {
          full_name: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          organization_type: form.organizationType,
          agency_lgu_id: form.organizationId,
          password: form.password,
        },
      });
      if (error) {
        let details;
        try { details = await error.context?.json(); } catch { /* no JSON response */ }
        throw new Error(details?.error || error.message || "Unable to submit registration.");
      }
      if (!data?.success) throw new Error(data?.error || "Unable to submit registration.");
      setSuccess(true);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      setShowPassword(false);
      setShowConfirmPassword(false);
      setMessage("Registration submitted successfully. Please wait for Super Admin approval and email verification before signing in.");
    } catch (error) {
      setMessage(error.message || "Unable to submit registration.");
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
          <fieldset disabled={loading || success} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
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
              <label htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input id="password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Enter password" autoComplete="new-password" minLength={8} required style={{ width: "100%", boxSizing: "border-box", paddingRight: 58 }} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: "#435b37", cursor: "pointer", fontSize: 12 }}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" autoComplete="new-password" minLength={8} required style={{ width: "100%", boxSizing: "border-box", paddingRight: 58 }} />
                <button type="button" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: "#435b37", cursor: "pointer", fontSize: 12 }}>{showConfirmPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
          </div>
          </fieldset>
          <p className="registration-notice" style={{ fontSize: 13, lineHeight: 1.6, color: "#435b37", background: "#edf6ef", padding: "12px 14px", borderRadius: 9, margin: "0 0 18px" }}>
            Your registration requires Super Admin approval. Once approved, a verification email will be requested. After verification, you can sign in using your registered password.
          </p>

          {message && (
            <div
              role={success ? "status" : "alert"}
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
            disabled={success || loading || organizationsLoading || Boolean(organizationsError)}
          >
            {success ? "Registration Submitted" : loading ? "Submitting Registration..." : "Submit Registration"}
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