import { useState } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import {
  IconDashboard,
  IconSubjects,
  IconTimetable,
  IconCalendar,
  IconSkip,
  IconCheck,
} from "./Icons.jsx";

const GUIDE_STEPS = [
  {
    title: "Galgotias University Attendance Policy",
    icon: <IconDashboard size={28} className="text-primary" />,
    badge: "Rule 1",
    content: (
      <div>
        <p className="guide-lead">
          Galgotias University mandates strict attendance criteria for students across all undergraduate programs:
        </p>
        <ul className="guide-points-list">
          <li>
            <strong>75% Minimum Target (Eligibility Line):</strong> You must maintain at least 75% overall and course-wise attendance to be eligible to sit for End-Term Examinations (ETE).
          </li>
          <li>
            <strong>65% Critical Boundary (Debar Warning):</strong> If attendance drops below 65%, you are placed on the formal debarment warning list and risk having your admit card withheld.
          </li>
          <li>
            <strong>Automated Status Colors:</strong> The dashboard automatically flags your standing: 🟢 <strong>Eligible</strong> (&ge; 75%), 🟡 <strong>Precaution</strong> (65% - 74.9%), and 🔴 <strong>Critical Shortage</strong> (&lt; 65%).
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Subjects & Component Weights",
    icon: <IconSubjects size={28} className="text-primary" />,
    badge: "Rule 2",
    content: (
      <div>
        <p className="guide-lead">
          Galgotias curriculum combines theory lectures with hands-on labs and programming sessions:
        </p>
        <ul className="guide-points-list">
          <li>
            <strong>Component Breakdown:</strong> Tracks <strong>Lecture</strong>, <strong>Lab</strong>, <strong>Tutorial</strong>, and Galgotias-specific components like <strong>PP</strong> (Programming/Practical) and <strong>PR</strong> (Practical).
          </li>
          <li>
            <strong>Aggregated Attendance:</strong> Your total attendance is automatically calculated from all components combined (Total Attended / Total Conducted).
          </li>
          <li>
            <strong>Historical Seed Records:</strong> Your baseline historical attended and conducted counts are safely preserved.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "1-Week Timetable → Full Semester AI Mapping",
    icon: <IconTimetable size={28} className="text-primary" />,
    badge: "Rule 3",
    content: (
      <div>
        <p className="guide-lead">
          You only need to enter your <strong>1-week weekly timetable</strong> (Monday to Saturday) once!
        </p>
        <ul className="guide-points-list">
          <li>
            <strong>Automatic Calendar Mapping:</strong> The AI engine projects your 1-week timetable across all 18 instructional weeks of the academic semester.
          </li>
          <li>
            <strong>Smart Holiday & Exam Exclusion:</strong> The engine automatically skips official Galgotias university holidays, weekend non-instructional days, and exam study leaves.
          </li>
          <li>
            <strong>Accurate Conducted Totals:</strong> Gives you the exact total conducted classes remaining for each course till the end of the term.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Editing Timetable Without Affecting Past Attendance",
    icon: <IconCalendar size={28} className="text-primary" />,
    badge: "Rule 4",
    content: (
      <div>
        <p className="guide-lead">
          Timetables change during the semester. With AttendanceFlow, editing your schedule never ruins your past attendance history!
        </p>
        <ul className="guide-points-list">
          <li>
            <strong>Class Snapshotting:</strong> Every time you mark a class as Present or Absent, a permanent snapshot of the subject, code, and class type is saved.
          </li>
          <li>
            <strong>Timetable Versioning:</strong> When updating your timetable, choose <em>"Apply from today onward"</em>. The system preserves your previous schedule for all past dates!
          </li>
          <li>
            <strong>Zero History Tampering:</strong> Past logged classes, percentages, and attendance streaks remain 100% immutable and accurate.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: '"Can I Skip?" Absence Consequence Engine',
    icon: <IconSkip size={28} className="text-primary" />,
    badge: "Rule 5",
    content: (
      <div>
        <p className="guide-lead">
          Thinking of missing class tomorrow or taking a day off? Don't guess — run the simulator!
        </p>
        <ul className="guide-points-list">
          <li>
            <strong>Before vs After Math:</strong> See exactly how much your attendance drops in each course before you skip.
          </li>
          <li>
            <strong>Immediate Verdict:</strong> 🟢 <strong>Safe to Skip</strong> if all courses remain above 75%, 🟡 <strong>Caution</strong> if any course falls below 75%, and 🔴 <strong>Do NOT Skip</strong> if it risks debarment.
          </li>
          <li>
            <strong>Interactive Period Selection:</strong> Toggle individual lectures to test partial day vs full day absences.
          </li>
        </ul>
      </div>
    ),
  },
];

export function UserGuideModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = GUIDE_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Galgotias Student Attendance Guide" maxWidth="600px">
      <div className="user-guide-container">
        {/* PROGRESS STEPPER */}
        <div className="guide-stepper-dots">
          {GUIDE_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`step-dot ${idx === currentStep ? "active" : idx < currentStep ? "completed" : ""}`}
              onClick={() => setCurrentStep(idx)}
              aria-label={`Step ${idx + 1}`}
            />
          ))}
        </div>

        <div className="guide-step-header">
          <div className="step-icon-box">{step.icon}</div>
          <div>
            <span className="step-badge">{step.badge} • Step {currentStep + 1} of {GUIDE_STEPS.length}</span>
            <h3 className="step-title">{step.title}</h3>
          </div>
        </div>

        <div className="guide-step-body">{step.content}</div>

        <div className="guide-footer-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ← Previous
          </Button>

          <div className="guide-right-actions">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Skip Guide
            </Button>
            <Button variant="primary" size="sm" onClick={handleNext}>
              {currentStep === GUIDE_STEPS.length - 1 ? (
                <>
                  <IconCheck size={14} /> Got It, Start Tracking!
                </>
              ) : (
                "Next →"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
