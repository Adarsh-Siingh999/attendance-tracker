import { useEffect, useMemo, useState } from "react";
import "./index.css";

import {
  initialAttendance,
  ATTENDANCE_THRESHOLD,
  CRITICAL_THRESHOLD,
} from "./data/attendanceData";

import { academicCalendar } from "./data/academicCalendar";

import {
  calculateOverallAttendance,
  calculateSubjectAttendance,
  getEligibility,
  getSubjectStatus,
  calculateRequiredClasses,
  calculateBestPossibleAttendance,
  calculateMaximumAllowedAbsences,
} from "./utils/attendanceCalculations";

import { getFutureClasses } from "./utils/timetableUtils";

import {
  formatDate,
  getClassesForDate,
} from "./utils/academicCalendarUtils";

import AttendanceCalendar from "./components/AttendanceCalendar";

const ATTENDANCE_STORAGE_KEY =
  "attendanceTrackerRecords";

function loadAttendanceRecords() {
  try {
    const stored = localStorage.getItem(
      ATTENDANCE_STORAGE_KEY
    );

    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function App() {
  const [attendanceRecords, setAttendanceRecords] =
    useState(loadAttendanceRecords);

  useEffect(() => {
    function handleAttendanceUpdated(event) {
      setAttendanceRecords(event.detail || {});
    }

    window.addEventListener(
      "attendanceUpdated",
      handleAttendanceUpdated
    );

    return () => {
      window.removeEventListener(
        "attendanceUpdated",
        handleAttendanceUpdated
      );
    };
  }, []);

  const recordedAttendance = useMemo(() => {
    const subjectRecords = {};

    let present = 0;
    let absent = 0;

    for (const [date, records] of Object.entries(
      attendanceRecords
    )) {
      const classes = getClassesForDate(date);

      if (!classes || classes.length === 0) {
        continue;
      }

      for (const [classIndex, status] of Object.entries(
        records || {}
      )) {
        const classItem =
          classes[Number(classIndex)];

        if (!classItem) {
          continue;
        }

        if (!subjectRecords[classItem.code]) {
          subjectRecords[classItem.code] = {
            present: 0,
            absent: 0,
          };
        }

        if (status === "present") {
          present++;
          subjectRecords[classItem.code].present++;
        }

        if (status === "absent") {
          absent++;
          subjectRecords[classItem.code].absent++;
        }
      }
    }

    return {
      present,
      absent,
      subjectRecords,
    };
  }, [attendanceRecords]);

  const overallAttended =
    initialAttendance.overall.attended +
    recordedAttendance.present;

  const overallConducted =
    initialAttendance.overall.conducted +
    recordedAttendance.present +
    recordedAttendance.absent;

  const overall = calculateOverallAttendance(
    overallAttended,
    overallConducted
  );

  const subjects = initialAttendance.subjects.map(
    (subject) => {
      const calculated =
        calculateSubjectAttendance(subject);

      const records =
        recordedAttendance.subjectRecords[
          subject.code
        ] || {
          present: 0,
          absent: 0,
        };

      const attended =
        calculated.attended + records.present;

      const conducted =
        calculated.conducted +
        records.present +
        records.absent;

      return {
        ...calculated,
        attended,
        conducted,
        percentage:
          conducted === 0
            ? null
            : Number(
                (
                  (attended / conducted) *
                  100
                ).toFixed(2)
              ),
      };
    }
  );

  const today = new Date();

  const tomorrow = new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const futureStartDate =
    formatDate(tomorrow);

  const examinationEndDates =
    Object.values(
      academicCalendar.examinations
    ).map((exam) => exam.endDate);

  const latestExaminationEndDate =
    examinationEndDates.length > 0
      ? examinationEndDates.sort().at(-1)
      : null;

  const futureEndDate =
    academicCalendar.endDate ||
    latestExaminationEndDate ||
    futureStartDate;

  const futureClasses = getFutureClasses(
    futureStartDate,
    futureEndDate
  );

  const classesRemaining =
    futureClasses.length;

  const bestPossible =
    calculateBestPossibleAttendance(
      overall.attended,
      overall.conducted,
      classesRemaining
    );

  const requiredClasses =
    calculateRequiredClasses(
      overall.attended,
      overall.conducted,
      ATTENDANCE_THRESHOLD
    );

  const maximumAllowedAbsences =
    calculateMaximumAllowedAbsences(
      overall.attended,
      overall.conducted,
      classesRemaining,
      ATTENDANCE_THRESHOLD
    );

  const canRecover =
    bestPossible.percentage >=
    ATTENDANCE_THRESHOLD;

  const futureBySubject = {};

  for (const classItem of futureClasses) {
    if (!futureBySubject[classItem.code]) {
      futureBySubject[classItem.code] = {
        name: classItem.subject,
        code: classItem.code,
        total: 0,
        PP: 0,
        PR: 0,
      };
    }

    futureBySubject[classItem.code].total++;

    if (classItem.type === "PP") {
      futureBySubject[classItem.code].PP++;
    }

    if (classItem.type === "PR") {
      futureBySubject[classItem.code].PR++;
    }
  }

  const subjectForecasts =
    subjects.map((subject) => {
      const future =
        futureBySubject[subject.code] || {
          total: 0,
          PP: 0,
          PR: 0,
        };

      const bestPossibleSubject =
        calculateBestPossibleAttendance(
          subject.attended,
          subject.conducted,
          future.total
        );

      /*
       * Required classes to reach 65%.
       */
      const requiredSubjectClasses65 =
        calculateRequiredClasses(
          subject.attended,
          subject.conducted,
          CRITICAL_THRESHOLD
        );

      /*
       * Required classes to reach 75%.
       */
      const requiredSubjectClasses75 =
        calculateRequiredClasses(
          subject.attended,
          subject.conducted,
          ATTENDANCE_THRESHOLD
        );

      /*
       * Maximum future absences while maintaining 65%.
       */
      const maximumSubjectAbsences65 =
        calculateMaximumAllowedAbsences(
          subject.attended,
          subject.conducted,
          future.total,
          CRITICAL_THRESHOLD
        );

      return {
        ...subject,

        futureClasses: future.total,
        futurePP: future.PP,
        futurePR: future.PR,

        bestPossiblePercentage:
          bestPossibleSubject.percentage,

        requiredClasses65:
          requiredSubjectClasses65,

        requiredClasses75:
          requiredSubjectClasses75,

        maximumAllowedAbsences65:
          maximumSubjectAbsences65,
      };
    });

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Attendance Tracker</h1>

          <p>
            B.Tech CSE (AIML) • Semester V
          </p>
        </div>

        <button className="profile-button">
          AS
        </button>
      </header>

      <main className="container">
        <section className="welcome">
          <div>
            <p className="eyebrow">
              ACADEMIC YEAR 2026–27
            </p>

            <h2>
              Good afternoon, Adarsh 👋
            </h2>

            <p className="muted">
              Keep track of your attendance and
              stay above the{" "}
              {ATTENDANCE_THRESHOLD}% criteria.
            </p>
          </div>
        </section>

        <section className="overview-grid">
          <div className="overview-card">
            <span>Overall Attendance</span>

            <strong>
              {overall.percentage.toFixed(2)}%
            </strong>

            <small>
              {overall.attended} /{" "}
              {overall.conducted} classes
            </small>
          </div>

          <div className="overview-card">
            <span>Eligibility</span>

            <strong
              className={
                getEligibility(
                  overall.percentage
                ) === "Eligible"
                  ? "success"
                  : "danger"
              }
            >
              {getEligibility(
                overall.percentage
              )}
            </strong>

            <small>
              Required:{" "}
              {ATTENDANCE_THRESHOLD.toFixed(2)}%
            </small>
          </div>

          <div className="overview-card">
            <span>Classes Attended</span>

            <strong>
              {overall.attended}
            </strong>

            <small>
              Out of {overall.conducted} conducted
            </small>
          </div>

          <div className="overview-card">
            <span>Classes Remaining</span>

            <strong>
              {classesRemaining}
            </strong>

            <small>
              From {futureStartDate} to{" "}
              {futureEndDate}
            </small>
          </div>
        </section>

        <section className="section-header">
          <div>
            <p className="eyebrow">
              FORECAST
            </p>

            <h2>
              Attendance Forecast
            </h2>
          </div>
        </section>

        <section className="overview-grid">
          <div className="overview-card">
            <span>Required Classes</span>

            <strong>
              {requiredClasses}
            </strong>

            <small>
              Classes needed to reach{" "}
              {ATTENDANCE_THRESHOLD}%
            </small>
          </div>

          <div className="overview-card">
            <span>
              Best Possible Attendance
            </span>

            <strong
              className={
                canRecover
                  ? "success"
                  : "danger"
              }
            >
              {bestPossible.percentage.toFixed(2)}%
            </strong>

            <small>
              If you attend every remaining
              class
            </small>
          </div>

          <div className="overview-card">
            <span>
              Maximum Allowed Absences
            </span>

            <strong>
              {maximumAllowedAbsences}
            </strong>

            <small>
              While maintaining{" "}
              {ATTENDANCE_THRESHOLD}%
            </small>
          </div>

          <div className="overview-card">
            <span>Recovery Status</span>

            <strong
              className={
                canRecover
                  ? "success"
                  : "danger"
              }
            >
              {canRecover
                ? "Can Recover"
                : "Cannot Recover"}
            </strong>

            <small>
              Based on the{" "}
              {ATTENDANCE_THRESHOLD}% criteria
            </small>
          </div>
        </section>

        <section className="section-header">
          <div>
            <p className="eyebrow">
              SUBJECTS
            </p>

            <h2>
              Subject Attendance
            </h2>
          </div>

          <button className="secondary-button">
            View All
          </button>
        </section>

        <section className="subjects-grid">
          {subjectForecasts.map((subject) => {
            const status =
              getSubjectStatus(
                subject.percentage
              );

            return (
              <article
                className="subject-card"
                key={subject.code}
              >
                <div className="subject-top">
                  <div>
                    <h3>
                      {subject.name}
                    </h3>

                    <p>
                      {subject.code}
                    </p>
                  </div>

                  <span
                    className={`status ${
                      status === "Eligible"
                        ? "status-good"
                        : status ===
                          "Precaution"
                        ? "status-warning"
                        : "status-danger"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="attendance-row">
                  <div>
                    <strong>
                      {subject.percentage ===
                      null
                        ? "—"
                        : `${subject.percentage.toFixed(
                            2
                          )}%`}
                    </strong>

                    <span>
                      Attendance
                    </span>
                  </div>

                  <div className="fraction">
                    {subject.attended}/
                    {subject.conducted}

                    <span>
                      Attended
                    </span>
                  </div>
                </div>

                <div className="progress-background">
                  <div
                    className={`progress ${
                      subject.percentage >=
                      ATTENDANCE_THRESHOLD
                        ? "progress-good"
                        : "progress-danger"
                    }`}
                    style={{
                      width: `${Math.min(
                        subject.percentage ?? 0,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="subject-footer">
                  <span>
                    Eligibility:{" "}
                    {ATTENDANCE_THRESHOLD}%
                  </span>

                  {subject.percentage >=
                  ATTENDANCE_THRESHOLD ? (
                    <span className="good-text">
                      Safe
                    </span>
                  ) : subject.percentage >=
                    CRITICAL_THRESHOLD ? (
                    <span className="warning-text">
                      Precaution
                    </span>
                  ) : (
                    <span className="warning-text">
                      Critical
                    </span>
                  )}
                </div>

                <div className="subject-footer">
                  <span>
                    Future classes:{" "}
                    {subject.futureClasses}
                  </span>
                </div>

                <div className="subject-footer">
                  <span>
                    Required for{" "}
                    {CRITICAL_THRESHOLD}%:
                  </span>

                  <strong>
                    {subject.requiredClasses65}
                  </strong>
                </div>

                <div className="subject-footer">
                  <span>
                    Required for{" "}
                    {ATTENDANCE_THRESHOLD}%:
                  </span>

                  <strong>
                    {subject.requiredClasses75}
                  </strong>
                </div>

                <div className="subject-footer">
                  <span>
                    Max absences at{" "}
                    {CRITICAL_THRESHOLD}%:
                  </span>

                  <strong>
                    {
                      subject.maximumAllowedAbsences65
                    }
                  </strong>
                </div>
              </article>
            );
          })}
        </section>

        <section className="precaution-card">
          <div>
            <p className="eyebrow">
              PRECAUTION
            </p>

            <h2>
              Subjects needing attention
            </h2>

            <p>
              Your tracker identifies subjects
              below the {ATTENDANCE_THRESHOLD}%
              eligibility criteria and separates
              the {CRITICAL_THRESHOLD}% critical
              boundary.
            </p>
          </div>

          <div className="precaution-list">
            {subjectForecasts
              .filter(
                (subject) =>
                  subject.percentage !== null &&
                  subject.percentage <
                    ATTENDANCE_THRESHOLD
              )
              .map((subject) => (
                <span
                  key={subject.code}
                >
                  {subject.name}
                </span>
              ))}
          </div>
        </section>

        <AttendanceCalendar
          attendanceRecords={
            attendanceRecords
          }
          setAttendanceRecords={
            setAttendanceRecords
          }
        />
      </main>
    </div>
  );
}

export default App;