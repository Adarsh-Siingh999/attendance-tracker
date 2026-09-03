import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { Badge } from "../components/common/Badge.jsx";
import { Modal } from "../components/common/Modal.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { IconPlus, IconTrash, IconSubjects } from "../components/common/Icons.jsx";
import { getSubjectStatus } from "../utils/attendanceCalculations.js";
import { MidSemesterSetupModal } from "../components/common/MidSemesterSetupModal.jsx";

export function SubjectsPage() {
  const { subjects, subjectForecasts, saveSubject, deleteSubject, threshold, criticalThreshold } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMidSemModalOpen, setIsMidSemModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(3);
  const [color, setColor] = useState("#2563eb");
  const [components, setComponents] = useState([
    { type: "Lecture", attended: 0, conducted: 0 },
  ]);

  const openAddModal = () => {
    setEditingSubject(null);
    setName("");
    setCode("");
    setCredits(3);
    setColor("#2563eb");
    setComponents([{ type: "Lecture", attended: 0, conducted: 0 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (sub) => {
    setEditingSubject(sub);
    setName(sub.name || "");
    setCode(sub.code || "");
    setCredits(sub.credits || 0);
    setColor(sub.color || "#2563eb");

    const compList = [];
    if (sub.components && Object.keys(sub.components).length > 0) {
      for (const [key, val] of Object.entries(sub.components)) {
        compList.push({ type: key, attended: val.attended || 0, conducted: val.conducted || 0 });
      }
    } else {
      compList.push({ type: "Lecture", attended: sub.attended || 0, conducted: sub.conducted || 0 });
    }
    setComponents(compList);
    setIsModalOpen(true);
  };

  const handleAddComponent = () => {
    setComponents([...components, { type: "Lab", attended: 0, conducted: 0 }]);
  };

  const handleRemoveComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index, field, value) => {
    const updated = [...components];
    updated[index][field] = value;
    setComponents(updated);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const compObj = {};
    for (const c of components) {
      if (c.type.trim()) {
        compObj[c.type.trim()] = {
          attended: Math.max(0, Number(c.attended) || 0),
          conducted: Math.max(0, Number(c.conducted) || 0),
        };
      }
    }

    saveSubject({
      id: editingSubject?.id,
      name: name.trim(),
      code: code.trim(),
      credits: Number(credits) || 0,
      color,
      components: compObj,
    });

    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this subject? All historical records associated with it will be removed.")) {
      deleteSubject(id);
    }
  };

  return (
    <div className="page-container subjects-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">Subject Directory</h2>
          <p className="section-desc">Manage your courses, course codes, and component attendance weights.</p>
        </div>
        <div className="header-action-btns">
          {subjects.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setIsMidSemModalOpen(true)}>
              Joined Mid-Semester? Set Opening Counts
            </Button>
          )}
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openAddModal}>
            Add Subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={<IconSubjects size={42} />}
          title="No subjects added yet"
          description="Start tracking your attendance by adding your courses and practical labs."
          actionText="Add First Subject"
          onAction={openAddModal}
        />
      ) : (
        <div className="subjects-cards-grid">
          {subjects.map((sub) => {
            const status = getSubjectStatus(sub.percentage, threshold, criticalThreshold);
            const forecast = subjectForecasts?.find((f) => f.id === sub.id) || {};
            return (
              <div key={sub.id} className="subject-detail-card">
                <div className="card-top-bar" style={{ borderTop: `4px solid ${sub.color || "#2563eb"}` }}>
                  <div className="subj-title-group">
                    <h3 className="subj-name">{sub.name}</h3>
                    <div className="subj-meta-pills">
                      {sub.code && <span className="meta-pill">{sub.code}</span>}
                      {sub.credits > 0 && <span className="meta-pill">{sub.credits} Credits</span>}
                    </div>
                  </div>
                  <Badge
                    variant={
                      status === "Eligible" ? "success" : status === "Precaution" ? "warning" : "danger"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div className="subj-stat-row">
                  <div>
                    <span className="stat-label">Current Attendance</span>
                    <strong className="stat-number">
                      {sub.percentage !== null ? `${sub.percentage.toFixed(2)}%` : "—"}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="stat-label">Classes Attended</span>
                    <strong className="stat-fraction">
                      {sub.attended} / {sub.conducted}
                    </strong>
                  </div>
                </div>

                <div className="metric-bar-bg">
                  <div
                    className={`metric-bar-fill ${
                      sub.percentage >= threshold ? "fill-success" : "fill-danger"
                    }`}
                    style={{ width: `${Math.min(sub.percentage || 0, 100)}%` }}
                  />
                </div>

                {/* SEMESTER PROJECTION & TOTAL CLASSES BANNER */}
                <div className="subj-semester-projection-strip">
                  <div className="strip-item">
                    <span className="strip-lbl">Total Semester Classes:</span>
                    <strong className="strip-val">
                      {forecast.totalClasses ?? sub.conducted} classes
                    </strong>
                    <span className="strip-sub">({sub.conducted} conducted + {forecast.futureClasses ?? 0} upcoming in timetable)</span>
                  </div>
                  <div className="strip-item">
                    <span className="strip-lbl">Semester Absence Budget:</span>
                    <strong className="strip-val">
                      {forecast.maxTotalSemesterAbsences75 ?? 0} max allowed
                    </strong>
                    <span className="strip-sub">({forecast.missedSoFar ?? (sub.conducted - sub.attended)} used • {forecast.remainingSafeSkips75 ?? forecast.maximumAllowedAbsences ?? 0} safe skips left)</span>
                  </div>
                </div>

                {/* 4 PREDICTIVE TARGET METRICS */}
                <div className="subj-targets-grid">
                  <div className="target-metric-box">
                    <span className="target-label">Req for {threshold}%</span>
                    <strong className={`target-value ${forecast.requiredClassesThreshold === 0 ? "text-success" : "text-danger"}`}>
                      {forecast.requiredClassesThreshold === 0 ? "0 (Eligible ✓)" : `${forecast.requiredClassesThreshold} classes`}
                    </strong>
                    <span className="target-subtext">to achieve {threshold}%</span>
                  </div>

                  <div className="target-metric-box">
                    <span className="target-label">Req for {criticalThreshold}%</span>
                    <strong className={`target-value ${forecast.requiredClassesCritical === 0 ? "text-success" : "text-danger"}`}>
                      {forecast.requiredClassesCritical === 0 ? "0 (Safe ✓)" : `${forecast.requiredClassesCritical} classes`}
                    </strong>
                    <span className="target-subtext">to achieve {criticalThreshold}%</span>
                  </div>

                  <div className="target-metric-box">
                    <span className="target-label">Max Absences</span>
                    <strong className={`target-value ${(forecast.remainingSafeSkips75 ?? forecast.maximumAllowedAbsences) > 0 ? "text-success" : "text-danger"}`}>
                      {(forecast.remainingSafeSkips75 ?? forecast.maximumAllowedAbsences) > 0
                        ? `${forecast.remainingSafeSkips75 ?? forecast.maximumAllowedAbsences} safe skips`
                        : "0 skips"}
                    </strong>
                    <span className="target-subtext">
                      {forecast.maxTotalSemesterAbsences75 !== undefined
                        ? `Budget: ${forecast.maxTotalSemesterAbsences75} total (${forecast.missedSoFar ?? 0} used)`
                        : "allowed"}
                    </span>
                  </div>

                  <div className="target-metric-box">
                    <span className="target-label">Best Possible</span>
                    <strong className={`target-value ${forecast.canRecover ? "text-success" : "text-danger"}`}>
                      {forecast.bestPossiblePercentage !== undefined ? `${forecast.bestPossiblePercentage.toFixed(1)}%` : "—"}
                    </strong>
                    <span className="target-subtext">if 100% attended</span>
                  </div>
                </div>

                {/* Sub-components breakdown & targets (e.g. PP / PR / Lab) */}
                {sub.components && Object.keys(sub.components).length > 0 && (
                  <div className="components-breakdown-box">
                    <span className="breakdown-label">Component Breakdown & Targets:</span>
                    <div className="components-detail-grid">
                      {Object.entries(sub.components).map(([cType, cVal]) => {
                        const cForecast = forecast.componentForecasts?.[cType];
                        const cPct = cVal.conducted > 0 ? ((cVal.attended / cVal.conducted) * 100).toFixed(1) : null;
                        const isEligible = cPct !== null && parseFloat(cPct) >= threshold;
                        return (
                          <div key={cType} className="comp-detail-card">
                            <div className="comp-card-header">
                              <strong className="comp-name">{cType}</strong>
                              <span className={`comp-ratio ${isEligible ? "text-success" : "text-danger"}`}>
                                {cVal.attended}/{cVal.conducted} ({cPct !== null ? `${cPct}%` : "—"})
                              </span>
                            </div>
                            <div className="comp-metrics-row">
                              <span className="comp-metric-tag" title={`Classes required to reach ${threshold}%`}>
                                Need {threshold}%: <strong>{cForecast?.requiredClassesThreshold ?? 0}</strong>
                              </span>
                              <span className="comp-metric-tag" title={`Classes required to reach ${criticalThreshold}%`}>
                                Need {criticalThreshold}%: <strong>{cForecast?.requiredClassesCritical ?? 0}</strong>
                              </span>
                              <span className="comp-metric-tag" title={`Max safe absences allowed while staying >= ${threshold}% (Budget: ${cForecast?.maxTotalSemesterAbsences ?? 0} total, ${cForecast?.missedSoFar ?? 0} used)`}>
                                Max Skips: <strong>{cForecast?.remainingSafeSkips75 ?? cForecast?.maximumAllowedAbsences ?? 0}</strong>
                                {cForecast?.totalClasses > 0 && (
                                  <span className="comp-classes-hint"> (of {cForecast.totalClasses} total)</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="subj-card-footer">
                  <span className="criteria-hint">Target: {threshold}%</span>
                  <div className="card-actions-group">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(sub)}>
                      Edit
                    </Button>
                    <button
                      type="button"
                      className="btn-trash-icon"
                      onClick={() => handleDelete(sub.id)}
                      aria-label="Delete subject"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT SUBJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Add New Subject"}
        maxWidth="580px"
      >
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label className="form-label">
              Subject Name <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Distributed Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">
                Course Code <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CS501"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Credits <span className="optional-tag">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                max="20"
                className="form-input"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject Color Indicator</label>
            <div className="color-swatches-row">
              {["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#4b5563"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch-btn ${color === c ? "selected" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <div className="components-header-row">
              <label className="form-label mb-0">Components / Class Types</label>
              <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={handleAddComponent}>
                Add Component
              </Button>
            </div>
            <p className="form-help-text">
              Configure components like Lecture, Lab, Tutorial, PP, or PR, along with historical attended/conducted counts.
            </p>

            <div className="components-editor-list">
              {components.map((comp, idx) => (
                <div key={idx} className="component-editor-row">
                  <input
                    type="text"
                    className="form-input comp-type-input"
                    placeholder="Type (e.g. PP / PR / Lab)"
                    value={comp.type}
                    onChange={(e) => handleComponentChange(idx, "type", e.target.value)}
                    required
                  />
                  <div className="comp-number-box">
                    <label>Attended:</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input comp-num-input"
                      value={comp.attended}
                      onChange={(e) => handleComponentChange(idx, "attended", e.target.value)}
                    />
                  </div>
                  <div className="comp-number-box">
                    <label>Conducted:</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input comp-num-input"
                      value={comp.conducted}
                      onChange={(e) => handleComponentChange(idx, "conducted", e.target.value)}
                    />
                  </div>
                  {components.length > 1 && (
                    <button
                      type="button"
                      className="btn-trash-icon"
                      onClick={() => handleRemoveComponent(idx)}
                      aria-label="Remove component"
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MID-SEMESTER OPENING ATTENDANCE MODAL */}
      <MidSemesterSetupModal
        isOpen={isMidSemModalOpen}
        onClose={() => setIsMidSemModalOpen(false)}
      />
    </div>
  );
}
