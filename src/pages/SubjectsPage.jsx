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
  const { subjects, saveSubject, deleteSubject, threshold, criticalThreshold } = useApp();

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

                {/* Sub-components breakdown (e.g. PP / PR / Lab) */}
                {sub.components && Object.keys(sub.components).length > 0 && (
                  <div className="components-breakdown-box">
                    <span className="breakdown-label">Component Breakdown:</span>
                    <div className="components-tags-row">
                      {Object.entries(sub.components).map(([cType, cVal]) => (
                        <div key={cType} className="comp-tag">
                          <strong>{cType}:</strong> {cVal.attended}/{cVal.conducted}
                        </div>
                      ))}
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
