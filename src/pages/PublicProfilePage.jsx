import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { IconCheck } from "../components/common/Icons.jsx";

export function PublicProfilePage() {
  const { profile, activeSemester, overall, subjects, publicSettings, savePublicSettings, threshold } = useApp();

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

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const publicUrl = `https://attendanceflow.app/u/${slug}`;

  const togglePrivacy = (key) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    savePublicSettings({
      isPublicEnabled: isEnabled,
      publicSlug: slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      ...privacy,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEligible = overall.percentage >= threshold;

  return (
    <div className="page-container public-profile-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Public Shareable Attendance Link</h2>
          <p className="section-desc">
            Generate a secure, read-only public profile link you can share with mentors, parents, or friends. You control exactly what is visible.
          </p>
        </div>
      </div>

      <div className="public-settings-grid">
        {/* CONFIGURATION COLUMN */}
        <div className="settings-card">
          <h3 className="card-section-title">Link & Privacy Settings</h3>

          <form onSubmit={handleSave} className="settings-form">
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
                <span className="slug-prefix">app.com/u/</span>
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
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copied ? "Copied!" : "Copy"}
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
    </div>
  );
}
