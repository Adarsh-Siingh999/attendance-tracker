import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { IconCheck, IconCalendar } from "./Icons.jsx";
import { formatDate } from "../../utils/academicCalendarUtils.js";

export function MidSemesterSetupModal({ isOpen, onClose }) {
  const { subjects, saveSubject, activeSemester, baselineDate, setBaselineDate } = useApp();

  const [cutoffDate, setCutoffDate] = useState(baselineDate || formatDate(new Date()));
  const [counts, setCounts] = useState(() => {
    const initial = {};
    subjects.forEach((s) => {
      // If subject has components, keep component level map, otherwise default
      const compMap = {};
      if (s.components && Object.keys(s.components).length > 0) {
        for (const [cName, cVal] of Object.entries(s.components)) {
          compMap[cName] = {
            attended: cVal.attended || 0,
            conducted: cVal.conducted || 0,
          };
        }
      } else {
        compMap["Lecture"] = {
          attended: s.attended || 0,
          conducted: s.conducted || 0,
        };
      }
      initial[s.id] = compMap;
    });
    return initial;
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleComponentCountChange = (subId, compName, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [compName]: {
          ...prev[subId]?.[compName],
          [field]: num,
        },
      },
    }));
  };

  const handleAddComponent = (subId, compType) => {
    setCounts((prev) => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [compType]: { attended: 0, conducted: 0 },
      },
    }));
  };

  const handleSaveBaseline = (e) => {
    e.preventDefault();

    // 1. Update each subject with its component balances (PP, PR, Lecture, etc.)
    subjects.forEach((sub) => {
      const subCompCounts = counts[sub.id] || {};
      const updatedComponents = {};

      for (const [compName, cVal] of Object.entries(subCompCounts)) {
        const attended = Math.min(cVal.attended || 0, cVal.conducted || 0);
        const conducted = cVal.conducted || 0;
        updatedComponents[compName] = { attended, conducted };
      }

      saveSubject({
        ...sub,
        components: updatedComponents,
      });
    });

    // 2. Set the semester baseline cutoff date to lock marking on or before this date
    if (setBaselineDate) {
      setBaselineDate(cutoffDate);
    }

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
                  <th>Course & Component (PP / PR)</th>
                  <th style={{ width: "120px" }}>Attended</th>
                  <th style={{ width: "120px" }}>Conducted</th>
                  <th style={{ width: "90px" }}>Current %</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub) => {
                  const compEntries = Object.entries(counts[sub.id] || { Lecture: { attended: 0, conducted: 0 } });
                  return compEntries.map(([compName, compVal]) => {
                    const attended = compVal?.attended || 0;
                    const conducted = compVal?.conducted || 0;
                    const pct = conducted > 0 ? (attended / conducted) * 100 : 0;
                    const isSafe = pct >= (activeSemester?.eligibilityThreshold || 75);

                    return (
                      <tr key={`${sub.id}-${compName}`}>
                        <td>
                          <div className="sub-table-cell">
                            <strong>{sub.name}</strong>
                            <div className="sub-comp-tag-row">
                              <span className="comp-type-pill">{compName}</span>
                              {sub.code && <span className="sub-code-sub">{sub.code}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input text-center"
                            value={attended}
                            onChange={(e) => handleComponentCountChange(sub.id, compName, "attended", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="form-input text-center"
                            value={conducted}
                            onChange={(e) => handleComponentCountChange(sub.id, compName, "conducted", e.target.value)}
                          />
                        </td>
                        <td className="text-center font-bold">
                          <span className={isSafe ? "text-success" : "text-danger"}>
                            {conducted > 0 ? `${pct.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  });
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
