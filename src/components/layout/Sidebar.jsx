import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  IconDashboard,
  IconSubjects,
  IconTimetable,
  IconCalendar,
  IconForecast,
  IconSkip,
  IconSparkles,
  IconSettings,
  IconShare,
} from "../common/Icons.jsx";
import { Badge } from "../common/Badge.jsx";
import { AuthModal } from "../auth/AuthModal.jsx";
import { UserGuideModal } from "../common/UserGuideModal.jsx";

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    semesters,
    activeSemesterId,
    setActiveSemesterId,
    overall,
    threshold,
  } = useApp();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <IconDashboard size={18} /> },
    { id: "subjects", label: "Subjects", icon: <IconSubjects size={18} /> },
    { id: "timetable", label: "Timetable", icon: <IconTimetable size={18} /> },
    { id: "calendar", label: "Calendar", icon: <IconCalendar size={18} /> },
    { id: "skip", label: "Can I Skip?", icon: <IconSkip size={18} />, highlight: true },
    { id: "forecast", label: "Forecast", icon: <IconForecast size={18} /> },
    { id: "import", label: "AI Import", icon: <IconSparkles size={18} />, badge: "AI" },
    { id: "public", label: "Public Link", icon: <IconShare size={18} /> },
    { id: "settings", label: "Settings", icon: <IconSettings size={18} /> },
  ];

  const isEligible = overall.percentage >= threshold;

  return (
    <>
      <aside className="saas-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">AttendanceFlow</span>
            <span className="brand-badge">Galgotias</span>
          </div>
        </div>

        <div className="sidebar-semester-box">
          <label className="sidebar-label">ACADEMIC SEMESTER</label>
          <select
            value={activeSemesterId || ""}
            onChange={(e) => setActiveSemesterId(e.target.value)}
            className="semester-select"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isArchived ? "(Archived)" : ""}
              </option>
            ))}
          </select>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${activeTab === item.id ? "active" : ""} ${
                item.highlight ? "nav-highlight" : ""
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span className="nav-link-text">{item.label}</span>
              {item.badge && (
                <Badge variant="purple" size="sm" className="nav-badge">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}

          <button
            type="button"
            className="nav-link nav-guide-link"
            onClick={() => setIsGuideOpen(true)}
          >
            <span className="nav-link-icon">📖</span>
            <span className="nav-link-text">Student Guide</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="user-profile-widget clickable-widget"
            onClick={() => setIsAuthOpen(true)}
            title="Click to switch profile or log out"
          >
            <div className="user-avatar">{currentUser?.avatarInitials || "AS"}</div>
            <div className="user-info">
              <span className="user-name">{currentUser?.name || "Student"}</span>
              <span className="user-subtext">
                {overall.percentage.toFixed(1)}% •{" "}
                <span className={isEligible ? "text-success" : "text-danger"}>
                  {isEligible ? "Eligible" : "Shortage"}
                </span>
              </span>
            </div>
            <span className="switch-icon-tag ml-auto">⇄</span>
          </button>
        </div>
      </aside>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
