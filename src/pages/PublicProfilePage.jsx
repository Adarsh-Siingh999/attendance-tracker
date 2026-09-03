import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { IconCheck, IconShare } from "../components/common/Icons.jsx";
import {
  generateDeviceSyncUrl,
  getQrCodeImageUrl,
  triggerNativeShare,
} from "../services/crossDeviceSyncService.js";

export function PublicProfilePage() {
  const {
    profile,
    activeSemester,
    overall,
    subjects,
    attendanceRecords,
    publicSettings,
    savePublicSettings,
    threshold,
  } = useApp();

  const [activeTab, setActiveTab] = useState("deviceSync"); // "deviceSync" | "publicLink"

  // Device Sync State
  const [syncUrl, setSyncUrl] = useState("");
  const [isSyncGenerating, setIsSyncGenerating] = useState(false);
  const [syncCopied, setSyncCopied] = useState(false);

  // Public Link State
  const [isEnabled, setIsEnabled] = useState(publicSettings.isPublicEnabled ?? false);
  const [slug, setSlug] = useState(publicSettings.publicSlug || "my-attendance");
  const [privacy, setPrivacy] = useState({
    showOverallAttendance: publicSettings.showOverallAttendance ?? true,
    showSubjectAttendance: publicSettings.showSubjectAttendance ?? true,
    showSubjectNames: publicSettings.showSubjectNames ?? true,
    showCourseCodes: publicSettings.showCourseCodes ?? true,
    showTimetable: publicSettings.showTimetable ?? false,
    showCalendar: publicSettings.showCalendar ?? false,
    showInstitution: publicSettings.showInstitution ?? true,
  });

  const [publicCopied, setPublicCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Base URL for current deployment
  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://attendanceflow.app";
  const publicUrl = `${originUrl}/?u=${slug}`;

  // Generate sync URL when tab is opened
  useEffect(() => {
    let isMounted = true;
    setIsSyncGenerating(true);

    generateDeviceSyncUrl().then((res) => {
      if (isMounted) {
        setSyncUrl(res.url);
        setIsSyncGenerating(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [attendanceRecords, subjects, profile, activeSemester]);

  const handleCopySyncUrl = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setSyncCopied(true);
      setTimeout(() => setSyncCopied(false), 2500);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleNativeShare = async () => {
    if (!syncUrl) return;
    const res = await triggerNativeShare(
      syncUrl,
      `${profile.fullName || "My"} Attendance Tracker`,
      `Here is my live up-to-date attendance tracker (${overall.percentage.toFixed(1)}%):`
    );
    if (res.copied) {
      setSyncCopied(true);
      setTimeout(() => setSyncCopied(false), 2500);
    }
  };

  const togglePrivacy = (key) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePublicSettings = (e) => {
    e.preventDefault();
    savePublicSettings({
      isPublicEnabled: isEnabled,
      publicSlug: slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      ...privacy,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setPublicCopied(true);
    setTimeout(() => setPublicCopied(false), 2000);
  };

  const isEligible = overall.percentage >= threshold;
  const qrImageUrl = syncUrl ? getQrCodeImageUrl(syncUrl, 220) : "";
  const datesCount = Object.keys(attendanceRecords || {}).length;

  return (
    <div className="page-container public-profile-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Cross-Device Sync & Sharing</h2>
          <p className="section-desc">
            Sync your current condition to your laptop or another phone, or share a read-only attendance link with parents and mentors.
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="sync-nav-tabs">
        <button
          type="button"
          className={`sync-tab-btn ${activeTab === "deviceSync" ? "active" : ""}`}
          onClick={() => setActiveTab("deviceSync")}
        >
          📱 Live Sync to Other Device (Laptop / Phone)
        </button>
        <button
          type="button"
          className={`sync-tab-btn ${activeTab === "publicLink" ? "active" : ""}`}
          onClick={() => setActiveTab("publicLink")}
        >
          🌐 Public Read-Only Profile Link
        </button>
      </div>

      {/* TAB 1: LIVE CROSS-DEVICE SYNC */}
      {activeTab === "deviceSync" && (
        <div className="device-sync-grid">
          {/* LEFT: SYNC LINK & SHARING */}
          <div className="settings-card">
            <div className="card-header-badge">
              <span className="sync-live-tag">🟢 LIVE CONDITION READY</span>
              <span className="sync-updated-text">Updated up to this second</span>
            </div>
            <h3 className="card-section-title">Share to Laptop, iPad, or Another Phone</h3>
            <p className="card-desc">
              When you open this link on another device, it will immediately load your current condition with all your subjects, marked classes, and timetable.
            </p>

            <div className="current-state-summary-box">
              <div className="state-summary-row">
                <span className="summary-label">Active Student:</span>
                <strong>{profile.fullName || "Student"} ({activeSemester.name})</strong>
              </div>
              <div className="state-summary-row">
                <span className="summary-label">Current Overall Attendance:</span>
                <strong className={isEligible ? "text-success" : "text-danger"}>
                  {overall.percentage.toFixed(1)}%
                </strong>
              </div>
              <div className="state-summary-row">
                <span className="summary-label">Attendance History:</span>
                <span>{datesCount} day(s) recorded • {subjects.length} course(s)</span>
              </div>
            </div>

            {/* SYNC LINK INPUT */}
            <div className="sync-input-group mt-3">
              <label className="form-label">Instant Live Vercel Link</label>
              <div className="sync-url-bar">
                <input
                  type="text"
                  readOnly
                  value={isSyncGenerating ? "Generating live link..." : syncUrl}
                  className="form-input sync-text-box"
                  onClick={(e) => e.target.select()}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCopySyncUrl}
                  disabled={isSyncGenerating || !syncUrl}
                >
                  {syncCopied ? <IconCheck size={16} /> : null}
                  {syncCopied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  icon={<IconShare size={16} />}
                  onClick={handleNativeShare}
                  disabled={isSyncGenerating || !syncUrl}
                  title="Share via WhatsApp or AirDrop"
                >
                  Share
                </Button>
              </div>
              <span className="form-help-text mt-1">
                Send this link via WhatsApp, Email, or Slack to your laptop. Opening it will immediately sync your current phone condition!
              </span>
            </div>

            <div className="sync-instructions-card mt-3">
              <strong>✨ How it works on the other device:</strong>
              <ol className="instructions-ol">
                <li>Copy the link above and open it in your laptop or second phone browser.</li>
                <li>The app automatically unpacks your live attendance condition onto the new device.</li>
                <li>Everything is up to date: your attendance percentages, marks, and timetable are ready to use!</li>
              </ol>
            </div>
          </div>

          {/* RIGHT: SCANNABLE QR CODE */}
          <div className="settings-card qr-card text-center">
            <div className="qr-badge-title">
              <Badge variant="primary" size="md">Instant QR Code</Badge>
            </div>
            <h3 className="card-section-title mt-1">Scan from Other Device</h3>
            <p className="card-desc">
              Point your laptop webcam or another phone camera at this QR code to open your up-to-date tracker instantly.
            </p>

            <div className="qr-display-frame">
              {isSyncGenerating ? (
                <div className="qr-placeholder">Generating QR code...</div>
              ) : qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="Scan QR code to open on other device"
                  className="qr-img-responsive"
                  width={220}
                  height={220}
                />
              ) : null}
            </div>

            <div className="qr-footer-hint">
              <span>📷 Scannable by any mobile camera or QR app</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLIC READ-ONLY LINK */}
      {activeTab === "publicLink" && (
        <div className="public-settings-grid">
          {/* CONFIGURATION COLUMN */}
          <div className="settings-card">
            <h3 className="card-section-title">Link & Privacy Settings</h3>

            <form onSubmit={handleSavePublicSettings} className="settings-form">
              <div className="form-group">
                <label className="checkbox-label mb-2">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                  />
                  <strong>Enable Public View Link</strong>
                </label>
                <span className="form-help-text">
                  When enabled, anyone with the link can view your shared attendance statistics without editing permissions.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Personal URL Slug</label>
                <div className="slug-input-row">
                  <span className="slug-prefix">{originUrl}/?u=</span>
                  <input
                    type="text"
                    className="form-input slug-input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="your-name"
                    disabled={!isEnabled}
                  />
                </div>
              </div>

              {isEnabled && (
                <div className="shareable-link-box">
                  <input type="text" readOnly value={publicUrl} className="form-input link-text-input" />
                  <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
                    {publicCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label mb-2">Granular Privacy Toggles</label>
                <div className="privacy-toggles-list">
                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={privacy.showOverallAttendance}
                      onChange={() => togglePrivacy("showOverallAttendance")}
                    />
                    <span>Show Overall Attendance %</span>
                  </label>

                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={privacy.showSubjectAttendance}
                      onChange={() => togglePrivacy("showSubjectAttendance")}
                    />
                    <span>Show Subject-Wise Attendance %</span>
                  </label>

                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={privacy.showSubjectNames}
                      onChange={() => togglePrivacy("showSubjectNames")}
                    />
                    <span>Show Course Names</span>
                  </label>

                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={privacy.showCourseCodes}
                      onChange={() => togglePrivacy("showCourseCodes")}
                    />
                    <span>Show Course Codes</span>
                  </label>

                  <label className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={privacy.showInstitution}
                      onChange={() => togglePrivacy("showInstitution")}
                    />
                    <span>Show University / Institution</span>
                  </label>
                </div>
              </div>

              <div className="form-submit-row">
                <Button variant="primary" size="sm" type="submit">
                  Save Settings
                </Button>
                {saved && <span className="saved-badge text-success"><IconCheck size={14} /> Saved!</span>}
              </div>
            </form>
          </div>

          {/* LIVE PREVIEW COLUMN */}
          <div className="settings-card preview-card">
            <div className="preview-badge-row">
              <span className="preview-label">VISITOR PREVIEW</span>
              <Badge variant={isEnabled ? "success" : "neutral"}>
                {isEnabled ? "Publicly Accessible" : "Disabled (Private)"}
              </Badge>
            </div>

            <div className="public-profile-mock">
              <div className="mock-header">
                <div className="mock-avatar">{profile.avatarInitials || "U"}</div>
                <div>
                  <h3 className="mock-name">{profile.fullName || "Student"}</h3>
                  {privacy.showInstitution && (
                    <span className="mock-subtext">{profile.institution || "University Student"} • {activeSemester.name}</span>
                  )}
                </div>
              </div>

              {privacy.showOverallAttendance && (
                <div className="mock-stat-box">
                  <span className="mock-stat-label">Overall Attendance</span>
                  <strong className="mock-stat-num">{overall.percentage.toFixed(1)}%</strong>
                  <Badge variant={isEligible ? "success" : "danger"}>
                    {isEligible ? "Good Standing" : "Shortage"}
                  </Badge>
                </div>
              )}

              {privacy.showSubjectAttendance && (
                <div className="mock-subjects-list">
                  <span className="mock-section-heading">Enrolled Courses</span>
                  {subjects.map((s) => (
                    <div key={s.id} className="mock-subject-row">
                      <div>
                        <span className="mock-subj-title">
                          {privacy.showSubjectNames ? s.name : "Course"}
                        </span>
                        {privacy.showCourseCodes && s.code && (
                          <span className="mock-subj-code"> • {s.code}</span>
                        )}
                      </div>
                      <strong className="mock-subj-val">{s.percentage !== null ? `${s.percentage.toFixed(1)}%` : "—"}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="mock-footer">
                <span>Powered by AttendanceFlow SaaS • Verified Student Record</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
