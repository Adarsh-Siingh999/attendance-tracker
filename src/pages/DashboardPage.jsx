import { useApp } from "../context/AppContext.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Button } from "../components/common/Button.jsx";
import { IconAlertTriangle, IconCheck, IconX, IconSkip, IconCalendar } from "../components/common/Icons.jsx";
import { formatDate, getClassesForDate, getHoliday, getExamForDate, isWeekend, isNonInstructionalDay } from "../utils/academicCalendarUtils.js";
import { getSubjectStatus } from "../utils/attendanceCalculations.js";
import { simulateSkipImpact } from "../utils/skipSimulator.js";

export function DashboardPage() {
  const {
    overall,
    threshold,
    criticalThreshold,
    classesRemaining,
    overallForecast,
    subjects,
    timetable,
    calendar,
    attendanceRecords,
    markAttendance,
    setActiveTab,
  } = useApp();

  const isEligible = overall.percentage >= threshold;
  const todayStr = formatDate(new Date());

  // Check today's schedule
  const todayHoliday = getHoliday(todayStr, calendar?.holidays);
  const todayExam = getExamForDate(todayStr, calendar?.examinations);
  const todayWeekend = isWeekend(todayStr, calendar?.weekends);
  const todayNonInst = isNonInstructionalDay(todayStr, calendar?.nonInstructionalDays);
  const todayClasses = getClassesForDate(todayStr, { calendar, timetable });
  const todayRecords = attendanceRecords[todayStr] || {};

  // Compute quick "Can I Skip Tomorrow?" check
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  const tomorrowClasses = getClassesForDate(tomorrowStr, { calendar, timetable });
  const skipSimulation = simulateSkipImpact({
    subjects,
    classesToSkip: tomorrowClasses,
    threshold,
    criticalThreshold,
  });

  // Critical subjects
  const criticalSubjects = subjects.filter(
    (s) => s.percentage !== null && s.percentage < threshold
  );

  return (
    <div className="page-container dashboard-page">
      {/* 1. TOP OVERVIEW METRICS */}
      <section className="overview-grid">
        <div className="overview-card primary-card">
          <span className="card-label">Overall Attendance</span>
          <strong className="card-value">{overall.percentage.toFixed(2)}%</strong>
          <small className="card-subtext">
            {overall.attended} / {overall.conducted} classes attended
          </small>
          <div className="metric-bar-bg">
            <div
              className={`metric-bar-fill ${isEligible ? "fill-success" : "fill-danger"}`}
              style={{ width: `${Math.min(overall.percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="overview-card">
          <span className="card-label">Eligibility Status</span>
          <strong className={`card-value ${isEligible ? "text-success" : "text-danger"}`}>
            {isEligible ? "Eligible" : "Attendance Shortage"}
          </strong>
          <small className="card-subtext">Target: {threshold}% • Critical: {criticalThreshold}%</small>
        </div>

        <div className="overview-card">
          <span className="card-label">Classes Remaining</span>
          <strong className="card-value">{classesRemaining}</strong>
          <small className="card-subtext">Until semester completion</small>
        </div>

        <div className="overview-card">
          <span className="card-label">Best Achievable</span>
          <strong className={`card-value ${overallForecast.canRecover ? "text-success" : "text-danger"}`}>
            {overallForecast.bestPossible.toFixed(1)}%
          </strong>
          <small className="card-subtext">
            {overallForecast.canRecover ? `Max safe absences: ${overallForecast.maxAllowedAbsences}` : "Shortage unrecoverable"}
          </small>
        </div>
      </section>

      {/* 2. TODAY'S LIVE SCHEDULE & ATTENDANCE MARKER */}
      <section className="dashboard-section today-schedule-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">Today's Schedule & Attendance</h2>
            <p className="section-desc">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<IconCalendar size={14} />} onClick={() => setActiveTab("calendar")}>
            Full Calendar
          </Button>
        </div>

        {todayHoliday ? (
          <div className="day-notice-card holiday-notice">
            <span className="notice-badge">Holiday</span>
            <h3>{todayHoliday.name}</h3>
            <p>No classes scheduled for today. Enjoy your holiday!</p>
          </div>
        ) : todayExam ? (
          <div className="day-notice-card exam-notice">
            <span className="notice-badge">{todayExam.countsAsClass ? "Examination (Counts as Class)" : "Examination Period"}</span>
            <h3>{todayExam.name}</h3>
          </div>
        ) : todayNonInst ? (
          <div className="day-notice-card noninst-notice">
            <span className="notice-badge">Non-Instructional Day</span>
            <h3>Classes Cancelled</h3>
            <p>Marked as non-instructional day by your schedule settings.</p>
          </div>
        ) : todayWeekend ? (
          <div className="day-notice-card weekend-notice">
            <span className="notice-badge">Weekend</span>
            <h3>Academic Weekend</h3>
            <p>No lectures scheduled for today. Use this time to catch up or relax.</p>
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="day-notice-card empty-notice">
            <p>No classes scheduled for today according to your weekly timetable.</p>
          </div>
        ) : (
          <div className="today-classes-list">
            {todayClasses.map((item, index) => {
              const status = todayRecords[index] || null;
              return (
                <div key={index} className="today-class-card">
                  <div className="class-time-block">
                    <span className="time-start">{item.start}</span>
                    <span className="time-end">{item.end}</span>
                  </div>

                  <div className="class-detail-block">
                    <div className="class-name-row">
                      <strong className="class-subject">{item.subject}</strong>
                      <span className="class-type-badge">{item.type}</span>
                    </div>
                    <div className="class-meta-row">
                      {item.code && <span className="class-code">{item.code}</span>}
                      {item.room && <span className="class-room">• {item.room}</span>}
                    </div>
                  </div>

                  <div className="class-actions-block">
                    <button
                      type="button"
                      className={`btn-mark mark-present ${status === "present" ? "active" : ""}`}
                      onClick={() => markAttendance(todayStr, index, "present")}
                      title={status === "present" ? "Marked Present (Click to unmark)" : "Mark as Present"}
                    >
                      <IconCheck size={14} />
                      <span>{status === "present" ? "Present ✓" : "Present"}</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-mark mark-absent ${status === "absent" ? "active" : ""}`}
                      onClick={() => markAttendance(todayStr, index, "absent")}
                      title={status === "absent" ? "Marked Absent (Click to unmark)" : "Mark as Absent"}
                    >
                      <IconX size={14} />
                      <span>{status === "absent" ? "Absent ✗" : "Absent"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. "CAN I SKIP TOMORROW?" QUICK SIMULATION WIDGET */}
      <section className="dashboard-section skip-widget-section">
        <div className="skip-widget-card">
          <div className="skip-widget-left">
            <div className="widget-icon-box">
              <IconSkip size={24} />
            </div>
            <div>
              <span className="widget-eyebrow">QUICK SIMULATION</span>
              <h3 className="widget-title">Can I Skip Tomorrow? ({tomorrowStr})</h3>
              <p className="widget-desc">{skipSimulation.description}</p>
            </div>
          </div>
          <div className="skip-widget-right">
            <Badge variant={skipSimulation.badge} size="md" className="skip-verdict-badge">
              {skipSimulation.verdict}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("skip")}>
              Run Full Simulator →
            </Button>
          </div>
        </div>
      </section>

      {/* 4. PRECAUTION / SHORTAGE ALERT BANNER */}
      {criticalSubjects.length > 0 && (
        <section className="dashboard-section precaution-section">
          <div className="precaution-box">
            <div className="precaution-header">
              <IconAlertTriangle size={20} className="text-warning" />
              <h3>{criticalSubjects.length} Subject(s) Need Attention (&lt;{threshold}%)</h3>
            </div>
            <p className="precaution-subtitle">
              Attendance in these courses is below your {threshold}% eligibility threshold. Prioritize attending these upcoming classes:
            </p>
            <div className="precaution-chips-row">
              {criticalSubjects.map((s) => (
                <div key={s.id} className="precaution-chip">
                  <span className="chip-name">{s.name}</span>
                  <span className="chip-pct">{s.percentage !== null ? `${s.percentage.toFixed(1)}%` : "0%"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. SUBJECTS SUMMARY GRID */}
      <section className="dashboard-section subjects-overview-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading">Subject Attendance</h2>
            <p className="section-desc">Real-time status across all registered courses</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab("subjects")}>
            Manage Subjects →
          </Button>
        </div>

        <div className="dashboard-subjects-grid">
          {subjects.map((sub) => {
            const status = getSubjectStatus(sub.percentage, threshold, criticalThreshold);
            return (
              <div key={sub.id} className="dashboard-subject-card">
                <div className="subj-card-top">
                  <div>
                    <h4 className="subj-title">{sub.name}</h4>
                    {sub.code && <span className="subj-code">{sub.code}</span>}
                  </div>
                  <Badge
                    variant={
                      status === "Eligible" ? "success" : status === "Precaution" ? "warning" : "danger"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div className="subj-card-numbers">
                  <strong className="subj-pct">
                    {sub.percentage !== null ? `${sub.percentage.toFixed(1)}%` : "—"}
                  </strong>
                  <span className="subj-count">
                    {sub.attended} / {sub.conducted} classes
                  </span>
                </div>

                <div className="metric-bar-bg">
                  <div
                    className={`metric-bar-fill ${
                      sub.percentage >= threshold ? "fill-success" : "fill-danger"
                    }`}
                    style={{ width: `${Math.min(sub.percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
