import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export default function ForgotPassword() {
  const location = useLocation();
  const email = typeof location.state?.email === "string"
    ? location.state.email.trim()
    : "";
  const validEmail = EMAIL_PATTERN.test(email);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validEmail || loading || success) return;

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Unable to process your request.");
      }

      setSuccess(true);
      setMessage(result.message || "Password reset link requested. Check your inbox and spam folder.");
    } catch (error) {
      const detail = error?.message || "";
      setMessage(
        /rate limit|too many requests|wait a minute/i.test(detail)
          ? "Too many requests. Please wait before requesting another reset link."
          : /not registered/i.test(detail)
            ? "This email is not registered in AMIANAN-CADP L.E.N.S. Please return to Sign In and check the email address."
          : detail === "Enter a valid email address."
            ? detail
            : "Unable to process your request right now. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">L</div>
          <div>
            <h1>Forgot Password</h1>
            <p>Reset instructions will be sent to the email entered on Sign In.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="resetEmail">Email</label>
            <input
              id="resetEmail"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              placeholder="Email from Sign In"
              required
            />
          </div>

          {message && (
            <div className={`form-message ${success ? "success" : "error"}`} role="status">
              {message}
            </div>
          )}

          {!validEmail && (
            <p className="form-message error">
              Enter a valid email on the Sign In page first.
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={!validEmail || loading || success}
          >
            {loading ? "Sending..." : success ? "Request Submitted" : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </main>
  );
}
