import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { Modal } from "../common/Modal.jsx";
import { Button } from "../common/Button.jsx";
import { Badge } from "../common/Badge.jsx";
import { IconCheck, IconPlus } from "../common/Icons.jsx";

export function AuthModal({ isOpen, onClose }) {
  const { users, currentUser, loginUser, createUser } = useApp();

  const [activeTab, setActiveTab] = useState("switch"); // "switch" | "create"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("Galgotias University");
  const [program, setProgram] = useState("B.Tech Computer Science (AIML)");
  const [template, setTemplate] = useState("galgotias-sem5");

  const handleSelectUser = (userId) => {
    loginUser(userId);
    onClose();
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    createUser({
      name: name.trim(),
      email: email.trim(),
      institution: institution.trim(),
      program: program.trim(),
      template,
    });

    setName("");
    setEmail("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Accounts & Authentication" maxWidth="520px">
      <div className="auth-modal-tabs">
        <button
          type="button"
          className={`auth-tab-btn ${activeTab === "switch" ? "active" : ""}`}
          onClick={() => setActiveTab("switch")}
        >
          Switch Account ({users.length})
        </button>
        <button
          type="button"
          className={`auth-tab-btn ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          + New Student Profile
        </button>
      </div>

      {activeTab === "switch" ? (
        <div className="auth-switch-pane">
          <p className="auth-helper-text">
            Each student account maintains its own isolated attendance records, courses, timetable, and semesters.
          </p>

          <div className="users-list-box">
            {users.map((u) => {
              const isActive = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  className={`user-account-row ${isActive ? "active-account" : ""}`}
                  onClick={() => handleSelectUser(u.id)}
                >
                  <div className="account-avatar">{u.avatarInitials || "U"}</div>
                  <div className="account-info">
                    <div className="account-name-row">
                      <strong className="account-name">{u.name}</strong>
                      {isActive && <Badge variant="success" size="sm">Active</Badge>}
                    </div>
                    <span className="account-subtext">
                      {u.institution || "Galgotias University"} • {u.program || "Student"}
                    </span>
                  </div>
                  {isActive && <IconCheck size={18} className="text-success ml-auto" />}
                </div>
              );
            })}
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" icon={<IconPlus size={14} />} onClick={() => setActiveTab("create")}>
              Add Another Student
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateUser} className="auth-create-form modal-form">
          <p className="auth-helper-text">
            Create an independent profile for a classmate or yourself with Galgotias University presets.
          </p>

          <div className="form-group">
            <label className="form-label">
              Full Name <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Rohit Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              College Email / Roll No. <span className="optional-tag">(Optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 23SCSE1010001@galgotiasuniversity.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">University / Institution</label>
              <input
                type="text"
                className="form-input"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Degree & Branch</label>
              <input
                type="text"
                className="form-input"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Starting Setup Template</label>
            <div className="template-options-grid">
              <label className={`template-option-card ${template === "galgotias-sem5" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="userTemplate"
                  value="galgotias-sem5"
                  checked={template === "galgotias-sem5"}
                  onChange={() => setTemplate("galgotias-sem5")}
                />
                <div>
                  <strong>Galgotias Semester V (Autumn)</strong>
                  <p>Preloads standard Sem V courses & calendar with clean 0% attendance baseline.</p>
                </div>
              </label>

              <label className={`template-option-card ${template === "galgotias-sem6" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="userTemplate"
                  value="galgotias-sem6"
                  checked={template === "galgotias-sem6"}
                  onChange={() => setTemplate("galgotias-sem6")}
                />
                <div>
                  <strong>Galgotias Semester VI (Spring)</strong>
                  <p>Starts in Semester VI with Galgotias Spring 2027 calendar & subjects.</p>
                </div>
              </label>

              <label className={`template-option-card ${template === "clean" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="userTemplate"
                  value="clean"
                  checked={template === "clean"}
                  onChange={() => setTemplate("clean")}
                />
                <div>
                  <strong>Clean Slate</strong>
                  <p>Start with a clean empty course catalog and configure manually.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-actions-row">
            <Button variant="secondary" onClick={() => setActiveTab("switch")}>
              Back
            </Button>
            <Button variant="primary" type="submit">
              Create Profile & Log In
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
