import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { IconCheck, IconCalendar } from "./Icons.jsx";
import { formatDate } from "../../utils/academicCalendarUtils.js";

export function MidSemesterSetupModal({ isOpen, onClose }) {
  const { subjects, saveSubject, activeSemester } = useApp();

  const [cutoffDate, setCutoffDate] = useState(formatDate(new Date()));
  const [counts, setCounts] = useState(() => {
    const initial = {};
    subjects.forEach((s) => {
      initial[s.id] = {
        attended: s.attended || 0,
        conducted: s.conducted || 0,
      };
    });
    return initial;
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleCountChange = (subId, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: num,
      },
    }));
  };

  const handleSaveBaseline = (e) => {
    e.preventDefault();

    subjects.forEach((sub) => {
      const subCounts = counts[sub.id] || { attended: 0, conducted: 0 };
      const attended = Math.min(subCounts.attended, subCounts.conducted);
      const conducted = subCounts.conducted;

      // Update baseline on the primary lecture or first component
      const componentKey = Object.keys(sub.components || {})[0] || "Lecture";

      saveSubject({
        ...sub,
        components: {
          ...sub.components,
          [componentKey]: {
            attended,
            conducted,
          },
        },
      });
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Joined Mid-Semester? Set Opening Attendance"
      maxWidth="620px"
    >
      <div className="mid-sem-modal-content">
        <div className="mid-sem-banner">
          <div className="banner-icon-box">
            <IconCalendar size={24} className="text-primary" />
          </div>
          <div>
            <h4>Fast-Track Opening Attendance Balance</h4>
            <p>
              If you began using AttendanceFlow in the middle of your semester (e.g. Month 3), you don't need to manually mark 60 past days. Simply enter your existing attended and conducted counts from your university ERP portal as of your cut-off date!
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBaseline}>
          <div className="form-group mb-3">
            <label className="form-label">
              Opening Balance Cut-off Date (Date of University ERP Report)
            </label>
            <input
              type="date"
              className="form-input"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              required
            />
            <span className="form-help-text">
              Active tracking will add daily classes marked on or after this date.
            </span>
          </div>

          <div className="opening-counts-table-box">
            <table className="opening-counts-table">
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th style={{ width: "120px" }}>Attended</th>
                  <th style={{ width: "120px" }}>Conducted</th>
                  <th style={{ width: "90px" }}>Current %</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => {
                  const current = counts[sub.id] || { attended: 0, conducted: 0 };
                  const pct = current.conducted > 0 ? (current.attended / current.conducted) * 100 : 0;
                  const isSafe = pct >= (activeSemester?.eligibilityThreshold || 75);

                  return (
                    <tr key={sub.id}>
                      <td>
                        <strong>{sub.name}</strong>
                        {sub.code && <span className="sub-code-sub">{sub.code}</span>}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-input text-center"
                          value={current.attended}
                          onChange={(e) => handleCountChange(sub.id, "attended", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-input text-center"
                          value={current.conducted}
                          onChange={(e) => handleCountChange(sub.id, "conducted", e.target.value)}
                        />
                      </td>
                      <td className="text-center font-bold">
                        <span className={isSafe ? "text-success" : "text-danger"}>
                          {current.conducted > 0 ? `${pct.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="modal-actions-row mt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" icon={<IconCheck size={16} />}>
              {isSaved ? "Saved Baseline!" : "Apply Opening Attendance"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
