import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/login`,
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage("Password reset instructions have been sent.");
    }

    setLoading(false);
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">L</div>

          <div>
            <h1>Forgot Password</h1>
            <p>Enter your registered email address.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="resetEmail">Email</label>

            <input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {message && (
            <div className={`form-message ${success ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </main>
  );
}

export default ForgotPassword;