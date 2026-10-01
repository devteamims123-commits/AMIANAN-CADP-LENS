import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Register() {
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();

  const years = Array.from(
    { length: currentYear - 1999 },
    (_, index) => currentYear - index
  );

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    province: "",
    municipalityCity: "",
    barangay: "",
    yearStarted: "",
    convergenceName: "",
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

            province: form.province.trim(),
            municipality_city: form.municipalityCity.trim(),
            barangay: form.barangay.trim(),
            year_started: Number(form.yearStarted),
            convergence_name: form.convergenceName.trim(),
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
      setMessage("Account created successfully.");

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
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-grid">
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
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="province">Province</label>

              <input
                id="province"
                name="province"
                value={form.province}
                onChange={handleChange}
                placeholder="Enter province"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="municipalityCity">
                Municipality / City
              </label>

              <input
                id="municipalityCity"
                name="municipalityCity"
                value={form.municipalityCity}
                onChange={handleChange}
                placeholder="Enter municipality or city"
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="barangay">Barangay</label>

              <input
                id="barangay"
                name="barangay"
                value={form.barangay}
                onChange={handleChange}
                placeholder="Enter barangay"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="yearStarted">Year Started</label>

              <select
                id="yearStarted"
                name="yearStarted"
                value={form.yearStarted}
                onChange={handleChange}
                required
              >
                <option value="">Select year</option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="convergenceName">Convergence Name</label>

            <input
              id="convergenceName"
              name="convergenceName"
              value={form.convergenceName}
              onChange={handleChange}
              placeholder="Enter convergence name"
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
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

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
            disabled={loading}
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