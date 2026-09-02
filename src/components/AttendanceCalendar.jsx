import { useState } from "react";

import {
  getClassesForDate,
  getHoliday,
  getExamForDate,
  isWeekend,
  isSemesterActive,
  isNonInstructionalDay,
  setNonInstructionalDay,
  formatDate as formatAcademicDate,
} from "../utils/academicCalendarUtils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const SEMESTER_START = "2026-08-06";
const LIVE_TIMETABLE_START = "2026-09-01";

const ATTENDANCE_STORAGE_KEY =
  "attendanceTrackerRecords";

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isHistoricalPeriod(date) {
  return (
    date < LIVE_TIMETABLE_START &&
    date >= SEMESTER_START
  );
}

function loadAttendance() {
  try {
    const stored = localStorage.getItem(
      ATTENDANCE_STORAGE_KEY
    );

    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);

    return parsed && typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function getTodayDate() {
  return formatAcademicDate(new Date());
}

function isFutureDate(dateString) {
  return dateString > getTodayDate();
}

function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(
    new Date(2026, 7, 1)
  );

  const [selectedDate, setSelectedDate] =
    useState(null);

  const [attendance, setAttendance] =
    useState(loadAttendance);

  const [
    nonInstructionalVersion,
    setNonInstructionalVersion,
  ] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(
    year,
    month,
    1
  ).getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    days.push(day);
  }

  function previousMonth() {
    setCurrentDate(
      new Date(year, month - 1, 1)
    );

    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(
      new Date(year, month + 1, 1)
    );

    setSelectedDate(null);
  }

  const canGoPrevious =
    `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-01` > "2026-08-01";

  const canGoNext =
    `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-01` < "2026-12-01";

  function getDayStatus(day) {
    if (!day) {
      return "empty";
    }

    const date = formatDate(
      year,
      month,
      day
    );

    if (!isSemesterActive(date)) {
      return "outside-semester";
    }

    if (getHoliday(date)) {
      return "holiday";
    }

    if (isNonInstructionalDay(date)) {
      return "non-instructional";
    }

    const exam = getExamForDate(date);

    if (exam) {
      return exam.countsAsClass
        ? "exam-class"
        : "exam";
    }

    if (isWeekend(date)) {
      return "weekend";
    }

    if (isHistoricalPeriod(date)) {
      return "historical";
    }

    const classes =
      getClassesForDate(date);

    if (classes.length > 0) {
      return "class";
    }

    return "normal";
  }

  function handleDateClick(date) {
    setSelectedDate(
      selectedDate === date ? null : date
    );
  }

  function saveAttendance(updated) {
    try {
      localStorage.setItem(
        ATTENDANCE_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch {
      // Ignore storage failures.
    }

    window.dispatchEvent(
      new CustomEvent(
        "attendanceUpdated",
        {
          detail: updated,
        }
      )
    );
  }

  function markAttendance(
    date,
    classIndex,
    status
  ) {
    setAttendance((previous) => {
      const currentStatus =
        previous[date]?.[classIndex] ||
        null;

      const nextStatus =
        currentStatus === status
          ? null
          : status;

      const dateRecords = {
        ...(previous[date] || {}),
      };

      if (nextStatus === null) {
        delete dateRecords[classIndex];
      } else {
        dateRecords[classIndex] =
          nextStatus;
      }

      const updated = {
        ...previous,
      };

      if (
        Object.keys(dateRecords)
          .length === 0
      ) {
        delete updated[date];
      } else {
        updated[date] = dateRecords;
      }

      saveAttendance(updated);

      return updated;
    });
  }

  function getAttendanceStatus(
    date,
    classIndex
  ) {
    return (
      attendance[date]?.[classIndex] ||
      null
    );
  }

  function getDateAttendanceSummary(date) {
    const records = attendance[date];

    if (!records) {
      return {
        present: 0,
        absent: 0,
      };
    }

    let present = 0;
    let absent = 0;

    Object.values(records).forEach(
      (status) => {
        if (status === "present") {
          present++;
        }

        if (status === "absent") {
          absent++;
        }
      }
    );

    return {
      present,
      absent,
    };
  }

  function clearAttendanceForDate(date) {
    setAttendance((previous) => {
      if (!previous[date]) {
        return previous;
      }

      const updated = {
        ...previous,
      };

      delete updated[date];

      saveAttendance(updated);

      return updated;
    });
  }

  function toggleNonInstructionalDay(date) {
  if (!isFutureDate(date)) {
    return;
  }

  if (!isSemesterActive(date)) {
    return;
  }

  if (getHoliday(date)) {
    return;
  }

  if (isWeekend(date)) {
    return;
  }

  if (getExamForDate(date)) {
    return;
  }

  const currentlyMarked =
    isNonInstructionalDay(date);

  if (currentlyMarked) {
    setNonInstructionalDay(date, false);
  } else {
    clearAttendanceForDate(date);
    setNonInstructionalDay(date, true);
  }

  setNonInstructionalVersion(
    (value) => value + 1
  );

  setSelectedDate(null);
}

  function getSelectedDateInfo() {
    if (!selectedDate) {
      return null;
    }

    const holiday =
      getHoliday(selectedDate);

    const exam =
      getExamForDate(selectedDate);

    const weekend =
      isWeekend(selectedDate);

    const historical =
      isHistoricalPeriod(selectedDate);

    const nonInstructional =
      isNonInstructionalDay(
        selectedDate
      );

    const active =
      isSemesterActive(
        selectedDate
      );

    const classes =
      active &&
      !holiday &&
      !exam &&
      !weekend &&
      !historical &&
      !nonInstructional
        ? getClassesForDate(
            selectedDate
          )
        : [];

    return {
      holiday,
      exam,
      weekend,
      historical,
      nonInstructional,
      active,
      classes,
    };
  }

  const selectedInfo =
    getSelectedDateInfo();

  const selectedAttendance =
    selectedDate &&
    selectedInfo
      ? selectedInfo.classes.reduce(
          (summary, _, index) => {
            const status =
              getAttendanceStatus(
                selectedDate,
                index
              );

            if (
              status === "present"
            ) {
              summary.present++;
            }

            if (
              status === "absent"
            ) {
              summary.absent++;
            }

            return summary;
          },
          {
            present: 0,
            absent: 0,
          }
        )
      : {
          present: 0,
          absent: 0,
        };

  return (
    <section
      className="calendar-card"
      key={nonInstructionalVersion}
    >
      <div className="calendar-header">
        <button
          className="calendar-nav"
          onClick={previousMonth}
          disabled={!canGoPrevious}
          aria-label="Previous month"
        >
          ←
        </button>

        <div className="calendar-title">
          <p className="eyebrow">
            ACADEMIC CALENDAR
          </p>

          <h2>
            {MONTHS[month]} {year}
          </h2>
        </div>

        <button
          className="calendar-nav"
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => (
          <div key={day}>
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="calendar-day empty"
              />
            );
          }

          const date = formatDate(
            year,
            month,
            day
          );

          const status =
            getDayStatus(day);

          const holiday =
            getHoliday(date);

          const exam =
            getExamForDate(date);

          const weekend =
            isWeekend(date);

          const historical =
            isHistoricalPeriod(date);

          const nonInstructional =
            isNonInstructionalDay(
              date
            );

          const classes =
            !historical &&
            !holiday &&
            !exam &&
            !weekend &&
            !nonInstructional
              ? getClassesForDate(
                  date
                )
              : [];

          const dateAttendance =
            getDateAttendanceSummary(
              date
            );

          const isSelected =
            selectedDate === date;

          return (
            <button
              key={date}
              type="button"
              className={`calendar-day ${status} ${
                isSelected
                  ? "calendar-day-selected"
                  : ""
              }`}
              onClick={() =>
                handleDateClick(date)
              }
            >
              <strong className="calendar-date">
                {day}
              </strong>

              <div className="calendar-content">
                {holiday && (
                  <>
                    <span className="calendar-label">
                      Holiday
                    </span>

                    <span className="calendar-detail">
                      {holiday.name}
                    </span>
                  </>
                )}

                {nonInstructional && (
                  <>
                    <span className="calendar-label">
                      Non-Instructional
                    </span>

                    <span className="calendar-detail">
                      No classes
                    </span>
                  </>
                )}

                {exam && (
                  <>
                    <span className="calendar-label">
                      {exam.countsAsClass
                        ? "Exam Classes"
                        : "Exam"}
                    </span>

                    <span className="calendar-detail">
                      {exam.name}
                    </span>
                  </>
                )}

                {!holiday &&
                  !nonInstructional &&
                  !exam &&
                  weekend && (
                    <span className="calendar-label">
                      Weekend
                    </span>
                  )}

                {!holiday &&
                  !nonInstructional &&
                  !exam &&
                  !weekend &&
                  historical && (
                    <span className="calendar-label historical-label">
                      Historical
                    </span>
                  )}

                {!holiday &&
                  !nonInstructional &&
                  !exam &&
                  !weekend &&
                  !historical &&
                  classes.length > 0 && (
                    <>
                      <span className="calendar-class-count">
                        {classes.length}{" "}
                        {classes.length === 1
                          ? "class"
                          : "classes"}
                      </span>

                      <span className="calendar-detail">
                        Scheduled
                      </span>
                    </>
                  )}

                {!holiday &&
                  !nonInstructional &&
                  !exam &&
                  !weekend &&
                  !historical &&
                  classes.length === 0 &&
                  status ===
                    "normal" && (
                    <span className="calendar-detail">
                      No classes
                    </span>
                  )}

                {status ===
                  "outside-semester" && (
                  <span className="calendar-detail">
                    Outside semester
                  </span>
                )}

                {dateAttendance.present >
                  0 && (
                  <span className="calendar-attendance-present">
                    ✓{" "}
                    {
                      dateAttendance.present
                    }
                  </span>
                )}

                {dateAttendance.absent >
                  0 && (
                  <span className="calendar-attendance-absent">
                    ×{" "}
                    {
                      dateAttendance.absent
                    }
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span>
          <i className="legend-dot class-dot" />
          Class
        </span>

        <span>
          <i className="legend-dot holiday-dot" />
          Holiday
        </span>

        <span>
          <i className="legend-dot weekend-dot" />
          Weekend
        </span>

        <span>
          <i className="legend-dot exam-dot" />
          Exam
        </span>

        <span>
          <i className="legend-dot historical-dot" />
          Historical
        </span>

        <span>
          <i className="legend-dot non-instructional-dot" />
          Non-Instructional
        </span>
      </div>

      {selectedDate &&
        selectedInfo && (
          <div className="calendar-details">
            <div className="calendar-details-header">
              <div>
                <p className="eyebrow">
                  SELECTED DATE
                </p>

                <h3>
                  {formatDisplayDate(
                    selectedDate
                  )}
                </h3>
              </div>

              <button
                className="calendar-close"
                onClick={() =>
                  setSelectedDate(null)
                }
                aria-label="Close date details"
              >
                ×
              </button>
            </div>

            {selectedInfo.holiday && (
              <div className="date-info holiday-info">
                <strong>
                  Holiday
                </strong>

                <span>
                  {
                    selectedInfo
                      .holiday.name
                  }
                </span>
              </div>
            )}

            {selectedInfo.nonInstructional && (
              <div className="date-info non-instructional-info">
                <strong>
                  Non-Instructional Day
                </strong>

                <span>
                  No classes will be held
                  on this date.
                </span>

                {isFutureDate(
                  selectedDate
                ) && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      toggleNonInstructionalDay(
                        selectedDate
                      )
                    }
                  >
                    Restore Instructional Day
                  </button>
                )}
              </div>
            )}

            {selectedInfo.exam && (
              <div className="date-info exam-info">
                <strong>
                  {selectedInfo.exam
                    .countsAsClass
                    ? "Exam / Class Day"
                    : "Examination"}
                </strong>

                <span>
                  {
                    selectedInfo.exam
                      .name
                  }
                </span>

                <small>
                  {selectedInfo.exam
                    .countsAsClass
                    ? "Counts toward scheduled classes"
                    : "No regular classes scheduled"}
                </small>
              </div>
            )}

            {!selectedInfo.holiday &&
              !selectedInfo.exam &&
              !selectedInfo.nonInstructional &&
              selectedInfo.weekend && (
                <div className="date-info weekend-info">
                  <strong>
                    Weekend
                  </strong>

                  <span>
                    No classes scheduled.
                  </span>
                </div>
              )}

            {!selectedInfo.holiday &&
              !selectedInfo.exam &&
              !selectedInfo.nonInstructional &&
              !selectedInfo.weekend &&
              selectedInfo.historical && (
                <div className="date-info historical-info">
                  <strong>
                    Historical Attendance
                  </strong>

                  <span>
                    Attendance for this
                    period is based on
                    your recorded
                    attendance data.
                  </span>
                </div>
              )}

            {!selectedInfo.holiday &&
              !selectedInfo.exam &&
              !selectedInfo.nonInstructional &&
              !selectedInfo.weekend &&
              !selectedInfo.historical &&
              selectedInfo.active &&
              isFutureDate(
                selectedDate
              ) && (
                <div className="date-info">
                  <strong>
                    Schedule Settings
                  </strong>

                  <span>
                    If the university
                    cancels classes on
                    this date, mark it
                    as non-instructional.
                  </span>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      toggleNonInstructionalDay(
                        selectedDate
                      )
                    }
                  >
                    Mark as
                    Non-Instructional
                  </button>
                </div>
              )}

            {!selectedInfo.holiday &&
              !selectedInfo.exam &&
              !selectedInfo.nonInstructional &&
              !selectedInfo.weekend &&
              !selectedInfo.historical &&
              selectedInfo.classes.length ===
                0 && (
                <div className="date-info">
                  <strong>
                    No Classes
                  </strong>

                  <span>
                    No classes are
                    scheduled for this
                    date.
                  </span>
                </div>
              )}

            {!selectedInfo.holiday &&
              !selectedInfo.exam &&
              !selectedInfo.nonInstructional &&
              !selectedInfo.weekend &&
              !selectedInfo.historical &&
              selectedInfo.classes.length >
                0 && (
                <div className="class-list">
                  <div className="class-list-title">
                    <div>
                      <strong>
                        Today's Classes
                      </strong>

                      <span>
                        {
                          selectedInfo
                            .classes.length
                        }{" "}
                        {selectedInfo
                          .classes.length ===
                        1
                          ? "class"
                          : "classes"}
                      </span>
                    </div>

                    <div className="attendance-summary">
                      <span className="present-summary">
                        {
                          selectedAttendance.present
                        }{" "}
                        Present
                      </span>

                      <span className="absent-summary">
                        {
                          selectedAttendance.absent
                        }{" "}
                        Absent
                      </span>
                    </div>
                  </div>

                  {selectedInfo.classes.map(
                    (
                      classItem,
                      index
                    ) => {
                      const currentStatus =
                        getAttendanceStatus(
                          selectedDate,
                          index
                        );

                      return (
                        <div
                          className="class-item"
                          key={`${selectedDate}-${index}`}
                        >
                          <div className="class-time">
                            <strong>
                              {
                                classItem.start
                              }
                            </strong>

                            <span>
                              {
                                classItem.end
                              }
                            </span>
                          </div>

                          <div className="class-info">
                            <strong>
                              {
                                classItem.subject
                              }
                            </strong>

                            <span>
                              {
                                classItem.code
                              }
                            </span>
                          </div>

                          <span className="class-type">
                            {
                              classItem.type
                            }
                          </span>

                          <div className="attendance-actions">
                            <button
                              type="button"
                              className={`attendance-button present-button ${
                                currentStatus ===
                                "present"
                                  ? "attendance-selected"
                                  : ""
                              }`}
                              onClick={() =>
                                markAttendance(
                                  selectedDate,
                                  index,
                                  "present"
                                )
                              }
                            >
                              {currentStatus ===
                              "present"
                                ? "Present ✓"
                                : "Present"}
                            </button>

                            <button
                              type="button"
                              className={`attendance-button absent-button ${
                                currentStatus ===
                                "absent"
                                  ? "attendance-selected"
                                  : ""
                              }`}
                              onClick={() =>
                                markAttendance(
                                  selectedDate,
                                  index,
                                  "absent"
                                )
                              }
                            >
                              {currentStatus ===
                              "absent"
                                ? "Absent ✓"
                                : "Absent"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
          </div>
        )}
    </section>
  );
}

export default AttendanceCalendar;