import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabase";

function ForgotPassword() {
  const location = useLocation();
  const email = typeof location.state?.email === "string"
    ? location.state.email.trim()
    : "";
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage("Enter your email on the Sign In page first.");
      return;
    }
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
      setMessage("If an account exists for this email, password reset instructions have been sent.");
    } catch (error) {
      setMessage(error.message || "Unable to send the reset email. Please try again.");
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
            <input id="resetEmail" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required />
          </div>
          {message && (
            <div className={`form-message ${success ? "success" : "error"}`}>
              {message}
            </div>
          )}
          <button className="primary-button" type="submit" disabled={loading || !email}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        {!email && <p className="form-message error">Enter your email on the Sign In page, then select Forgot Password.</p>}
        <p className="auth-switch"><Link to="/login">Back to Sign In</Link></p>
      </div>
    </main>
  );
}

export default ForgotPassword;
