import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account profile could not be loaded."
        );
      }

      const allowedRoles = [
        "super_admin",
        "admin",
        "user",
        "viewer",
      ];

      if (!allowedRoles.includes(profile.role)) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account does not have a valid role."
        );
      }

      // All roles now use one Dashboard.
      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      setMessage(
        error.message || "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-heading">
          <h1>AMIANAN-CADP L.E.N.S.</h1>
          <p>STAFF PORTAL</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-field">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? "◉" : "○"}
              </button>
            </div>
          </div>

          <div className="forgot-row">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

        <div className="register-link">
          <span>
            Don't have an account?
          </span>

          <Link to="/register">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Login;