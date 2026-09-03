import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { Badge } from "./Badge.jsx";
import { IconPlus, IconCheck, IconCalendar } from "./Icons.jsx";
import { formatDate } from "../../utils/academicCalendarUtils.js";

export function TimetableVersionsModal({ isOpen, onClose }) {
  const { timetableVersions, timetable, saveTimetable } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(formatDate(new Date()));
  const [versionNote, setVersionNote] = useState("Mid-Semester Timetable Update");

  const handleCreateNewVersion = (e) => {
    e.preventDefault();

    // Archives the existing schedule for dates prior to effectiveFrom
    // and installs the current schedule with effectiveFrom as the new active version.
    saveTimetable(timetable, {
      applyFromDate: effectiveFrom,
      note: versionNote.trim(),
    });

    setIsCreating(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Timetable Schedule Versions & Mid-Semester Changes"
      maxWidth="640px"
    >
      <div className="versions-modal-content">
        <div className="version-info-banner">
          <IconCalendar size={22} className="text-primary" />
          <div>
            <h4>How Schedule Versioning Protects Calculations</h4>
            <p>
              When your university changes the weekly timetable mid-semester (e.g. after the first 2 months), creating a new version preserves your historical classes for past dates while applying the new schedule only from the chosen effective date onward.
            </p>
          </div>
        </div>

        {/* VERSIONS TIMELINE LIST */}
        <div className="versions-list-timeline">
          <h4 className="timeline-title">Active & Historical Schedules</h4>

          {timetableVersions.length === 0 ? (
            <div className="single-version-card">
              <div className="version-card-header">
                <strong>Schedule Version 1 (Active)</strong>
                <Badge variant="success">Current Default</Badge>
              </div>
              <p className="version-meta">
                Effective for the entire semester. If your timetable changed mid-semester, click below to add a revision date.
              </p>
            </div>
          ) : (
            timetableVersions.map((v, idx) => {
              const isCurrent = !v.effectiveTo;
              return (
                <div key={v.id || idx} className={`version-timeline-card ${isCurrent ? "current-version" : ""}`}>
                  <div className="version-card-header">
                    <div>
                      <strong className="version-name">{v.note || `Schedule Version ${idx + 1}`}</strong>
                      <span className="version-dates">
                        {v.effectiveFrom} {v.effectiveTo ? `to ${v.effectiveTo}` : "onward (Active)"}
                      </span>
                    </div>
                    {isCurrent ? (
                      <Badge variant="success">Active Now</Badge>
                    ) : (
                      <Badge variant="neutral">Historical</Badge>
                    )}
                  </div>
                  <p className="version-desc-sm">
                    {isCurrent
                      ? "All future projections and today's schedule use this timetable."
                      : "Past dates within this range strictly look up this historical timetable."}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* CREATE NEW SCHEDULE VERSION FORM */}
        {isCreating ? (
          <form onSubmit={handleCreateNewVersion} className="create-version-form">
            <h4 className="form-subheading">Apply New Schedule from a Specific Date</h4>

            <div className="form-group">
              <label className="form-label">Effective From Date (Start of New Timetable)</label>
              <input
                type="date"
                className="form-input"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
              <span className="form-help-text">
                Dates before this will retain the previous schedule. Dates on or after this will use the updated routine.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Version Note / Reason</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Month 3 Routine Change (Swapped Labs)"
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                required
              />
            </div>

            <div className="modal-actions-row">
              <Button variant="secondary" size="sm" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<IconCheck size={14} />}>
                Save Version & Apply
              </Button>
            </div>
          </form>
        ) : (
          <div className="versions-modal-footer">
            <Button
              variant="outline"
              size="md"
              icon={<IconPlus size={16} />}
              onClick={() => setIsCreating(true)}
            >
              Add Mid-Semester Schedule Revision
            </Button>
            <Button variant="secondary" size="md" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
