import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { IconCheck, IconPlus, IconTrash, IconSparkles } from "./Icons.jsx";
import { GALGOTIAS_SEM6_PRESET, storageService } from "../../services/storageService.js";
import { generateSemesterScheduleFromTimetable } from "../../utils/academicCalendarUtils.js";

const WEEKDAYS = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
];

export function SemesterWizardModal({ isOpen, onClose }) {
  const { saveSemester, setActiveSemesterId } = useApp();

  const [step, setStep] = useState(1);

  // Step 1: Semester info
  const [semName, setSemName] = useState(GALGOTIAS_SEM6_PRESET.name);
  const [academicYear] = useState(GALGOTIAS_SEM6_PRESET.academicYear);
  const [startDate, setStartDate] = useState(GALGOTIAS_SEM6_PRESET.startDate);
  const [endDate, setEndDate] = useState(GALGOTIAS_SEM6_PRESET.endDate);

  // Step 2: Subjects
  const [subjectsList, setSubjectsList] = useState([
    { name: "Cloud Computing & DevOps", code: "CS601", credits: 4, type: "Lecture" },
    { name: "Deep Learning & Neural Networks", code: "AI602", credits: 4, type: "Lecture" },
    { name: "Full Stack Web Development", code: "CS603", credits: 3, type: "Lecture" },
    { name: "Cyber Security & Cryptography", code: "CS604", credits: 3, type: "Lecture" },
    { name: "Deep Learning Lab", code: "AI602P", credits: 1, type: "Lab" },
  ]);

  // Step 3: 1-Week Timetable Input
  const [selectedDay, setSelectedDay] = useState(1);
  const [timetable, setTimetable] = useState({
    1: [
      { start: "09:00", end: "10:00", subject: "Cloud Computing & DevOps", code: "CS601", type: "Lecture" },
      { start: "10:00", end: "11:00", subject: "Deep Learning & Neural Networks", code: "AI602", type: "Lecture" },
    ],
    2: [
      { start: "09:00", end: "10:00", subject: "Full Stack Web Development", code: "CS603", type: "Lecture" },
      { start: "10:00", end: "11:00", subject: "Cyber Security & Cryptography", code: "CS604", type: "Lecture" },
      { start: "11:30", end: "13:30", subject: "Deep Learning Lab", code: "AI602P", type: "Lab" },
    ],
    3: [
      { start: "09:00", end: "10:00", subject: "Cloud Computing & DevOps", code: "CS601", type: "Lecture" },
      { start: "10:00", end: "11:00", subject: "Full Stack Web Development", code: "CS603", type: "Lecture" },
    ],
    4: [
      { start: "09:00", end: "10:00", subject: "Deep Learning & Neural Networks", code: "AI602", type: "Lecture" },
      { start: "10:00", end: "11:00", subject: "Cyber Security & Cryptography", code: "CS604", type: "Lecture" },
    ],
    5: [
      { start: "09:00", end: "10:00", subject: "Cloud Computing & DevOps", code: "CS601", type: "Lecture" },
      { start: "10:00", end: "11:00", subject: "Deep Learning & Neural Networks", code: "AI602", type: "Lecture" },
      { start: "11:30", end: "12:30", subject: "Full Stack Web Development", code: "CS603", type: "Lecture" },
    ],
    6: [
      { start: "09:00", end: "10:00", subject: "Cyber Security & Cryptography", code: "CS604", type: "Lecture" },
    ],
  });

  // New class modal form in timetable
  const [newSubName, setNewSubName] = useState(subjectsList[0]?.name || "");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newType, setNewType] = useState("Lecture");

  const handleAddClassToTimetable = (e) => {
    e.preventDefault();
    if (!newSubName) return;

    const matchedSub = subjectsList.find((s) => s.name === newSubName);
    const item = {
      start: newStartTime,
      end: newEndTime,
      subject: newSubName,
      code: matchedSub?.code || "",
      type: newType,
    };

    const currentDayList = [...(timetable[selectedDay] || []), item];
    currentDayList.sort((a, b) => a.start.localeCompare(b.start));

    setTimetable({
      ...timetable,
      [selectedDay]: currentDayList,
    });
  };

  const handleDeleteClassFromTimetable = (dayIdx, classIdx) => {
    const dayList = (timetable[dayIdx] || []).filter((_, i) => i !== classIdx);
    setTimetable({ ...timetable, [dayIdx]: dayList });
  };

  // Step 4: AI Semester Schedule Projection
  const projection = useMemo(() => {
    return generateSemesterScheduleFromTimetable({
      startDate,
      endDate,
      weekends: GALGOTIAS_SEM6_PRESET.weekends,
      holidays: GALGOTIAS_SEM6_PRESET.calendar.holidays,
      examinations: GALGOTIAS_SEM6_PRESET.calendar.examinations,
      nonInstructionalDays: [],
      weeklyTimetable: timetable,
    });
  }, [startDate, endDate, timetable]);

  // Final confirmation
  const handleLaunchSemesterVI = () => {
    // 1. Create the new semester
    const newSem = saveSemester({
      name: semName.trim(),
      academicYear,
      startDate,
      endDate,
      eligibilityThreshold: 75,
      criticalThreshold: 65,
      weekends: GALGOTIAS_SEM6_PRESET.weekends,
      isActive: true,
      isArchived: false,
    });

    // 2. Save Subjects
    for (const sub of subjectsList) {
      storageService.saveSubject({
        semesterId: newSem.id,
        name: sub.name,
        code: sub.code,
        credits: sub.credits,
        color: "#2563eb",
        components: {
          [sub.type || "Lecture"]: { attended: 0, conducted: 0 },
        },
      });
    }

    // 3. Save Calendar
    storageService.saveCalendar(newSem.id, {
      ...GALGOTIAS_SEM6_PRESET.calendar,
      semester: semName.trim(),
      startDate,
      endDate,
    });

    // 4. Save Timetable
    storageService.saveTimetable(newSem.id, timetable, {
      applyFromDate: startDate,
      note: "Semester VI Initial Schedule",
    });

    setActiveSemesterId(newSem.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Galgotias University — Semester VI Setup Wizard" maxWidth="680px">
      <div className="sem6-wizard-container">
        {/* WIZARD STEPS PROGRESS */}
        <div className="wizard-progress-bar">
          <div className={`wizard-step-node ${step >= 1 ? "active" : ""}`}>1. Semester Dates</div>
          <div className="wizard-step-line" />
          <div className={`wizard-step-node ${step >= 2 ? "active" : ""}`}>2. Courses</div>
          <div className="wizard-step-line" />
          <div className={`wizard-step-node ${step >= 3 ? "active" : ""}`}>3. 1-Week Timetable</div>
          <div className="wizard-step-line" />
          <div className={`wizard-step-node ${step >= 4 ? "active" : ""}`}>4. AI Schedule Projection</div>
        </div>

        {/* STEP 1: SEMESTER INFO & CALENDAR */}
        {step === 1 && (
          <div className="wizard-step-content">
            <h3 className="wizard-heading">Configure Galgotias Semester VI Calendar</h3>
            <p className="wizard-desc">
              Pre-loaded with official Galgotias University Spring Session dates, exam timeframes, and gazetted holidays.
            </p>

            <div className="form-group">
              <label className="form-label">Semester Title</label>
              <input
                type="text"
                className="form-input"
                value={semName}
                onChange={(e) => setSemName(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Start Date (Classes Begin)</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date (End of Term)</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="preset-events-preview">
              <span className="preview-label">Pre-loaded Galgotias Academic Events:</span>
              <ul className="preview-events-list">
                <li>🏛️ Republic Day (Jan 26)</li>
                <li>🏛️ Maha Shivratri & Holi Festival Break (March 22–23)</li>
                <li>📝 Mid-Term Examinations (MTE) (March 15–20)</li>
                <li>📝 Internal Assessment 2 (IA2) (April 19–23)</li>
                <li>📝 Practical & Theory End-Term Examinations (May 10–28)</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: COURSES */}
        {step === 2 && (
          <div className="wizard-step-content">
            <h3 className="wizard-heading">Semester VI Enrolled Courses</h3>
            <p className="wizard-desc">
              Pre-filled with standard 6th Semester Computer Science / AIML courses. Edit or add courses as needed.
            </p>

            <div className="wizard-subjects-list">
              {subjectsList.map((sub, idx) => (
                <div key={idx} className="wizard-subject-row">
                  <div className="sub-name-block">
                    <strong>{sub.name}</strong>
                    <span className="sub-code">{sub.code} • {sub.credits} Credits • {sub.type}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-trash-icon"
                    onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== idx))}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<IconPlus size={14} />}
              onClick={() => {
                const name = prompt("Enter Subject Name:");
                const code = prompt("Enter Course Code (e.g. CS605):");
                if (name) {
                  setSubjectsList([...subjectsList, { name, code: code || "", credits: 3, type: "Lecture" }]);
                }
              }}
            >
              Add Another Course
            </Button>
          </div>
        )}

        {/* STEP 3: 1-WEEK TIMETABLE */}
        {step === 3 && (
          <div className="wizard-step-content">
            <h3 className="wizard-heading">Input 1-Week Weekly Timetable</h3>
            <p className="wizard-desc">
              Enter your standard weekly timetable for Monday to Saturday. The AI will repeat this schedule across the full semester calendar!
            </p>

            <div className="wizard-days-nav">
              {WEEKDAYS.map((d) => {
                const count = (timetable[d.index] || []).length;
                return (
                  <button
                    key={d.index}
                    type="button"
                    className={`wizard-day-btn ${selectedDay === d.index ? "active" : ""}`}
                    onClick={() => setSelectedDay(d.index)}
                  >
                    <span>{d.name}</span>
                    <span className="day-count-tag">{count} classes</span>
                  </button>
                );
              })}
            </div>

            <div className="wizard-day-classes-box">
              <h4 className="box-title">{WEEKDAYS.find((d) => d.index === selectedDay)?.name} Classes</h4>

              {(timetable[selectedDay] || []).length === 0 ? (
                <p className="text-muted text-sm mb-2">No classes scheduled for this day yet.</p>
              ) : (
                <div className="day-classes-list-sm">
                  {(timetable[selectedDay] || []).map((cls, cIdx) => (
                    <div key={cIdx} className="day-class-item-sm">
                      <span className="class-time-tag">{cls.start} – {cls.end}</span>
                      <strong className="class-sub-tag">{cls.subject} ({cls.type})</strong>
                      <button
                        type="button"
                        className="btn-trash-icon"
                        onClick={() => handleDeleteClassFromTimetable(selectedDay, cIdx)}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add Class Form */}
              <form onSubmit={handleAddClassToTimetable} className="quick-add-class-form">
                <select
                  className="form-input"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                >
                  {subjectsList.map((s, i) => (
                    <option key={i} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>

                <div className="time-inputs-row">
                  <input
                    type="time"
                    className="form-input"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                  <input
                    type="time"
                    className="form-input"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                  <select
                    className="form-input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="PP">PP</option>
                    <option value="PR">PR</option>
                  </select>
                  <Button variant="primary" size="sm" type="submit">
                    Add
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 4: AI SEMESTER SCHEDULE PROJECTION */}
        {step === 4 && (
          <div className="wizard-step-content">
            <div className="ai-projection-header">
              <IconSparkles size={24} className="text-purple" />
              <div>
                <h3 className="wizard-heading">AI Full-Semester Projection Ready!</h3>
                <p className="wizard-desc">
                  Your 1-week timetable has been repeated across the entire semester ({startDate} to {endDate}), automatically skipping holidays and exams.
                </p>
              </div>
            </div>

            <div className="projection-stats-grid">
              <div className="proj-card">
                <span className="proj-label">Total Semester Days</span>
                <strong className="proj-num">{projection.totalDays} days</strong>
              </div>
              <div className="proj-card">
                <span className="proj-label">Instructional Class Days</span>
                <strong className="proj-num">{projection.instructionalDays} days</strong>
              </div>
              <div className="proj-card">
                <span className="proj-label">Total Conducted Periods</span>
                <strong className="proj-num text-primary">{projection.totalClasses} classes</strong>
              </div>
            </div>

            <div className="course-forecast-preview">
              <h4>Projected Classes Per Course:</h4>
              <div className="course-counts-grid">
                {Object.entries(projection.subjectBreakdown).map(([code, count]) => (
                  <div key={code} className="course-count-pill">
                    <strong>{code}:</strong> {count} classes
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WIZARD ACTIONS ROW */}
        <div className="wizard-footer-actions modal-actions-row">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              ← Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 4 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              Continue to Step {step + 1} →
            </Button>
          ) : (
            <Button variant="primary" icon={<IconCheck size={16} />} onClick={handleLaunchSemesterVI}>
              Launch Semester VI & Start Tracking
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
