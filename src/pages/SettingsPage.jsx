import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { IconDownload, IconTrash, IconPlus, IconCheck, IconSparkles } from "../components/common/Icons.jsx";
import { storageService } from "../services/storageService.js";
import { SemesterWizardModal } from "../components/common/SemesterWizardModal.jsx";
import { AuthModal } from "../components/auth/AuthModal.jsx";

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

        {/* 4. BACKUP & SYSTEM RESET */}
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
