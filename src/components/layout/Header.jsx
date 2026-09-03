import { useApp } from "../../context/AppContext.jsx";
import { IconSparkles } from "../common/Icons.jsx";
import { Button } from "../common/Button.jsx";

export function Header() {
  const { activeTab, setActiveTab, activeSemester, overall, threshold } = useApp();

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
    <header className="saas-header">
      <div className="header-left">
        <h1 className="header-title">{current.title}</h1>
        <p className="header-subtitle">{current.sub}</p>
      </div>

      <div className="header-right">
        <div className="header-status-pill">
          <span className="status-dot-pulse" style={{ backgroundColor: isEligible ? "#16834b" : "#dc3545" }} />
          <span className="status-label">{activeSemester.name}</span>
          <span className="status-val">{overall.percentage.toFixed(1)}%</span>
        </div>

        {activeTab !== "skip" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("skip")}
            className="header-quick-action"
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
          >
            Import Calendar
          </Button>
        )}
      </div>
    </header>
  );
}
