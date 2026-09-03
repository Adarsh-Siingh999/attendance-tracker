import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { IconSparkles, IconShare, IconX } from "../common/Icons.jsx";
import { Button } from "../common/Button.jsx";
import { AuthModal } from "../auth/AuthModal.jsx";
import { UserGuideModal } from "../common/UserGuideModal.jsx";
import { DeviceSyncModal } from "../common/DeviceSyncModal.jsx";

export function Header() {
  const {
    activeTab,
    setActiveTab,
    activeSemester,
    overall,
    currentUser,
    threshold,
    logoutUser,
    syncNotification,
    clearSyncNotification,
  } = useApp();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const titles = {
    dashboard: { title: "Dashboard", sub: "Live attendance overview & forecasting" },
    subjects: { title: "Subjects & Components", sub: "Manage courses, class types, and component weights" },
    timetable: { title: "Weekly Timetable", sub: "Interactive schedule builder driving daily attendance" },
    calendar: { title: "Academic Calendar", sub: "Semester events, holidays, examinations, and day marks" },
    skip: { title: "Can I Skip?", sub: "Day & class absence consequence simulator" },
    forecast: { title: "Attendance Forecast", sub: "Recovery projections and maximum allowed absences" },
    import: { title: "AI Calendar Importer", sub: "Extract semester schedules from photos or PDFs" },
    public: { title: "Public Shareable Profile", sub: "Configure privacy & read-only attendance view link" },
    settings: { title: "Settings & Semesters", sub: "Profile, criteria thresholds, weekend rules, and data export" },
  };

  const current = titles[activeTab] || titles.dashboard;
  const isEligible = overall.percentage >= threshold;

  return (
    <>
      {syncNotification && (
        <div className="cross-device-sync-banner">
          <span>{syncNotification}</span>
          <button type="button" className="sync-banner-close" onClick={clearSyncNotification} aria-label="Dismiss">
            <IconX size={14} />
          </button>
        </div>
      )}

      <header className="saas-header">
        <div className="header-left">
          <h1 className="header-title">{current.title}</h1>
          <p className="header-subtitle">{current.sub}</p>
        </div>

        <div className="header-right">
          {/* SEMESTER STANDING PILL */}
          <div className="header-status-pill">
            <span className="status-dot-pulse" style={{ backgroundColor: isEligible ? "#16834b" : "#dc3545" }} />
            <span className="status-label">{activeSemester.name}</span>
            <span className="status-val">{overall.percentage.toFixed(1)}%</span>
          </div>

          {/* USER GUIDE BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGuideOpen(true)}
            className="guide-quick-btn desktop-only-btn"
          >
            📖 Guide
          </Button>

          {/* QUICK "CAN I SKIP?" SHORTCUT */}
          {activeTab !== "skip" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("skip")}
              className="header-quick-action desktop-only-btn"
            >
              Can I Skip?
            </Button>
          )}

          {activeTab !== "import" && (
            <Button
              variant="primary"
              size="sm"
              icon={<IconSparkles size={14} />}
              onClick={() => setActiveTab("import")}
              className="desktop-only-btn"
            >
              Import Calendar
            </Button>
          )}

          {/* CROSS-DEVICE LIVE SYNC BUTTON */}
          <Button
            variant="outline"
            size="sm"
            className="header-sync-btn"
            icon={<IconShare size={14} />}
            onClick={() => setIsSyncModalOpen(true)}
            title="Share live condition to another phone, laptop, or tablet"
          >
            <span className="sync-btn-full">📱 Sync Device</span>
            <span className="sync-btn-mobile">Sync</span>
          </Button>

          {/* USER ACCOUNT SWITCH BUTTON */}
          <button
            type="button"
            className="user-pill-btn"
            onClick={() => setIsAuthOpen(true)}
            title="Switch student profile or view accounts"
          >
            <span className="user-pill-avatar">{currentUser?.avatarInitials || "AS"}</span>
            <span className="user-pill-name">{currentUser?.name?.split(" ")[0] || "Student"}</span>
            <span className="user-pill-switch-tag">Switch ▾</span>
          </button>

          {/* LOG OUT BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logoutUser}
            className="logout-nav-btn"
            title="Log out of AttendanceFlow"
          >
            Log Out
          </Button>
        </div>
      </header>

      {/* MODALS */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <DeviceSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
    </>
  );
}
