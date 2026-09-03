import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Button } from "../components/common/Button.jsx";
import { IconAlertTriangle, IconCheck, IconX } from "../components/common/Icons.jsx";
import { formatDate, getClassesForDate } from "../utils/academicCalendarUtils.js";
import { simulateSkipImpact } from "../utils/skipSimulator.js";

export function SkipSimulatorPage() {
  const { subjects, timetable, calendar, threshold, criticalThreshold } = useApp();

  // Mode: "tomorrow" | "custom_date"
  const [mode, setMode] = useState("tomorrow");

  // Calculate default dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  const [customDate, setCustomDate] = useState(tomorrowStr);
  const activeDate = mode === "tomorrow" ? tomorrowStr : customDate;

  // Retrieve classes scheduled for active date
  const scheduledClasses = useMemo(() => {
    return getClassesForDate(activeDate, { calendar, timetable });
  }, [activeDate, calendar, timetable]);

  // Track specifically unselected class indices
  const [deselectedIndices, setDeselectedIndices] = useState([]);

  // Selected class indices are all scheduled classes minus deselected ones
  const selectedIndices = useMemo(() => {
    return scheduledClasses
      .map((_, i) => i)
      .filter((i) => !deselectedIndices.includes(i));
  }, [scheduledClasses, deselectedIndices]);

  const toggleIndex = (idx) => {
    if (deselectedIndices.includes(idx)) {
      setDeselectedIndices(deselectedIndices.filter((i) => i !== idx));
    } else {
      setDeselectedIndices([...deselectedIndices, idx]);
    }
  };

  const selectAll = () => setDeselectedIndices([]);
  const deselectAll = () => setDeselectedIndices(scheduledClasses.map((_, i) => i));

  // Compute classes to skip based on selection
  const classesToSkip = useMemo(() => {
    return selectedIndices.map((i) => scheduledClasses[i]).filter(Boolean);
  }, [selectedIndices, scheduledClasses]);

  // Run the simulation engine
  const result = useMemo(() => {
    return simulateSkipImpact({
      subjects,
      classesToSkip,
      threshold,
      criticalThreshold,
    });
  }, [subjects, classesToSkip, threshold, criticalThreshold]);

  return (
    <div className="page-container skip-simulator-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">"Can I Skip?" Absence Consequence Simulator</h2>
          <p className="section-desc">
            Test the mathematical consequences of missing classes before skipping. See which subjects drop and whether your eligibility is jeopardized.
          </p>
        </div>
      </div>

      {/* SCENARIO SELECTOR */}
      <div className="skip-scenario-bar">
        <div className="scenario-buttons-group">
          <button
            type="button"
            className={`scenario-btn ${mode === "tomorrow" ? "active" : ""}`}
            onClick={() => {
              setMode("tomorrow");
              setDeselectedIndices([]);
            }}
          >
            Skip Tomorrow ({tomorrowStr})
          </button>
          <button
            type="button"
            className={`scenario-btn ${mode === "custom_date" ? "active" : ""}`}
            onClick={() => {
              setMode("custom_date");
              setDeselectedIndices([]);
            }}
          >
            Choose Specific Date
          </button>
        </div>

        {mode === "custom_date" && (
          <div className="custom-date-picker-box">
            <label>Select Date:</label>
            <input
              type="date"
              className="form-input date-input-sm"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDeselectedIndices([]);
              }}
            />
          </div>
        )}
      </div>

      {/* CLASSES SCHEDULED FOR THIS DATE */}
      <div className="skip-classes-selection-card">
        <div className="classes-selection-header">
          <div>
            <h3>Scheduled Classes for {activeDate} ({scheduledClasses.length})</h3>
            <p className="selection-subtext">Toggle individual periods to test skipping partial or entire day.</p>
          </div>
          {scheduledClasses.length > 0 && (
            <div className="selection-quick-toggles">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {scheduledClasses.length === 0 ? (
          <div className="empty-day-skip-notice">
            <IconCheck size={28} className="text-success" />
            <div>
              <h4>No classes scheduled for {activeDate}</h4>
              <p>This day is a weekend, holiday, non-instructional day, or has no timetable classes.</p>
            </div>
          </div>
        ) : (
          <div className="skip-classes-chips-grid">
            {scheduledClasses.map((cls, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`skip-class-chip ${isSelected ? "selected-to-skip" : "kept-attending"}`}
                  onClick={() => toggleIndex(idx)}
                >
                  <div className="chip-time">{cls.start} – {cls.end}</div>
                  <strong className="chip-subject">{cls.subject}</strong>
                  <div className="chip-meta">
                    <span className="chip-type">{cls.type}</span>
                    <span className="chip-status-text">
                      {isSelected ? "Marked to Skip ✗" : "Will Attend ✓"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SIMULATION VERDICT BANNER */}
      {classesToSkip.length > 0 && (
        <div className={`skip-verdict-banner verdict-${result.badge}`}>
          <div className="verdict-icon-col">
            {result.badge === "success" && <IconCheck size={32} />}
            {result.badge === "warning" && <IconAlertTriangle size={32} />}
            {result.badge === "danger" && <IconX size={32} />}
          </div>
          <div className="verdict-content-col">
            <span className="verdict-tag">{result.verdict}</span>
            <h2 className="verdict-headline">{result.headline}</h2>
            <p className="verdict-desc">{result.description}</p>
          </div>
          <div className="verdict-impact-col">
            <span className="impact-label">Overall Drop</span>
            <strong className="impact-drop-val">-{result.overallDrop}%</strong>
            <small className="impact-change">
              {result.overallBefore.toFixed(1)}% → {result.overallAfter.toFixed(1)}%
            </small>
          </div>
        </div>
      )}

      {/* SUBJECT BY SUBJECT IMPACT TABLE */}
      {result.affectedSubjects.length > 0 && (
        <div className="skip-impact-table-card">
          <div className="table-card-header">
            <h3>Subject-by-Subject Impact Breakdown</h3>
            <span className="table-hint">Target threshold: {threshold}% • Critical: {criticalThreshold}%</span>
          </div>

          <div className="table-responsive">
            <table className="impact-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Skipping</th>
                  <th>Current Attendance</th>
                  <th>Projected Attendance</th>
                  <th>Impact Drop</th>
                  <th>Status Verdict</th>
                </tr>
              </thead>
              <tbody>
                {result.affectedSubjects.map((item) => (
                  <tr key={item.id} className={item.isSevere ? "row-danger" : item.crossedThreshold ? "row-warning" : ""}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.code && <div className="cell-subtext">{item.code}</div>}
                    </td>
                    <td>
                      <span className="skip-count-badge">
                        {item.skippedClasses} {item.skippedClasses === 1 ? "class" : "classes"}
                      </span>
                    </td>
                    <td>
                      <strong>{item.percentBefore.toFixed(1)}%</strong>
                    </td>
                    <td>
                      <strong className={item.percentAfter < threshold ? "text-danger" : "text-success"}>
                        {item.percentAfter.toFixed(1)}%
                      </strong>
                    </td>
                    <td>
                      <span className="text-danger drop-pill">-{item.drop}%</span>
                    </td>
                    <td>
                      <Badge
                        variant={
                          item.statusAfter === "Eligible" ? "success" : item.statusAfter === "Precaution" ? "warning" : "danger"
                        }
                      >
                        {item.statusAfter}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
