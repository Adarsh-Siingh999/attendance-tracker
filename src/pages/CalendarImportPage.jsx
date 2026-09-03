import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { IconUpload, IconSparkles, IconCheck, IconTrash, IconPlus } from "../components/common/Icons.jsx";

export function CalendarImportPage() {
  const { calendar, saveCalendar, setActiveTab } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [fileName, setFileName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Demo extracted dataset for immediate testing
  const sampleAcademicEvents = [
    { id: "e1", type: "holiday", name: "Mahatma Gandhi Jayanti", date: "2026-10-02", countsAsClass: false },
    { id: "e2", type: "exam", name: "Mid-Term Examinations (MTE)", date: "2026-10-21", endDate: "2026-10-31", countsAsClass: false },
    { id: "e3", type: "holiday", name: "Diwali Festival", date: "2026-11-08", countsAsClass: false },
    { id: "e4", type: "exam", name: "Internal Assessment 2 (IA2)", date: "2026-11-17", endDate: "2026-11-21", countsAsClass: true },
    { id: "e5", type: "holiday", name: "Guru Nanak Jayanti", date: "2026-11-24", countsAsClass: false },
    { id: "e6", type: "exam", name: "End-Term Practical Examinations", date: "2026-12-11", endDate: "2026-12-15", countsAsClass: true },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setSuccessMessage("");

    // Simulate OCR & AI document entity extraction pipeline
    setTimeout(() => {
      setIsProcessing(false);
      setExtractedEvents(sampleAcademicEvents);
    }, 1200);
  };

  const handleLoadSample = () => {
    setFileName("sample_university_calendar_2026.pdf");
    setIsProcessing(true);
    setSuccessMessage("");
    setTimeout(() => {
      setIsProcessing(false);
      setExtractedEvents(sampleAcademicEvents);
    }, 800);
  };

  const handleUpdateEvent = (id, field, value) => {
    setExtractedEvents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteEvent = (id) => {
    setExtractedEvents((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManualEvent = () => {
    setExtractedEvents((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        type: "holiday",
        name: "New Detected Holiday",
        date: new Date().toISOString().split("T")[0],
        countsAsClass: false,
      },
    ]);
  };

  const handleConfirmAndSave = () => {
    const currentHolidays = [...(calendar?.holidays || [])];
    const currentExams = { ...(calendar?.examinations || {}) };

    for (const item of extractedEvents) {
      if (item.type === "holiday") {
        if (!currentHolidays.some((h) => h.date === item.date)) {
          currentHolidays.push({ date: item.date, name: item.name });
        }
      } else if (item.type === "exam") {
        const key = `exam-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        currentExams[key] = {
          name: item.name,
          startDate: item.date,
          endDate: item.endDate || item.date,
          countsAsClass: Boolean(item.countsAsClass),
        };
      }
    }

    saveCalendar({
      ...calendar,
      holidays: currentHolidays,
      examinations: currentExams,
    });

    setSuccessMessage(`Successfully imported ${extractedEvents.length} events into your academic calendar!`);
    setTimeout(() => {
      setActiveTab("calendar");
    }, 1500);
  };

  return (
    <div className="page-container ai-import-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">AI Academic Calendar Importer</h2>
          <p className="section-desc">
            Upload your university's official academic calendar notice (PDF or Image). AI extracts all holidays, exams, and semester schedules for your review.
          </p>
        </div>
      </div>

      {/* UPLOAD BOX */}
      <div className="ai-upload-card">
        <div className="upload-dropzone">
          <IconUpload size={48} className="upload-icon" />
          <h3>Upload University Notice or Calendar</h3>
          <p>Drag and drop your academic calendar image or PDF file here (PNG, JPG, or PDF)</p>

          <div className="upload-btn-row">
            <label className="saas-btn btn-primary btn-md cursor-pointer">
              <span>Choose File</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden-file-input"
                onChange={handleFileUpload}
              />
            </label>
            <Button variant="outline" size="md" onClick={handleLoadSample}>
              Load Sample Notice
            </Button>
          </div>

          {fileName && <span className="selected-filename">Selected: {fileName}</span>}
        </div>
      </div>

      {isProcessing && (
        <div className="processing-state-card">
          <IconSparkles size={24} className="sparkle-anim text-purple" />
          <h4>Analyzing document with OCR & AI parsing...</h4>
          <p>Extracting semester boundaries, official university holidays, and examination timeframes.</p>
        </div>
      )}

      {successMessage && (
        <div className="import-success-banner">
          <IconCheck size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* HUMAN IN THE LOOP REVIEW TABLE */}
      {extractedEvents.length > 0 && !isProcessing && (
        <div className="import-review-card">
          <div className="review-card-header">
            <div>
              <h3>Review Detected Academic Events ({extractedEvents.length})</h3>
              <p>Verify detected dates and edit event titles before confirming to your calendar.</p>
            </div>
            <div className="review-header-actions">
              <Button variant="ghost" size="sm" icon={<IconPlus size={14} />} onClick={handleAddManualEvent}>
                Add Event
              </Button>
              <Button variant="primary" size="sm" icon={<IconCheck size={14} />} onClick={handleConfirmAndSave}>
                Confirm & Apply to Calendar
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="impact-table review-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Event Name</th>
                  <th>Start Date</th>
                  <th>End Date (Exams)</th>
                  <th>Counts as Class</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {extractedEvents.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <select
                        className="form-input table-select"
                        value={item.type}
                        onChange={(e) => handleUpdateEvent(item.id, "type", e.target.value)}
                      >
                        <option value="holiday">Holiday</option>
                        <option value="exam">Examination</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input table-input"
                        value={item.name}
                        onChange={(e) => handleUpdateEvent(item.id, "name", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="form-input table-input"
                        value={item.date}
                        onChange={(e) => handleUpdateEvent(item.id, "date", e.target.value)}
                      />
                    </td>
                    <td>
                      {item.type === "exam" ? (
                        <input
                          type="date"
                          className="form-input table-input"
                          value={item.endDate || item.date}
                          onChange={(e) => handleUpdateEvent(item.id, "endDate", e.target.value)}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      {item.type === "exam" ? (
                        <input
                          type="checkbox"
                          checked={Boolean(item.countsAsClass)}
                          onChange={(e) => handleUpdateEvent(item.id, "countsAsClass", e.target.checked)}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-trash-icon"
                        onClick={() => handleDeleteEvent(item.id)}
                        aria-label="Remove event"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
