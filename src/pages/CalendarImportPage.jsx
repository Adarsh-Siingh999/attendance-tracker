import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import { IconUpload, IconSparkles, IconCheck, IconTrash, IconPlus } from "../components/common/Icons.jsx";
import { extractEventsFromText, GALGOTIAS_SEM5_2026_EVENTS } from "../utils/calendarParser.js";

export function CalendarImportPage() {
  const { calendar, saveCalendar, setActiveTab } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [fileName, setFileName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importMode, setImportMode] = useState("preset"); // "preset" | "paste" | "file"
  const [parseStats, setParseStats] = useState(null);

  // Load comprehensive Galgotias University preset
  const handleLoadPreset = () => {
    setIsProcessing(true);
    setSuccessMessage("");
    setParseStats(null);
    setTimeout(() => {
      setIsProcessing(false);
      setExtractedEvents([...GALGOTIAS_SEM5_2026_EVENTS]);
      setParseStats({
        source: "Galgotias University Sem V (Autumn 2026) Official Calendar",
        holidays: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "holiday").length,
        exams: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "exam").length,
        other: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "non-instructional").length,
      });
    }, 600);
  };

  // Parse pasted text with AI extraction engine
  const handleParseText = () => {
    if (!pasteText.trim()) return;
    setIsProcessing(true);
    setSuccessMessage("");
    setParseStats(null);
    setTimeout(() => {
      const parsed = extractEventsFromText(pasteText, 2026);
      setIsProcessing(false);
      setExtractedEvents(parsed);
      setParseStats({
        source: "Pasted Text (" + pasteText.split("\n").filter(Boolean).length + " lines analyzed)",
        holidays: parsed.filter((e) => e.type === "holiday").length,
        exams: parsed.filter((e) => e.type === "exam").length,
        other: parsed.filter((e) => e.type === "non-instructional").length,
      });
    }, 800);
  };

  // Handle file upload — read as text
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsProcessing(true);
    setSuccessMessage("");
    setParseStats(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result || "";
      const parsed = extractEventsFromText(text, 2026);

      // If file parsing found very few events, supplement with preset
      if (parsed.length < 3) {
        const combined = [...GALGOTIAS_SEM5_2026_EVENTS];
        // Add any unique parsed events not already in preset
        for (const p of parsed) {
          if (!combined.some((c) => c.date === p.date && c.name === p.name)) {
            combined.push(p);
          }
        }
        setExtractedEvents(combined);
        setParseStats({
          source: `${file.name} (${parsed.length} events extracted from file + Galgotias preset supplemented)`,
          holidays: combined.filter((e) => e.type === "holiday").length,
          exams: combined.filter((e) => e.type === "exam").length,
          other: combined.filter((e) => e.type === "non-instructional").length,
        });
      } else {
        setExtractedEvents(parsed);
        setParseStats({
          source: `${file.name} (${parsed.length} events extracted)`,
          holidays: parsed.filter((e) => e.type === "holiday").length,
          exams: parsed.filter((e) => e.type === "exam").length,
          other: parsed.filter((e) => e.type === "non-instructional").length,
        });
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      // Fallback to preset on read error
      setExtractedEvents([...GALGOTIAS_SEM5_2026_EVENTS]);
      setParseStats({
        source: `${file.name} (could not read file — loaded Galgotias preset instead)`,
        holidays: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "holiday").length,
        exams: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "exam").length,
        other: GALGOTIAS_SEM5_2026_EVENTS.filter((e) => e.type === "non-instructional").length,
      });
      setIsProcessing(false);
    };
    reader.readAsText(file);
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
        id: `manual-${Date.now()}`,
        type: "holiday",
        name: "",
        date: new Date().toISOString().split("T")[0],
        countsAsClass: false,
      },
    ]);
  };

  const handleConfirmAndSave = () => {
    const currentHolidays = [...(calendar?.holidays || [])];
    const currentExams = { ...(calendar?.examinations || {}) };
    const currentNonInst = [...(calendar?.nonInstructionalDays || [])];

    let added = 0;
    for (const item of extractedEvents) {
      if (item.type === "holiday") {
        if (!currentHolidays.some((h) => h.date === item.date && h.name === item.name)) {
          currentHolidays.push({ date: item.date, name: item.name });
          added++;
        }
      } else if (item.type === "exam") {
        // Check if this exam already exists
        const exists = Object.values(currentExams).some(
          (ex) => ex.startDate === item.date && ex.name === item.name
        );
        if (!exists) {
          const key = `exam-${item.date}-${Math.floor(Math.random() * 10000)}`;
          currentExams[key] = {
            name: item.name,
            startDate: item.date,
            endDate: item.endDate || item.date,
            countsAsClass: Boolean(item.countsAsClass),
          };
          added++;
        }
      } else if (item.type === "non-instructional") {
        if (!currentNonInst.some((d) => d.date === item.date)) {
          currentNonInst.push({ date: item.date, name: item.name });
          added++;
        }
      }
    }

    // Sort holidays by date
    currentHolidays.sort((a, b) => a.date.localeCompare(b.date));

    saveCalendar({
      ...calendar,
      holidays: currentHolidays,
      examinations: currentExams,
      nonInstructionalDays: currentNonInst,
    });

    setSuccessMessage(
      `Successfully imported ${added} new events (${extractedEvents.length} total reviewed, duplicates skipped) into your academic calendar!`
    );
    setTimeout(() => {
      setActiveTab("calendar");
    }, 2000);
  };

  const typeLabel = (t) =>
    t === "holiday" ? "🎉 Holiday" : t === "exam" ? "📝 Exam" : "📋 Non-Instructional";
  const typeBadgeClass = (t) =>
    t === "holiday" ? "tag-holiday" : t === "exam" ? "tag-exam" : "tag-noninst";

  return (
    <div className="page-container ai-import-page">
      <div className="page-header-actions">
        <div>
          <h2 className="section-heading">AI Academic Calendar Importer</h2>
          <p className="section-desc">
            Import your university&apos;s official academic calendar — load the Galgotias preset, paste calendar text, or upload a file. AI extracts holidays, exams, and events.
          </p>
        </div>
      </div>

      {/* IMPORT MODE SELECTOR */}
      <div className="import-mode-selector">
        <button
          type="button"
          className={`mode-tab ${importMode === "preset" ? "active" : ""}`}
          onClick={() => setImportMode("preset")}
        >
          <IconSparkles size={16} /> Galgotias Preset
        </button>
        <button
          type="button"
          className={`mode-tab ${importMode === "paste" ? "active" : ""}`}
          onClick={() => setImportMode("paste")}
        >
          📋 Paste Calendar Text
        </button>
        <button
          type="button"
          className={`mode-tab ${importMode === "file" ? "active" : ""}`}
          onClick={() => setImportMode("file")}
        >
          <IconUpload size={16} /> Upload File
        </button>
      </div>

      {/* PRESET MODE */}
      {importMode === "preset" && (
        <div className="ai-upload-card">
          <div className="upload-dropzone">
            <IconSparkles size={48} className="upload-icon" />
            <h3>Galgotias University — Semester V (Autumn 2026)</h3>
            <p>
              Load the complete official academic calendar with <strong>15 holidays</strong>,{" "}
              <strong>5 examination periods</strong>, and <strong>7 academic milestones</strong> pre-configured.
            </p>
            <Button variant="primary" size="md" onClick={handleLoadPreset}>
              Load Complete Calendar ({GALGOTIAS_SEM5_2026_EVENTS.length} Events)
            </Button>
          </div>
        </div>
      )}

      {/* PASTE MODE */}
      {importMode === "paste" && (
        <div className="ai-upload-card paste-mode-card">
          <div className="paste-section">
            <h3>Paste Your Academic Calendar Text</h3>
            <p className="paste-hint">
              Copy-paste the holiday list, exam schedule, or academic calendar from your university website, notice, or WhatsApp group.
              The AI parser supports multiple date formats (dd/mm/yyyy, &quot;15 August&quot;, date ranges, etc.)
            </p>
            <textarea
              className="form-input paste-textarea"
              rows={10}
              placeholder={`Example formats supported:\n\n15/08/2026 - Independence Day\n02.10.2026 | Mahatma Gandhi Jayanti\n21/10/2026 to 31/10/2026 - Mid-Term Examinations\nDiwali - 08/11/2026\n15 August 2026 - Independence Day\nRaksha Bandhan 28 Aug 2026`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="paste-actions-row">
              <span className="paste-line-count">
                {pasteText.split("\n").filter(Boolean).length} lines
              </span>
              <Button
                variant="primary"
                size="md"
                onClick={handleParseText}
                disabled={!pasteText.trim()}
              >
                <IconSparkles size={16} /> Extract Events from Text
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FILE MODE */}
      {importMode === "file" && (
        <div className="ai-upload-card">
          <div className="upload-dropzone">
            <IconUpload size={48} className="upload-icon" />
            <h3>Upload Calendar File (TXT / CSV)</h3>
            <p>
              Upload a text or CSV file containing your academic calendar. The parser will extract dates and event names.
              For PDF/image files, copy-paste the text content using the &quot;Paste&quot; tab instead.
            </p>
            <div className="upload-btn-row">
              <label className="saas-btn btn-primary btn-md cursor-pointer">
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".txt,.csv,.text"
                  className="hidden-file-input"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {fileName && <span className="selected-filename">Selected: {fileName}</span>}
          </div>
        </div>
      )}

      {/* PROCESSING SPINNER */}
      {isProcessing && (
        <div className="processing-state-card">
          <IconSparkles size={24} className="sparkle-anim text-purple" />
          <h4>Analyzing and extracting academic events...</h4>
          <p>Parsing dates, classifying holidays vs exams, and resolving date ranges.</p>
        </div>
      )}

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="import-success-banner">
          <IconCheck size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* PARSE STATS */}
      {parseStats && !isProcessing && (
        <div className="parse-stats-banner">
          <div className="stats-source">
            <strong>Source:</strong> {parseStats.source}
          </div>
          <div className="stats-counts">
            <span className="stat-chip chip-holiday">🎉 {parseStats.holidays} Holidays</span>
            <span className="stat-chip chip-exam">📝 {parseStats.exams} Exams</span>
            <span className="stat-chip chip-other">📋 {parseStats.other} Other</span>
            <span className="stat-chip chip-total">
              Total: {extractedEvents.length} events
            </span>
          </div>
        </div>
      )}

      {/* REVIEW TABLE */}
      {extractedEvents.length > 0 && !isProcessing && (
        <div className="import-review-card">
          <div className="review-card-header">
            <div>
              <h3>Review Detected Academic Events ({extractedEvents.length})</h3>
              <p>Verify detected dates, edit event titles, and change types before confirming.</p>
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
                  <th>Type</th>
                  <th>Event Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Counts as Class</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {extractedEvents.map((item) => (
                  <tr key={item.id} className={`row-type-${item.type}`}>
                    <td>
                      <select
                        className="form-input table-select"
                        value={item.type}
                        onChange={(e) => handleUpdateEvent(item.id, "type", e.target.value)}
                      >
                        <option value="holiday">🎉 Holiday</option>
                        <option value="exam">📝 Examination</option>
                        <option value="non-instructional">📋 Non-Instructional</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input table-input"
                        value={item.name}
                        onChange={(e) => handleUpdateEvent(item.id, "name", e.target.value)}
                        placeholder="Event name"
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
