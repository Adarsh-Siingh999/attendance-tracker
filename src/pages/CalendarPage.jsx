import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { IconPlus, IconCalendar, IconX } from "../components/common/Icons.jsx";
import {
  getClassesForDate,
  getHoliday,
  getExamForDate,
  isWeekend,
  isSemesterActive,
  isNonInstructionalDay,
  isSpecialInstructionalDay,
  getSpecialInstructionalDay,
} from "../utils/academicCalendarUtils.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CalendarPage() {
  const {
    calendar,
    saveCalendar,
    timetable,
    attendanceRecords,
    markAttendance,
    clearDateAttendance,
    markDateAsInstructional,
    unmarkDateAsInstructional,
    activeSemester,
    overall,
  } = useApp();

  const liveStart = activeSemester?.liveAttendanceStart || null;

  const [currentDate, setCurrentDate] = useState(() => {
    if (calendar?.startDate) {
      const parts = calendar.startDate.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, 1);
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isInstructionalModalOpen, setIsInstructionalModalOpen] = useState(false);

  // New Event Form State
  const [eventType, setEventType] = useState("holiday");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [countsAsClass, setCountsAsClass] = useState(false);

  // Instructional Override Form State
  const [instructionalScheduleDay, setInstructionalScheduleDay] = useState("");
  const [instructionalNote, setInstructionalNote] = useState("Working Day / Extra Classes");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const getDayStatus = (dateStr) => {
    if (isSpecialInstructionalDay(dateStr, calendar?.specialInstructionalDays)) return "class";
    if (!isSemesterActive(dateStr, calendar)) return "outside-semester";
    if (getHoliday(dateStr, calendar?.holidays)) return "holiday";
    if (isNonInstructionalDay(dateStr, calendar?.nonInstructionalDays)) return "non-instructional";
    const exam = getExamForDate(dateStr, calendar?.examinations);
    if (exam) return exam.countsAsClass ? "exam-class" : "exam";
    if (isWeekend(dateStr, calendar?.weekends, timetable)) return "weekend";

    const classes = getClassesForDate(dateStr, { calendar, timetable });
    if (classes.length > 0) return "class";
    return "normal";
  };

  const toggleNonInstructional = (dateStr) => {
    const currentList = calendar?.nonInstructionalDays || [];
    let updated;
    if (currentList.includes(dateStr)) {
      updated = currentList.filter((d) => d !== dateStr);
    } else {
      clearDateAttendance(dateStr);
      updated = [...currentList, dateStr];
    }
    saveCalendar({ ...calendar, nonInstructionalDays: updated });
  };

  const handleSaveInstructionalDay = (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    markDateAsInstructional(
      selectedDate,
      instructionalScheduleDay !== "" ? Number(instructionalScheduleDay) : null,
      instructionalNote.trim() || "Working Day / Extra Classes"
    );
    setIsInstructionalModalOpen(false);
  };

  const handleSaveCustomEvent = (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate) return;

    if (eventType === "holiday") {
      const currentHolidays = calendar?.holidays || [];
      const updated = [...currentHolidays, { date: eventDate, name: eventName.trim() }];
      saveCalendar({ ...calendar, holidays: updated });
    } else if (eventType === "exam") {
      const currentExams = { ...(calendar?.examinations || {}) };
      const examKey = `exam-${Date.now()}`;
      currentExams[examKey] = {
        name: eventName.trim(),
        startDate: eventDate,
        endDate: eventEndDate || eventDate,
        countsAsClass,
      };
      saveCalendar({ ...calendar, examinations: currentExams });
    }

    setIsEventModalOpen(false);
  };

  const selectedClasses = selectedDate
    ? getClassesForDate(selectedDate, { calendar, timetable, ignoreSemesterRange: true })
    : [];

  const selectedRecords = selectedDate ? attendanceRecords[selectedDate] || {} : {};
  const selectedHoliday = selectedDate ? getHoliday(selectedDate, calendar?.holidays) : null;
  const selectedExam = selectedDate ? getExamForDate(selectedDate, calendar?.examinations) : null;
  const selectedWeekend = selectedDate ? isWeekend(selectedDate, calendar?.weekends, timetable) : false;
  const selectedNonInst = selectedDate ? isNonInstructionalDay(selectedDate, calendar?.nonInstructionalDays) : false;
  const selectedSpecialInst = selectedDate ? getSpecialInstructionalDay(selectedDate, calendar?.specialInstructionalDays) : null;

  return (
    <div className="page-container calendar-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Academic Calendar & Attendance Logger</h2>
          <p className="section-desc">
            Review instructional days, examinations, holidays, and mark date-wise attendance.
          </p>
        </div>
        <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => setIsEventModalOpen(true)}>
          Add Holiday / Exam
        </Button>
      </div>

      <div className="calendar-layout-wrapper">
        {/* CALENDAR MONTH GRID */}
        <div className="calendar-main-card">
          <div className="calendar-nav-header">
            <button type="button" className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
              ←
            </button>
            <h3 className="cal-current-title">
              {MONTHS[month]} {year}
            </h3>
            <button type="button" className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">
              →
            </button>
          </div>

          {/* LEGACY SEMESTER V BASELINE BANNER */}
          {activeSemester?.id === "sem-5-2026" && month === 7 && year === 2026 && (
            <div className="cal-version-strip baseline">
              <div className="version-strip-badge">📌 August Baseline Period</div>
              <div className="version-strip-text">
                All August dates use the <strong>August Baseline Timetable</strong>. Total August attendance is preserved as your initial baseline ({overall.attended}/{overall.conducted} classes). Daily live attendance logging starts on <strong>September 1, 2026</strong>.
              </div>
            </div>
          )}

          {activeSemester?.id === "sem-5-2026" && month >= 8 && year === 2026 && (
            <div className="cal-version-strip live">
              <div className="version-strip-badge">⚡ Live Tracking Active</div>
              <div className="version-strip-text">
                Scheduled using the <strong>September Onward Timetable</strong>. Classes marked Present or Absent increment your live active attendance record.
              </div>
            </div>
          )}

          <div className="calendar-weekdays-row">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="cal-weekday-label">
                {wd}
              </div>
            ))}
          </div>

          <div className="calendar-days-grid">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="cal-day-cell empty" />;
              }

              const dateStr = formatDate(year, month, day);
              const status = getDayStatus(dateStr);
              const isSelected = selectedDate === dateStr;
              const dateRecs = attendanceRecords[dateStr] || {};
              const presCount = Object.values(dateRecs).filter((s) => (typeof s === "object" ? s?.status : s) === "present").length;
              const absCount = Object.values(dateRecs).filter((s) => (typeof s === "object" ? s?.status : s) === "absent").length;

              const holiday = getHoliday(dateStr, calendar?.holidays);
              const exam = getExamForDate(dateStr, calendar?.examinations);
              const isSpecialInst = isSpecialInstructionalDay(dateStr, calendar?.specialInstructionalDays);

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={`cal-day-cell ${status} ${isSelected ? "selected-day" : ""}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <strong className="day-number">{day}</strong>
                  <div className="day-cell-meta">
                    {isSpecialInst && <span className="cell-tag tag-instructional">Working Day</span>}
                    {holiday && <span className="cell-tag tag-holiday">Holiday</span>}
                    {exam && (
                      <span className="cell-tag tag-exam">
                        {exam.countsAsClass ? "Exam (Class)" : "Exam"}
                      </span>
                    )}
                    {presCount > 0 && <span className="cell-att-tag tag-present">✓ {presCount}</span>}
                    {absCount > 0 && <span className="cell-att-tag tag-absent">✗ {absCount}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CALENDAR LEGEND */}
          <div className="calendar-legend-bar">
            <span className="legend-item"><i className="legend-dot dot-class" /> Class Day</span>
            <span className="legend-item"><i className="legend-dot dot-holiday" /> Holiday</span>
            <span className="legend-item"><i className="legend-dot dot-weekend" /> Weekend</span>
            <span className="legend-item"><i className="legend-dot dot-exam" /> Examination</span>
            <span className="legend-item"><i className="legend-dot dot-noninst" /> Non-Instructional</span>
          </div>
        </div>

        {/* SELECTED DATE INSPECTOR & ATTENDANCE MARKER */}
        <div className="calendar-inspector-panel">
          {selectedDate ? (
            <div className="inspector-card">
              <div className="inspector-header">
                <div>
                  <span className="inspector-eyebrow">SELECTED DATE</span>
                  <h3 className="inspector-date">{formatDisplayDate(selectedDate)}</h3>
                </div>
                <button type="button" className="btn-close-sm" onClick={() => setSelectedDate(null)}>
                  <IconX size={16} />
                </button>
              </div>

              {/* TIMETABLE VERSION & BASELINE STATUS BANNER (ONLY FOR LEGACY SEMESTER V) */}
              {selectedDate && activeSemester?.id === "sem-5-2026" && liveStart && selectedDate < liveStart && (
                <div className="inspector-banner baseline-banner">
                  <div className="banner-tag-row">
                    <span className="period-pill baseline">📌 August Baseline Period</span>
                    <span className="timetable-version-tag">August Baseline Timetable</span>
                  </div>
                  <p className="period-subtext">
                    Classes on this date use the <strong>August Baseline Timetable</strong>. Total attendance across August is preserved in your starting baseline ({overall.attended}/{overall.conducted} classes). Daily live increments are counted from <strong>September 1 onward</strong>.
                  </p>
                </div>
              )}

              {selectedDate && activeSemester?.id === "sem-5-2026" && liveStart && selectedDate >= liveStart && (
                <div className="inspector-banner live-tracking-banner">
                  <div className="banner-tag-row">
                    <span className="period-pill live">⚡ Live Attendance Active</span>
                    <span className="timetable-version-tag">September Onward Timetable</span>
                  </div>
                  <p className="period-subtext">
                    Classes on this date reflect the <strong>September Onward Timetable</strong>. Marking Present or Absent on this date updates your live attendance records.
                  </p>
                </div>
              )}

              {/* SPECIAL INSTRUCTIONAL DAY OVERRIDE BANNER */}
              {selectedSpecialInst && (
                <div className="inspector-banner instructional-banner">
                  <div className="banner-tag-row">
                    <span className="period-pill live">✨ Special Instructional Day</span>
                    {selectedSpecialInst.scheduleDay !== undefined && selectedSpecialInst.scheduleDay !== null && (
                      <span className="timetable-version-tag">Following {WEEKDAYS[selectedSpecialInst.scheduleDay]} Schedule</span>
                    )}
                  </div>
                  <p className="period-subtext">
                    {selectedSpecialInst.note || "Explicitly designated as a working instructional day."} Scheduled classes are active and count toward live attendance.
                  </p>
                </div>
              )}

              {selectedHoliday && !selectedSpecialInst && (
                <div className="inspector-banner holiday-banner">
                  <strong>Holiday:</strong> {selectedHoliday.name}
                </div>
              )}

              {selectedExam && (
                <div className="inspector-banner exam-banner">
                  <strong>Exam:</strong> {selectedExam.name}{" "}
                  {selectedExam.countsAsClass && "(Counts as instructional classes)"}
                </div>
              )}

              {selectedWeekend && !selectedHoliday && !selectedExam && !selectedSpecialInst && (
                <div className="inspector-banner weekend-banner">
                  Academic Weekend (No lectures scheduled)
                </div>
              )}

              {selectedNonInst && !selectedSpecialInst && (
                <div className="inspector-banner noninst-banner">
                  Marked as Non-Instructional Day (No classes held)
                </div>
              )}

              <div className="inspector-quick-actions">
                {selectedSpecialInst ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unmarkDateAsInstructional(selectedDate)}
                  >
                    ↩ Remove Working Day Status
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsInstructionalModalOpen(true)}
                  >
                    ✨ Mark as Instructional Day
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleNonInstructional(selectedDate)}
                >
                  {selectedNonInst ? "Restore Scheduled Classes" : "Mark as Non-Instructional"}
                </Button>
              </div>

              <div className="inspector-classes-section">
                <h4 className="classes-title">Classes for this Day ({selectedClasses.length})</h4>

                {selectedClasses.length === 0 ? (
                  <p className="no-classes-text">No classes scheduled for this date.</p>
                ) : (
                  <div className="inspector-classes-list">
                    {selectedClasses.map((cls, idx) => {
                      const recordEntry = selectedRecords[idx];
                      const status = typeof recordEntry === "object" ? recordEntry?.status : recordEntry || null;
                      return (
                        <div key={idx} className="inspector-class-item">
                          <div className="item-time">
                            <strong>{cls.start}</strong>
                            <span>{cls.end}</span>
                          </div>

                          <div className="item-info">
                            <strong>{cls.subject}</strong>
                            <div className="item-meta">
                              {cls.code && <span>{cls.code}</span>}
                              <span className="type-pill">{cls.type}</span>
                            </div>
                          </div>

                          <div className="item-attendance-btns">
                            <button
                              type="button"
                              className={`btn-att-pill present ${status === "present" ? "active" : ""}`}
                              onClick={() => markAttendance(selectedDate, idx, "present")}
                              title={status === "present" ? "Marked as Attended (Click to unmark)" : "Mark as Present"}
                            >
                              <span className="btn-icon">✓</span>
                              <span>{status === "present" ? "Attended" : "Present"}</span>
                            </button>
                            <button
                              type="button"
                              className={`btn-att-pill absent ${status === "absent" ? "active" : ""}`}
                              onClick={() => markAttendance(selectedDate, idx, "absent")}
                              title={status === "absent" ? "Marked as Missed (Click to unmark)" : "Mark as Absent"}
                            >
                              <span className="btn-icon">✗</span>
                              <span>{status === "absent" ? "Missed" : "Absent"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="inspector-empty-card">
              <IconCalendar size={36} />
              <h4>Select a Date</h4>
              <p>Click any date in the calendar to inspect scheduled classes and mark daily attendance.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD HOLIDAY / EXAM MODAL */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Add Academic Calendar Event"
        maxWidth="500px"
      >
        <form onSubmit={handleSaveCustomEvent} className="modal-form">
          <div className="form-group">
            <label className="form-label">Event Type</label>
            <select
              className="form-input"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="holiday">University Holiday</option>
              <option value="exam">Examination Period</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Event Name <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Mid-Term Exam or Foundation Day"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Start Date <span className="required-star">*</span></label>
              <input
                type="date"
                className="form-input"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {eventType === "exam" && (
              <div className="form-group">
                <label className="form-label">End Date <span className="required-star">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {eventType === "exam" && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={countsAsClass}
                  onChange={(e) => setCountsAsClass(e.target.checked)}
                />
                <span>Counts as instructional classes (IA tests / Practicals)</span>
              </label>
            </div>
          )}

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsEventModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* MARK AS INSTRUCTIONAL DAY MODAL */}
      <Modal
        isOpen={isInstructionalModalOpen}
        onClose={() => setIsInstructionalModalOpen(false)}
        title="Mark Day as Instructional"
        maxWidth="480px"
      >
        <form onSubmit={handleSaveInstructionalDay} className="modal-form">
          <p className="modal-info-text">
            Designate <strong>{selectedDate ? formatDisplayDate(selectedDate) : "this date"}</strong> as a working instructional day (e.g. Working Sunday or extra lectures). Classes will be activated and open for attendance tracking.
          </p>

          <div className="form-group">
            <label className="form-label">Timetable Schedule to Follow</label>
            <select
              className="form-input"
              value={instructionalScheduleDay}
              onChange={(e) => setInstructionalScheduleDay(e.target.value)}
            >
              <option value="">Default for this day of week (uses day's timetable)</option>
              <option value="0">Sunday Timetable (Day 0)</option>
              <option value="1">Monday Timetable (Day 1)</option>
              <option value="2">Tuesday Timetable (Day 2)</option>
              <option value="3">Wednesday Timetable (Day 3)</option>
              <option value="4">Thursday Timetable (Day 4)</option>
              <option value="5">Friday Timetable (Day 5)</option>
              <option value="6">Saturday Timetable (Day 6)</option>
            </select>
            <span className="field-hint">Select an alternative weekday if running another day's schedule (e.g. follow Monday schedule on a Sunday).</span>
          </div>

          <div className="form-group">
            <label className="form-label">Reason / Description</label>
            <input
              type="text"
              className="form-input"
              value={instructionalNote}
              onChange={(e) => setInstructionalNote(e.target.value)}
              placeholder="e.g. Working Sunday / Make-up lectures"
            />
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsInstructionalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Mark as Instructional
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
