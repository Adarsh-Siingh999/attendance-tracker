import { useApp } from "../../context/AppContext.jsx";
import {
  IconDashboard,
  IconSubjects,
  IconTimetable,
  IconCalendar,
  IconSkip,
  IconSettings,
} from "../common/Icons.jsx";

export function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <IconDashboard size={20} /> },
    { id: "subjects", label: "Subjects", icon: <IconSubjects size={20} /> },
    { id: "timetable", label: "Timetable", icon: <IconTimetable size={20} /> },
    { id: "calendar", label: "Calendar", icon: <IconCalendar size={20} /> },
    { id: "skip", label: "Skip?", icon: <IconSkip size={20} /> },
    { id: "settings", label: "Settings", icon: <IconSettings size={20} /> },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav-btn ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => {
            setActiveTab(tab.id);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
          aria-label={tab.label}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
          {activeTab === tab.id && <span className="bottom-nav-indicator" />}
        </button>
      ))}
    </nav>
  );
}
