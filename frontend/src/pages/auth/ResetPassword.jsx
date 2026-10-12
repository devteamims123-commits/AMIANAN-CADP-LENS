import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";

export default function ResetPassword() {
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryConfirmed = false;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryToken = params.get("token_hash") || params.get("code") || hashParams.get("access_token");
    const hasLinkError = params.get("error") || hashParams.get("error");

    if (hasLinkError) {
      setStatus("invalid");
      setMessage(params.get("error_description") || hashParams.get("error_description") || "This reset link is invalid or expired.");
      return undefined;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        recoveryConfirmed = true;
        setStatus("ready");
      }
    });

    const initialize = async () => {
      try {
        // Supabase handles code/token exchange automatically when detectSessionInUrl is enabled.
        // Do not allow a normal signed-in session to act as a recovery link.
        if (!hasRecoveryToken) {
          if (active) setStatus("invalid");
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active && recoveryConfirmed && data.session) setStatus("ready");
        else if (active) {
          // Allow time for the PASSWORD_RECOVERY event following URL token exchange.
          setStatus((current) => current === "ready" ? current : "waiting");
        }
      } catch (error) {
        if (active) {
          setMessage(error.message || "Unable to verify the reset link.");
          setStatus("invalid");
        }
      }
    };
    initialize();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      await supabase.auth.signOut();
    } catch (error) {
      setMessage(error.message || "Unable to update password.");
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
            <h1>Reset Password</h1>
            <p>Choose a new password for your account.</p>
          </div>
        </div>
        {status === "checking" || status === "waiting" ? (
          <p>Verifying your reset link...</p>
        ) : status === "success" ? (
          <div className="form-message success">Password updated successfully. You can now sign in.</div>
        ) : status === "invalid" ? (
          <div className="form-message error">{message || "This password reset link is invalid or expired. Please request a new one."}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input id="newPassword" type="password" autoComplete="new-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input id="confirmPassword" type="password" autoComplete="new-password" required
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
            </div>
            {message && <div className="form-message error">{message}</div>}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <Link to={status === "invalid" ? "/forgot-password" : "/login"}>
            {status === "invalid" ? "Request a new reset link" : "Back to Sign In"}
          </Link>
        </p>
      </div>
    </main>
  );
}
