import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { IconPlus, IconTrash, IconTimetable } from "../components/common/Icons.jsx";
import { formatDate } from "../utils/academicCalendarUtils.js";
import { TimetableVersionsModal } from "../components/common/TimetableVersionsModal.jsx";
import { MidSemesterSetupModal } from "../components/common/MidSemesterSetupModal.jsx";

const DAYS = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
  { index: 0, name: "Sunday" },
];

export function TimetablePage() {
  const { timetable, timetableVersions, saveTimetable, subjects, calendar } = useApp();
  const [selectedDay, setSelectedDay] = useState(2); // Tuesday default
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassIndex, setEditingClassIndex] = useState(null);

  // Modals for mid-semester timetable versions and baseline setup
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isMidSemModalOpen, setIsMidSemModalOpen] = useState(false);

  // Timetable Versioning toggle (protects past attendance history!)
  const [protectPastHistory, setProtectPastHistory] = useState(true);

  // Form State
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [classType, setClassType] = useState("Lecture");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");

  const currentDayClasses = (timetable && timetable[selectedDay]) || [];

  const openAddModal = () => {
    setEditingClassIndex(null);
    if (subjects.length > 0) {
      setSubjectName(subjects[0].name);
      setSubjectCode(subjects[0].code || "");
    } else {
      setSubjectName("");
      setSubjectCode("");
    }
    setClassType("Lecture");
    setStartTime("09:00");
    setEndTime("10:00");
    setRoom("");
    setIsModalOpen(true);
  };

  const openEditModal = (cls, index) => {
    setEditingClassIndex(index);
    setSubjectName(cls.subject || "");
    setSubjectCode(cls.code || "");
    setClassType(cls.type || "Lecture");
    setStartTime(cls.start || "09:00");
    setEndTime(cls.end || "10:00");
    setRoom(cls.room || "");
    setIsModalOpen(true);
  };

  const handleSelectSubject = (e) => {
    const chosenName = e.target.value;
    setSubjectName(chosenName);
    const found = subjects.find((s) => s.name === chosenName);
    if (found) {
      setSubjectCode(found.code || "");
    }
  };

  const handleSaveClass = (e) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    const newClass = {
      start: startTime,
      end: endTime,
      subject: subjectName.trim(),
      code: subjectCode.trim(),
      type: classType,
      room: room.trim(),
    };

    const updatedDayClasses = [...currentDayClasses];
    if (editingClassIndex !== null) {
      updatedDayClasses[editingClassIndex] = newClass;
    } else {
      updatedDayClasses.push(newClass);
    }

    // Sort classes chronologically by start time
    updatedDayClasses.sort((a, b) => a.start.localeCompare(b.start));

    const updatedTimetable = {
      ...timetable,
      [selectedDay]: updatedDayClasses,
    };

    if (protectPastHistory) {
      const todayStr = formatDate(new Date());
      saveTimetable(updatedTimetable, {
        applyFromDate: todayStr,
        note: `Modified ${newClass.subject} on ${DAYS.find((d) => d.index === selectedDay)?.name}`,
      });
    } else {
      saveTimetable(updatedTimetable);
    }

    setIsModalOpen(false);
  };

  const handleDeleteClass = (index) => {
    if (!window.confirm("Are you sure you want to remove this class period?")) return;

    const updatedDayClasses = currentDayClasses.filter((_, i) => i !== index);
    const updatedTimetable = {
      ...timetable,
      [selectedDay]: updatedDayClasses,
    };

    if (protectPastHistory) {
      const todayStr = formatDate(new Date());
      saveTimetable(updatedTimetable, {
        applyFromDate: todayStr,
        note: `Removed period from ${DAYS.find((d) => d.index === selectedDay)?.name}`,
      });
    } else {
      saveTimetable(updatedTimetable);
    }
  };

  const isWeekendDay = calendar?.weekends?.includes(selectedDay);

  return (
    <div className="page-container timetable-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Weekly Timetable Schedule</h2>
          <p className="section-desc">
            Your 1-week timetable repeats across the entire semester calendar, driving daily attendance and projections.
          </p>
        </div>
        <div className="header-action-btns">
          <Button variant="outline" size="sm" onClick={() => setIsVersionsModalOpen(true)}>
            Schedule Versions ({timetableVersions.length > 0 ? timetableVersions.length : 1})
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsMidSemModalOpen(true)}>
            Joined Mid-Semester?
          </Button>
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openAddModal}>
            Add Class
          </Button>
        </div>
      </div>

      {/* TIMETABLE IMMUTABILITY & VERSIONING BANNER */}
      <div className="timetable-versioning-card">
        <div className="versioning-left">
          <span className="versioning-badge">🛡️ IMMUTABLE HISTORY PROTECTION</span>
          <h4>Edit Without Affecting Past Attendance</h4>
          <p>
            When enabled, changes to the weekly schedule only apply from today onward. Past marked classes keep their original recorded subjects and percentages.
          </p>
        </div>
        <div className="versioning-right">
          <label className="checkbox-pill active-pill">
            <input
              type="checkbox"
              checked={protectPastHistory}
              onChange={(e) => setProtectPastHistory(e.target.checked)}
            />
            <span>Protect Past Attendance (Version from Today)</span>
          </label>
          {timetableVersions.length > 0 && (
            <span className="versions-count-tag">
              {timetableVersions.length} schedule version(s) recorded
            </span>
          )}
        </div>
      </div>

      {/* DAY SELECTOR PILLS */}
      <div className="timetable-day-selector">
        {DAYS.map((d) => {
          const count = (timetable && timetable[d.index]?.length) || 0;
          const isSelected = selectedDay === d.index;
          const isWeekend = calendar?.weekends?.includes(d.index);

          return (
            <button
              key={d.index}
              type="button"
              className={`day-pill-btn ${isSelected ? "selected" : ""} ${isWeekend ? "weekend-pill" : ""}`}
              onClick={() => setSelectedDay(d.index)}
            >
              <span className="day-name">{d.name}</span>
              <span className="day-count-badge">
                {count} {count === 1 ? "class" : "classes"}
              </span>
            </button>
          );
        })}
      </div>

      {/* CURRENT DAY SCHEDULE */}
      <div className="timetable-day-content">
        <div className="day-header-row">
          <div className="day-title-box">
            <h3>{DAYS.find((d) => d.index === selectedDay)?.name} Schedule</h3>
            {isWeekendDay && <span className="weekend-alert-tag">Marked as Weekend in Calendar</span>}
          </div>
          <span className="classes-total-hint">{currentDayClasses.length} class(es) scheduled</span>
        </div>

        {currentDayClasses.length === 0 ? (
          <EmptyState
            icon={<IconTimetable size={42} />}
            title="No classes scheduled for this day"
            description="Add your scheduled lectures or lab periods for this day."
            actionText="Add Class"
            onAction={openAddModal}
          />
        ) : (
          <div className="timetable-classes-list">
            {currentDayClasses.map((cls, idx) => (
              <div key={idx} className="timetable-class-card">
                <div className="class-time-col">
                  <strong className="class-start">{cls.start}</strong>
                  <span className="class-end">{cls.end}</span>
                </div>

                <div className="class-info-col">
                  <div className="class-title-row">
                    <h4 className="class-subj-title">{cls.subject}</h4>
                    <Badge variant="primary" size="sm" className="class-type-badge">{cls.type}</Badge>
                  </div>
                  <div className="class-meta-row">
                    {cls.code && <span className="meta-text">{cls.code}</span>}
                    {cls.room && <span className="meta-text">• Room: {cls.room}</span>}
                  </div>
                </div>

                <div className="class-actions-col">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(cls, idx)}>
                    Edit
                  </Button>
                  <button
                    type="button"
                    className="btn-trash-icon"
                    onClick={() => handleDeleteClass(idx)}
                    aria-label="Delete class"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT CLASS MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClassIndex !== null ? "Edit Class Period" : "Add Class Period"}
        maxWidth="500px"
      >
        <form onSubmit={handleSaveClass} className="modal-form">
          <div className="form-group">
            <label className="form-label">
              Subject <span className="required-star">*</span>
            </label>
            {subjects.length > 0 ? (
              <select
                className="form-input"
                value={subjectName}
                onChange={handleSelectSubject}
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Machine Learning"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Class Type</label>
              <select
                className="form-input"
                value={classType}
                onChange={(e) => setClassType(e.target.value)}
              >
                <option value="Lecture">Lecture</option>
                <option value="Lab">Lab</option>
                <option value="Practical">Practical</option>
                <option value="PP">PP (Programming/Practical)</option>
                <option value="PR">PR (Practical)</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Seminar">Seminar</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Room / Venue <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Lab 4 / Room 402"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">
                Start Time <span className="required-star">*</span>
              </label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                End Time <span className="required-star">*</span>
              </label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingClassIndex !== null ? "Save Class" : "Add to Timetable"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SCHEDULE VERSIONS MODAL */}
      <TimetableVersionsModal
        isOpen={isVersionsModalOpen}
        onClose={() => setIsVersionsModalOpen(false)}
      />

      {/* MID-SEMESTER BASELINE OPENING SETUP MODAL */}
      <MidSemesterSetupModal
        isOpen={isMidSemModalOpen}
        onClose={() => setIsMidSemModalOpen(false)}
      />
    </div>
  );
}
