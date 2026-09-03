import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Button } from "../common/Button.jsx";

export function AuthPage() {
  const { authenticateUser, registerUser, loginWithGoogle } = useApp();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"

  // Sign In Form
  const [signInEmail, setSignInEmail] = useState("singhadarshkr836@gmail.com");
  const [signInPassword, setSignInPassword] = useState("adarsh123");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up Form
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [institution, setInstitution] = useState("Galgotias University");
  const [program, setProgram] = useState("B.Tech Computer Science & Engineering");

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    const res = authenticateUser(signInEmail, signInPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Authentication failed. Please check credentials.");
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    const res = registerUser({
      name: signUpName.trim(),
      email: signUpEmail.trim(),
      password: signUpPassword,
      institution: institution.trim(),
      program: program.trim(),
      template: "clean", // Always start fresh and clean for new users!
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Registration failed.");
    }
  };

  const handleGoogleAuth = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      loginWithGoogle();
      setIsSubmitting(false);
    }, 400);
  };

  const handleOneClickAdarshDemo = () => {
    setSignInEmail("singhadarshkr836@gmail.com");
    setSignInPassword("adarsh123");
    authenticateUser("singhadarshkr836@gmail.com", "adarsh123");
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card-box">
        {/* BRAND HEADER */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="auth-app-name">AttendanceFlow</h1>
          <span className="auth-college-pill">Galgotias University Edition</span>
          <p className="auth-tagline">
            Smart attendance tracking, absence consequence simulation, and exam eligibility forecasting.
          </p>
        </div>

        {/* TABS SELECTOR */}
        <div className="auth-tab-switch-row">
          <button
            type="button"
            className={`auth-switch-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setErrorMsg("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-switch-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setErrorMsg("");
            }}
          >
            Create Free Account
          </button>
        </div>

        {errorMsg && (
          <div className="auth-error-alert" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. SIGN IN TAB */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email or College ID</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="e.g. yourname@gmail.com"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="label-with-hint">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="btn-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="form-input"
                placeholder="Enter password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn w-full"
            >
              {isSubmitting ? "Signing In..." : "Sign In to AttendanceFlow"}
            </Button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-signin-btn"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* PRE-CONFIGURED 1-CLICK DEMO */}
            <div className="adarsh-demo-box">
              <span className="demo-badge">LOCAL SEED RECORD</span>
              <p className="demo-desc">
                Adarsh Singh's Semester V record (Galgotias, 45/77 attendance, 7 subjects) is saved locally.
              </p>
              <button
                type="button"
                className="btn-demo-adarsh"
                onClick={handleOneClickAdarshDemo}
              >
                1-Click Demo: Continue as Adarsh Singh
              </button>
            </div>
          </form>
        ) : (
          /* 2. SIGN UP TAB */
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name <span className="required-star">*</span></label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Priya Sharma"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span className="required-star">*</span></label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="e.g. priya@gmail.com"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required-star">*</span></label>
              <input
                type="password"
                required
                minLength={4}
                className="form-input"
                placeholder="At least 4 characters"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">University / College</label>
                <input
                  type="text"
                  className="form-input"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Program & Branch</label>
                <input
                  type="text"
                  className="form-input"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>
            </div>

            <div className="fresh-account-notice">
              <span>✨</span>
              <p>
                <strong>Fresh Start Guarantee:</strong> Your new account starts completely new with zero attendance and clean courses so you can track your own personal records.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-btn w-full"
            >
              {isSubmitting ? "Creating Account..." : "Create Account & Start Fresh"}
            </Button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-signin-btn"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <span>Sign Up with Google</span>
            </button>
          </form>
        )}

        <div className="auth-footer-text">
          <p>Galgotias University Edition • 75% Eligibility Criteria Enforced</p>
        </div>
      </div>
    </div>
  );
}
