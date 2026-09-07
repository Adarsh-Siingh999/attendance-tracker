import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Button } from "../components/common/Button.jsx";
import { IconAlertTriangle, IconCheck, IconX, IconCalendar } from "../components/common/Icons.jsx";
import { formatDate, getClassesForDate } from "../utils/academicCalendarUtils.js";
import { simulateSkipImpact, simulateDateRangeLeave } from "../utils/skipSimulator.js";

export function SkipSimulatorPage() {
  const { subjects, timetable, calendar, threshold, criticalThreshold } = useApp();

  // Mode: "tomorrow" | "custom_date" | "date_range"
  const [mode, setMode] = useState("tomorrow");

  // Calculate default dates
  const today = new Date();
  const todayStr = formatDate(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  const defaultRangeEnd = new Date();
  defaultRangeEnd.setDate(defaultRangeEnd.getDate() + 5);
  const defaultRangeEndStr = formatDate(defaultRangeEnd);

  const [customDate, setCustomDate] = useState(tomorrowStr);
  const [rangeStartDate, setRangeStartDate] = useState(tomorrowStr);
  const [rangeEndDate, setRangeEndDate] = useState(defaultRangeEndStr);
  const [showItinerary, setShowItinerary] = useState(false);

  const activeDate = mode === "tomorrow" ? tomorrowStr : customDate;

  // Retrieve classes scheduled for active date (single day modes)
  const scheduledClasses = useMemo(() => {
    if (mode === "date_range") return [];
    return getClassesForDate(activeDate, { calendar, timetable });
  }, [mode, activeDate, calendar, timetable]);

  // Track specifically unselected class indices for single-day mode
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

  // Compute classes to skip based on selection in single-day mode
  const classesToSkip = useMemo(() => {
    return selectedIndices.map((i) => scheduledClasses[i]).filter(Boolean);
  }, [selectedIndices, scheduledClasses]);

  // Run single-day simulation engine
  const singleResult = useMemo(() => {
    if (mode === "date_range") return null;
    return simulateSkipImpact({
      subjects,
      classesToSkip,
      threshold,
      criticalThreshold,
    });
  }, [mode, subjects, classesToSkip, threshold, criticalThreshold]);

  // Run Date Range Leave simulation engine (X to Y)
  const rangeResult = useMemo(() => {
    if (mode !== "date_range") return null;
    return simulateDateRangeLeave({
      subjects,
      startDate: rangeStartDate,
      endDate: rangeEndDate,
      todayDate: todayStr,
      calendar,
      timetable,
      threshold,
      criticalThreshold,
    });
  }, [mode, subjects, rangeStartDate, rangeEndDate, todayStr, calendar, timetable, threshold, criticalThreshold]);

  const setRangePreset = (daysFromNow, durationDays) => {
    const s = new Date();
    s.setDate(s.getDate() + daysFromNow);
    const e = new Date(s);
    e.setDate(e.getDate() + durationDays - 1);
    setRangeStartDate(formatDate(s));
    setRangeEndDate(formatDate(e));
  };

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
            Single Specific Date
          </button>
          <button
            type="button"
            className={`scenario-btn ${mode === "date_range" ? "active" : ""}`}
            onClick={() => {
              setMode("date_range");
            }}
          >
            🗓️ Date Range Leave (X to Y)
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

      {/* =================================================================== */}
      {/* MODE 1 & 2: SINGLE DAY SIMULATION (TOMORROW / CUSTOM DATE) */}
      {/* =================================================================== */}
      {mode !== "date_range" && (
        <>
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

          {/* SIMULATION VERDICT BANNER (SINGLE DAY) */}
          {classesToSkip.length > 0 && singleResult && (
            <div className={`skip-verdict-banner verdict-${singleResult.badge}`}>
              <div className="verdict-icon-col">
                {singleResult.badge === "success" && <IconCheck size={32} />}
                {singleResult.badge === "warning" && <IconAlertTriangle size={32} />}
                {singleResult.badge === "danger" && <IconX size={32} />}
              </div>
              <div className="verdict-content-col">
                <span className="verdict-tag">{singleResult.verdict}</span>
                <h2 className="verdict-headline">{singleResult.headline}</h2>
                <p className="verdict-desc">{singleResult.description}</p>
              </div>
              <div className="verdict-impact-col">
                <span className="impact-label">Overall Drop</span>
                <strong className="impact-drop-val">-{singleResult.overallDrop}%</strong>
                <small className="impact-change">
                  {singleResult.overallBefore.toFixed(1)}% → {singleResult.overallAfter.toFixed(1)}%
                </small>
              </div>
            </div>
          )}

          {/* SUBJECT BY SUBJECT IMPACT TABLE (SINGLE DAY) */}
          {singleResult && singleResult.affectedSubjects.length > 0 && (
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
                    {singleResult.affectedSubjects.map((item) => (
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
        </>
      )}

      {/* =================================================================== */}
      {/* MODE 3: DATE RANGE LEAVE SIMULATION (X TO Y) */}
      {/* =================================================================== */}
      {mode === "date_range" && rangeResult && (
        <div className="range-simulator-container">
          {/* RANGE CONTROLS CARD */}
          <div className="range-controls-card">
            <div className="range-card-header">
              <div>
                <h3 className="range-card-title">Leave Date Range Parameters (X to Y)</h3>
                <p className="range-card-desc">
                  Simulates full 100% attendance from present until departure date <strong>{rangeStartDate}</strong>, followed by leave from <strong>{rangeStartDate}</strong> to <strong>{rangeEndDate}</strong>.
                </p>
              </div>
            </div>

            <div className="range-inputs-row">
              <div className="range-input-group">
                <label className="range-label">From Date (X) - Leave Starts:</label>
                <input
                  type="date"
                  className="form-input range-date-input"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="range-input-group">
                <label className="range-label">To Date (Y) - Leave Ends:</label>
                <input
                  type="date"
                  className="form-input range-date-input"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  required
                />
              </div>

              <div className="range-presets-col">
                <label className="range-label">Quick Range Presets:</label>
                <div className="range-presets-chips">
                  <button type="button" className="btn-preset-chip" onClick={() => setRangePreset(1, 3)}>
                    Next 3 Days
                  </button>
                  <button type="button" className="btn-preset-chip" onClick={() => setRangePreset(1, 5)}>
                    Next 5 Days
                  </button>
                  <button type="button" className="btn-preset-chip" onClick={() => setRangePreset(1, 7)}>
                    1 Week (7 Days)
                  </button>
                  <button type="button" className="btn-preset-chip" onClick={() => setRangePreset(1, 14)}>
                    2 Weeks
                  </button>
                </div>
              </div>
            </div>

            {/* RANGE SUMMARY METRICS STRIP */}
            <div className="range-stats-strip">
              <div className="stat-strip-item">
                <span className="strip-lbl">Leave Duration:</span>
                <strong className="strip-val">{rangeResult.totalLeaveDays} days</strong>
                <span className="strip-hint">({rangeStartDate} to {rangeEndDate})</span>
              </div>
              <div className="stat-strip-item">
                <span className="strip-lbl">Instructional Days:</span>
                <strong className="strip-val">{rangeResult.instructionalLeaveDays} days</strong>
                <span className="strip-hint">({rangeResult.totalLeaveDays - rangeResult.instructionalLeaveDays} holidays/weekends)</span>
              </div>
              <div className="stat-strip-item">
                <span className="strip-lbl">Classes Missed in Range:</span>
                <strong className="strip-val text-danger">{rangeResult.totalClassesInLeave} classes</strong>
                <span className="strip-hint">Missed during leave</span>
              </div>
              <div className="stat-strip-item">
                <span className="strip-lbl">Post-Leave Classes (100% Attended):</span>
                <strong className="strip-val text-success">+{rangeResult.totalAttendedPostLeave} classes</strong>
                <span className="strip-hint">All remaining classes through {rangeResult.semesterEndDate}</span>
              </div>
            </div>
          </div>

          {/* VERDICT BANNER (RANGE LEAVE - FULL SEMESTER) */}
          <div className={`skip-verdict-banner verdict-${rangeResult.badge}`}>
            <div className="verdict-icon-col">
              {rangeResult.badge === "success" && <IconCheck size={34} />}
              {rangeResult.badge === "warning" && <IconAlertTriangle size={34} />}
              {rangeResult.badge === "danger" && <IconX size={34} />}
            </div>
            <div className="verdict-content-col">
              <span className="verdict-tag">{rangeResult.verdict.replace(/_/g, " ")}</span>
              <h2 className="verdict-headline">{rangeResult.headline}</h2>
              <p className="verdict-desc">{rangeResult.description}</p>
            </div>
            <div className="verdict-impact-col">
              <span className="impact-label">Semester Final Outcome</span>
              <strong className="impact-drop-val">{rangeResult.overallFinalSemesterPct.toFixed(1)}%</strong>
              <small className="impact-change">
                Current: {rangeResult.overallCurrentPct.toFixed(1)}% • Dip: {rangeResult.overallImmediatePct.toFixed(1)}%
              </small>
            </div>
          </div>

          {/* SPECIFIC INELIGIBLE SUBJECTS ALERT BOX */}
          {rangeResult.ineligibleSubjects.length > 0 ? (
            <div className="ineligible-subjects-alert-box">
              <div className="alert-box-header">
                <IconAlertTriangle size={22} className="text-danger" />
                <div>
                  <h4>Particular Subjects Permanently Ineligible at Semester End (&lt;{threshold}%):</h4>
                  <p>
                    Even if you attend <strong>100% of all remaining classes post-leave</strong> through {rangeResult.semesterEndDate}, you will still fail to reach the {threshold}% requirement in these specific course(s):
                  </p>
                </div>
              </div>

              <div className="ineligible-subjects-grid">
                {rangeResult.ineligibleSubjects.map((sub) => (
                  <div key={sub.id} className={`ineligible-card ${sub.isCritical ? "is-critical-danger" : "is-warning"}`}>
                    <div className="ineligible-card-top">
                      <div>
                        <strong className="sub-title">{sub.name}</strong>
                        {sub.code && <span className="sub-code">{sub.code}</span>}
                      </div>
                      <Badge variant={sub.isCritical ? "danger" : "warning"}>
                        {sub.isCritical ? `Debarment Risk (<${criticalThreshold}%)` : `Shortage (<${threshold}%)`}
                      </Badge>
                    </div>

                    <div className="ineligible-pct-row">
                      <div className="pct-block">
                        <span className="pct-lbl">Current:</span>
                        <strong>{sub.currentPct.toFixed(1)}%</strong>
                      </div>
                      <span className="pct-arrow">→</span>
                      <div className="pct-block">
                        <span className="pct-lbl">Immediate Dip:</span>
                        <strong>{sub.immediatePct.toFixed(1)}%</strong>
                      </div>
                      <span className="pct-arrow">→</span>
                      <div className="pct-block">
                        <span className="pct-lbl">Final Semester:</span>
                        <strong className="text-danger">{sub.finalSemesterPct.toFixed(1)}%</strong>
                      </div>
                    </div>

                    <div className="ineligible-card-footer">
                      <span>Missed in leave: <strong>{sub.missedInLeave}</strong> • Post-leave attended: <strong>+{sub.postLeaveAttended}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="all-eligible-congrats-box">
              <div className="congrats-icon-box">
                <IconCheck size={26} className="text-success" />
              </div>
              <div>
                <h4>All Subjects Fully Eligible at Semester End (≥{threshold}%)!</h4>
                <p>
                  Missing all {rangeResult.totalClassesInLeave} classes from {rangeStartDate} to {rangeEndDate} will not cause any shortages if you attend 100% of your remaining {rangeResult.totalAttendedPostLeave} classes post-leave. Every course will finish above your {threshold}% requirement!
                </p>
              </div>
            </div>
          )}

          {/* RECOVERABLE SUBJECTS CALLOUT (IF ANY SUBJECT DIPPED BUT RECOVERS) */}
          {rangeResult.recoverableSubjects && rangeResult.recoverableSubjects.length > 0 && (
            <div className="recoverable-subjects-box">
              <div className="recoverable-icon-box">
                <span>🔄</span>
              </div>
              <div>
                <h4>{rangeResult.recoverableSubjects.length} Subject(s) Dip During Leave but Successfully Recover!</h4>
                <p>
                  The following courses temporarily dip below {threshold}% on {rangeEndDate}, but return to full eligibility by semester end thanks to 100% post-leave attendance:
                </p>
                <div className="recoverable-chips-row">
                  {rangeResult.recoverableSubjects.map((s, sIdx) => (
                    <span key={sIdx} className="recoverable-chip">
                      <strong>{s.name}</strong>: Dips to {s.immediatePct.toFixed(1)}% → Recovers to {s.finalSemesterPct.toFixed(1)}% ✓
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ALL SUBJECTS IMPACT BREAKDOWN TABLE */}
          <div className="skip-impact-table-card">
            <div className="table-card-header">
              <div>
                <h3>Complete Subject-by-Subject Semester Outcome Breakdown</h3>
                <p className="table-subdesc">Final projected standing across all courses assuming 100% attendance post-range date through {rangeResult.semesterEndDate}</p>
              </div>
              <span className="table-hint">Target threshold: {threshold}% • Critical: {criticalThreshold}%</span>
            </div>

            <div className="table-responsive">
              <table className="impact-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Missed in Leave</th>
                    <th>Post-Leave (100%)</th>
                    <th>Current %</th>
                    <th>Immediate Dip %</th>
                    <th>Final Semester %</th>
                    <th>Final Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeResult.subjects.map((item) => (
                    <tr
                      key={item.id}
                      className={item.isFinalCritical ? "row-danger" : !item.isFinalEligible ? "row-warning" : ""}
                    >
                      <td>
                        <strong>{item.name}</strong>
                        {item.code && <div className="cell-subtext">{item.code}</div>}
                      </td>
                      <td>
                        <span className={`skip-count-badge ${item.missedInLeave > 0 ? "badge-missed" : "badge-zero"}`}>
                          {item.missedInLeave} {item.missedInLeave === 1 ? "class" : "classes"}
                        </span>
                      </td>
                      <td>
                        <span className="text-success font-semibold">
                          +{item.postLeaveAttended} classes
                        </span>
                      </td>
                      <td>
                        <strong>{item.currentPct.toFixed(1)}%</strong>
                        <div className="cell-fraction-sub">({item.currentAttended}/{item.currentConducted})</div>
                      </td>
                      <td>
                        <span className={item.immediatePct < threshold ? "text-danger font-semibold" : ""}>
                          {item.immediatePct.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <strong className={!item.isFinalEligible ? "text-danger" : "text-success"}>
                          {item.finalSemesterPct.toFixed(1)}%
                        </strong>
                        <div className="cell-fraction-sub">({item.finalSemesterAttended}/{item.finalSemesterConducted})</div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            item.statusFinal === "Eligible" ? "success" : item.statusFinal === "Precaution" ? "warning" : "danger"
                          }
                        >
                          {item.statusFinal}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DAY BY DAY LEAVE ITINERARY ACCORDION */}
          <div className="leave-itinerary-card">
            <div className="itinerary-header-row">
              <div>
                <h4>Day-by-Day Leave Itinerary ({rangeResult.leaveDays.length} Days)</h4>
                <p>Inspect scheduled classes and academic holidays across your selected leave window.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowItinerary(!showItinerary)}>
                {showItinerary ? "Hide Itinerary ▲" : "Show Day-by-Day Itinerary ▼"}
              </Button>
            </div>

            {showItinerary && (
              <div className="itinerary-days-list">
                {rangeResult.leaveDays.map((dayItem) => {
                  const dayDate = new Date(`${dayItem.date}T00:00:00`);
                  const weekday = dayDate.toLocaleDateString("en-US", { weekday: "long" });

                  return (
                    <div key={dayItem.date} className={`itinerary-day-row ${!dayItem.isInstructional ? "non-instructional-day" : ""}`}>
                      <div className="itinerary-date-col">
                        <strong>{dayItem.date}</strong>
                        <span className="weekday-sub">{weekday}</span>
                      </div>
                      <div className="itinerary-classes-col">
                        {dayItem.classes.length === 0 ? (
                          <span className="no-classes-tag">No classes (Weekend / Holiday / Non-Instructional)</span>
                        ) : (
                          <div className="itinerary-classes-chips">
                            {dayItem.classes.map((cls, cIdx) => (
                              <div key={cIdx} className="itinerary-class-chip">
                                <span className="cls-time">{cls.start}–{cls.end}</span>
                                <span className="cls-name">{cls.subject}</span>
                                <span className="cls-type">{cls.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
