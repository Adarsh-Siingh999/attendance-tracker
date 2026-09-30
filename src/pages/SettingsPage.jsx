import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { IconDownload, IconTrash, IconPlus, IconCheck, IconSparkles, IconCamera } from "../components/common/Icons.jsx";
import { storageService } from "../services/storageService.js";
import { SemesterWizardModal } from "../components/common/SemesterWizardModal.jsx";
import { AuthModal } from "../components/auth/AuthModal.jsx";
import {
  getStoredClaudeApiKey,
  saveStoredClaudeApiKey,
  getStoredGeminiApiKey,
  saveStoredGeminiApiKey,
  getPreferredAiProvider,
  savePreferredAiProvider,
  testClaudeApiKey,
} from "../services/aiService.js";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SettingsPage() {
  const {
    profile,
    updateProfile,
    semesters,
    activeSemester,
    activeSemesterId,
    setActiveSemesterId,
    saveSemester,
    deleteSemester,
    currentUser,
    users,
    loginUser,
    deleteUser,
    resetToFreshApp,
  } = useApp();

  // Modals
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Profile Form
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [institution, setInstitution] = useState(profile.institution || "");
  const [program, setProgram] = useState(profile.program || "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Criteria & Weekend Settings (for active semester)
  const [eligibilityThreshold, setEligibilityThreshold] = useState(activeSemester.eligibilityThreshold ?? 75);
  const [criticalThreshold, setCriticalThreshold] = useState(activeSemester.criticalThreshold ?? 65);
  const [weekends, setWeekends] = useState(activeSemester.weekends || [0, 1]);
  const [rulesSaved, setRulesSaved] = useState(false);

  // New Semester Modal
  const [semName, setSemName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [copySubjects, setCopySubjects] = useState(false);

  // AI Configuration (Claude 3.5 Sonnet & Google Gemini)
  const [aiProvider, setAiProvider] = useState(() => getPreferredAiProvider());
  const [claudeApiKey, setClaudeApiKey] = useState(() => getStoredClaudeApiKey());
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredGeminiApiKey());
  const [isTestingClaude, setIsTestingClaude] = useState(false);
  const [claudeTestResult, setClaudeTestResult] = useState(null);
  const [aiSaved, setAiSaved] = useState(false);

  const handleSaveAiSettings = (e) => {
    e?.preventDefault?.();
    saveStoredClaudeApiKey(claudeApiKey);
    saveStoredGeminiApiKey(geminiApiKey);
    savePreferredAiProvider(aiProvider);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2500);
  };

  const handleTestClaudeSettings = async () => {
    if (!claudeApiKey.trim()) {
      setClaudeTestResult({ success: false, error: "Please enter a Claude API key first." });
      return;
    }
    setIsTestingClaude(true);
    setClaudeTestResult(null);
    const res = await testClaudeApiKey(claudeApiKey.trim());
    setIsTestingClaude(false);
    setClaudeTestResult(res);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      fullName: fullName.trim(),
      institution: institution.trim(),
      program: program.trim(),
      avatarInitials: fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    saveSemester({
      ...activeSemester,
      eligibilityThreshold: Number(eligibilityThreshold),
      criticalThreshold: Number(criticalThreshold),
      weekends,
    });
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2000);
  };

  const toggleWeekendDay = (dayIndex) => {
    if (weekends.includes(dayIndex)) {
      setWeekends(weekends.filter((d) => d !== dayIndex));
    } else {
      setWeekends([...weekends, dayIndex]);
    }
  };

  const handleCreateSemester = (e) => {
    e.preventDefault();
    if (!semName.trim()) return;

    const newSem = saveSemester({
      name: semName.trim(),
      academicYear,
      startDate,
      endDate: endDate || null,
      eligibilityThreshold: 75,
      criticalThreshold: 65,
      weekends: [0, 6], // default Saturday + Sunday for new semester
      isActive: true,
      isArchived: false,
    });

    if (copySubjects) {
      const existingSubjects = storageService.getSubjects(activeSemesterId);
      for (const sub of existingSubjects) {
        storageService.saveSubject({
          semesterId: newSem.id,
          name: sub.name,
          code: sub.code,
          credits: sub.credits,
          color: sub.color,
          components: {
            Lecture: { attended: 0, conducted: 0 },
          },
        });
      }
    }

    setIsSemesterModalOpen(false);
  };

  const handleExportData = () => {
    const data = storageService.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        "Are you sure you want to restore default seed data? Any newly created semesters will be reset to Semester V default."
      )
    ) {
      storageService.resetToSeed();
      window.location.reload();
    }
  };

  return (
    <div className="page-container settings-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Platform Settings & Management</h2>
          <p className="section-desc">
            Manage your student profile, switch user accounts, configure Galgotias semesters, and adjust threshold rules.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAuthOpen(true)}>
          Switch User Account ({currentUser?.name || "Student"})
        </Button>
      </div>

      <div className="settings-grid">
        {/* 1. PROFILE SETTINGS */}
        <div className="settings-card">
          <div className="card-header-with-btn">
            <div>
              <h3 className="card-section-title">Student Profile</h3>
              <p className="card-desc">Active User: <strong>{currentUser?.name}</strong></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsAuthOpen(true)}>
              Switch User ▾
            </Button>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Institution / University</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Galgotias University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Degree / Program</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. B.Tech Computer Science (AIML)"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              />
            </div>

            <div className="form-submit-row">
              <Button variant="primary" size="sm" type="submit">
                Save Profile
              </Button>
              {profileSaved && <span className="saved-badge text-success"><IconCheck size={14} /> Saved!</span>}
            </div>
          </form>

          {/* PROFILES LIST & DELETE ACTION */}
          <div className="settings-profiles-manager">
            <div className="profiles-manager-header">
              <h4 className="sub-section-title">All Student Profiles ({users.length})</h4>
              <Button variant="ghost" size="sm" onClick={() => setIsAuthOpen(true)}>
                + New Profile
              </Button>
            </div>
            <div className="profiles-mini-list">
              {users.map((u) => {
                const isActive = u.id === currentUser?.id;
                return (
                  <div key={u.id} className={`profile-mini-row ${isActive ? "active-profile-pill" : ""}`}>
                    <div className="profile-mini-info">
                      <span className="profile-avatar-sm">{u.avatarInitials || "U"}</span>
                      <div>
                        <strong className="profile-mini-name">{u.name}</strong>
                        {isActive && <Badge variant="success" size="sm" className="ml-1">Active</Badge>}
                        <div className="profile-mini-sub">{u.program || u.institution}</div>
                      </div>
                    </div>
                    <div className="profile-mini-actions">
                      {!isActive && (
                        <button
                          type="button"
                          className="btn-switch-mini"
                          onClick={() => {
                            loginUser(u.id);
                          }}
                        >
                          Switch
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-trash-icon"
                        title={`Delete profile: ${u.name}`}
                        onClick={() => {
                          const isLast = users.length <= 1;
                          const msg = isLast
                            ? `Warning: "${u.name}" is your only remaining profile. Deleting it will leave 0 profiles and return you to the onboarding screen. Proceed?`
                            : `Are you sure you want to permanently delete profile "${u.name}"? All subjects, attendance logs, and timetables for this student will be wiped.`;
                          if (window.confirm(msg)) {
                            deleteUser(u.id);
                          }
                        }}
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. ATTENDANCE CRITERIA & WEEKENDS */}
        <div className="settings-card">
          <h3 className="card-section-title">Attendance Thresholds & Weekends</h3>
          <p className="card-desc">
            Configured specifically for <strong>{activeSemester.name}</strong>.
          </p>

          <form onSubmit={handleSaveRules} className="settings-form">
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Eligibility Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  className="form-input"
                  value={eligibilityThreshold}
                  onChange={(e) => setEligibilityThreshold(e.target.value)}
                  required
                />
                <span className="form-help-text">Galgotias Mandatory: 75% for ETE</span>
              </div>

              <div className="form-group">
                <label className="form-label">Critical Shortage Threshold (%)</label>
                <input
                  type="number"
                  min="30"
                  max="95"
                  className="form-input"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(e.target.value)}
                  required
                />
                <span className="form-help-text">Debar Warning Line: 65%</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Configured Weekend Days</label>
              <div className="weekends-checkbox-grid">
                {DAY_NAMES.map((name, idx) => (
                  <label key={idx} className="checkbox-pill">
                    <input
                      type="checkbox"
                      checked={weekends.includes(idx)}
                      onChange={() => toggleWeekendDay(idx)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-submit-row">
              <Button variant="primary" size="sm" type="submit">
                Update Rules
              </Button>
              {rulesSaved && <span className="saved-badge text-success"><IconCheck size={14} /> Updated!</span>}
            </div>
          </form>
        </div>

        {/* 3. SEMESTER MANAGEMENT & GALGOTIAS SEMESTER VI WIZARD */}
        <div className="settings-card full-width-card">
          <div className="card-header-with-btn">
            <div>
              <h3 className="card-section-title">Academic Semesters (Galgotias University)</h3>
              <p className="card-desc">
                Transition seamlessly from Semester V to Semester VI with 1-week timetable input and AI schedule repetition.
              </p>
            </div>
            <div className="header-action-btns">
              <Button
                variant="primary"
                size="sm"
                icon={<IconSparkles size={14} />}
                onClick={() => setIsWizardOpen(true)}
              >
                Launch Semester VI Wizard
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<IconPlus size={14} />}
                onClick={() => setIsSemesterModalOpen(true)}
              >
                Custom Semester
              </Button>
            </div>
          </div>

          <div className="semesters-list-table">
            {semesters.map((s) => {
              const isActive = s.id === activeSemesterId;
              return (
                <div key={s.id} className={`semester-row-card ${isActive ? "active-sem-row" : ""}`}>
                  <div className="sem-details">
                    <div className="sem-name-row">
                      <strong className="sem-title">{s.name}</strong>
                      {isActive && <Badge variant="success">Active</Badge>}
                      {s.isArchived && <Badge variant="neutral">Archived</Badge>}
                    </div>
                    <span className="sem-meta">
                      Academic Year: {s.academicYear} • Start: {s.startDate} {s.endDate ? `to ${s.endDate}` : ""}
                    </span>
                  </div>

                  <div className="sem-actions-row">
                    {!isActive && (
                      <Button variant="secondary" size="sm" onClick={() => setActiveSemesterId(s.id)}>
                        Switch to this
                      </Button>
                    )}
                    {semesters.length > 1 && (
                      <button
                        type="button"
                        className="btn-trash-icon"
                        onClick={() => deleteSemester(s.id)}
                        aria-label="Delete semester"
                      >
                        <IconTrash size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. AI INTELLIGENCE & SCANNER SETTINGS */}
        <div className="settings-card full-width-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span className="agent-badge">✨ MULTI-PROVIDER AI</span>
                <span className="agent-status-tag">
                  {aiProvider === "claude"
                    ? (claudeApiKey.trim() ? "🟢 Claude 3.5 Sonnet Active" : "⚡ Claude (Key Needed)")
                    : (geminiApiKey.trim() ? "🟢 Gemini 2.0 Active" : "⚡ Gemini (Key Needed)")}
                </span>
              </div>
              <h3 className="card-section-title">AI Intelligence & Scanner (Claude & Gemini)</h3>
              <p className="card-desc">
                Powers the <strong>AI Timetable Vision Scanner</strong> and <strong>Academic Calendar / Circular Importer</strong>. Your keys are stored locally and securely in your browser.
              </p>
            </div>
            <div>
              <Button variant="primary" size="sm" onClick={handleSaveAiSettings}>
                {aiSaved ? <><IconCheck size={14} /> Saved!</> : "Save AI Settings"}
              </Button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", marginTop: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Preferred AI Model:</span>
            <button
              type="button"
              className={`saas-btn btn-sm ${aiProvider === "claude" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setAiProvider("claude")}
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              ⚡ Anthropic Claude 3.5 Sonnet (Recommended)
            </button>
            <button
              type="button"
              className={`saas-btn btn-sm ${aiProvider === "gemini" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setAiProvider("gemini")}
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              ✨ Google Gemini 2.0
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {/* Claude API Key Card */}
            <div style={{ background: "var(--bg-card-subtle, #f9fafb)", padding: "16px", borderRadius: "10px", border: aiProvider === "claude" ? "2px solid #8b5cf6" : "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "14px" }}>Anthropic Claude API Key</strong>
                {aiProvider === "claude" && <Badge variant="primary" size="sm">Active</Badge>}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                Get your key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="link-primary">console.anthropic.com</a>. Best-in-class multi-day timetable vision & circular parsing.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="sk-ant-api03-... (Claude Key)"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button variant="outline" size="sm" onClick={handleTestClaudeSettings} disabled={isTestingClaude}>
                  {isTestingClaude ? "Testing..." : "Test"}
                </Button>
              </div>
              {claudeTestResult && (
                <div style={{ marginTop: "6px", fontSize: "12px", color: claudeTestResult.success ? "#10b981" : "#ef4444" }}>
                  {claudeTestResult.success ? "✅ Claude Connected Successfully!" : `❌ ${claudeTestResult.error}`}
                </div>
              )}
            </div>

            {/* Gemini API Key Card */}
            <div style={{ background: "var(--bg-card-subtle, #f9fafb)", padding: "16px", borderRadius: "10px", border: aiProvider === "gemini" ? "2px solid #3b82f6" : "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "14px" }}>Google Gemini API Key</strong>
                {aiProvider === "gemini" && <Badge variant="primary" size="sm">Active</Badge>}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                Get your free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="link-primary">aistudio.google.com</a>.
              </p>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy... (Gemini Key)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 5. BACKUP & SYSTEM RESET */}
        <div className="settings-card full-width-card">
          <h3 className="card-section-title">Data Backup & Factory Reset</h3>
          <p className="card-desc">
            Export your entire academic profile, timetables, and attendance logs to a portable JSON backup file.
          </p>

          <div className="backup-actions-row">
            <Button variant="outline" size="md" icon={<IconDownload size={16} />} onClick={handleExportData}>
              Export All Data (JSON)
            </Button>
            <Button variant="danger" size="md" onClick={handleResetData}>
              Reset to Original Seed Data
            </Button>
            <Button
              variant="outline"
              size="md"
              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all profiles and start completely fresh with zero profiles? This will log you out and return to the new account registration screen.")) {
                  resetToFreshApp();
                }
              }}
            >
              Start Fresh (0 Profiles)
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE NEW CUSTOM SEMESTER MODAL */}
      <Modal
        isOpen={isSemesterModalOpen}
        onClose={() => setIsSemesterModalOpen(false)}
        title="Create New Custom Semester"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateSemester} className="modal-form">
          <div className="form-group">
            <label className="form-label">
              Semester Name <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Semester VI"
              value={semName}
              onChange={(e) => setSemName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 2026-27"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date (Optional)</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={copySubjects}
                onChange={(e) => setCopySubjects(e.target.checked)}
              />
              <span>Copy subject titles from current semester (resetting attendance to 0)</span>
            </label>
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsSemesterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Semester
            </Button>
          </div>
        </form>
      </Modal>

      {/* GALGOTIAS SEMESTER VI WIZARD MODAL */}
      <SemesterWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />

      {/* AUTH / SWITCH USER MODAL */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
