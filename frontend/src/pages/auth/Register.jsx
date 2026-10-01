import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
        "Account created successfully. Check your email if confirmation is required."
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
          <div className="brand-mark">L</div>

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
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              name="username"
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
            <div className={`form-message ${success ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;