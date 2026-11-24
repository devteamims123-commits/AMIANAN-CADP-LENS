import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const enteredEmail = email.trim();
    if (!enteredEmail || !EMAIL_PATTERN.test(enteredEmail)) {
      setMessage("Enter a valid email address before selecting Forgot Password.");
      return;
    }
    setMessage("");
    navigate("/forgot-password", { state: { email: enteredEmail.toLowerCase() } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);
    setMessage("");
    let authenticated = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.code === "email_not_confirmed") {
          throw new Error("Your email is not verified. If your registration is still pending, please wait for Super Admin approval. If approved, check your verification email.");
        }
        throw error;
      }

      authenticated = Boolean(data.session);
      if (!data.user || !data.session) {
        throw new Error("Unable to establish a valid session.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Your account profile could not be loaded.");
      }

      switch (profile.account_status) {
        case "pending":
          throw new Error("Your account is awaiting Super Admin approval.");
        case "approved":
          throw new Error("Your account is approved but not yet active. Please verify your email or contact the administrator.");
        case "rejected":
          throw new Error("Your registration has been rejected. Please contact the administrator.");
        case "suspended":
          throw new Error("Your account is suspended. Please contact the administrator.");
        case "active":
          break;
        default:
          throw new Error("Your account is not authorized to access the system.");
      }

      if (!data.user.email_confirmed_at) {
        throw new Error("Please verify your email address before signing in.");
      }

      const allowedRoles = ["super_admin", "admin", "user", "viewer"];
      if (!allowedRoles.includes(profile.role)) {
        throw new Error("Your account does not have a valid role.");
      }

      // Enforce the same active-account rule used by database RLS.
      const { data: allowed, error: accessError } = await supabase.rpc("cadp_is_active_account");
      if (accessError || allowed !== true) {
        throw new Error("Your account access could not be authorized. Please contact the administrator.");
      }

      setPassword("");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      let cleanupFailed = false;
      if (authenticated) {
        try {
          const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
          cleanupFailed = Boolean(signOutError);
        } catch {
          cleanupFailed = true;
        }
      }
      setPassword("");
      setMessage((error.message || "Unable to sign in.") + (cleanupFailed ? " Session cleanup failed. Please close the page and contact the administrator." : ""));
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
            <Link
              to="/forgot-password"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </Link>
          </div>

          {message && (
            <div className="login-message" role="alert">
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
        
      </div>
    </main>
  );
}

export default Login; 