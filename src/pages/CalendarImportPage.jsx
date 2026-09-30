import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Button } from "../components/common/Button.jsx";
import {
  IconUpload,
  IconSparkles,
  IconCheck,
  IconTrash,
  IconPlus,
  IconCamera,
  IconAlertTriangle,
} from "../components/common/Icons.jsx";
import { extractEventsFromText, GALGOTIAS_SEM5_2026_EVENTS } from "../utils/calendarParser.js";
import {
  getStoredClaudeApiKey,
  saveStoredClaudeApiKey,
  testClaudeApiKey,
  analyzeCalendarImageWithClaude,
  analyzeCalendarTextWithClaude,
} from "../services/aiService.js";

export function CalendarImportPage() {
  const { calendar, saveCalendar, setActiveTab } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [fileName, setFileName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importMode, setImportMode] = useState("preset"); // "preset" | "image" | "paste" | "file"
  const [parseStats, setParseStats] = useState(null);
  const [calendarMetadata, setCalendarMetadata] = useState(null);

  // Claude API Key & Settings
  const [claudeKey, setClaudeKey] = useState(() => getStoredClaudeApiKey());
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [keySavedMessage, setKeySavedMessage] = useState("");

  // Circular / Notice Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const handleSaveClaudeKey = () => {
    saveStoredClaudeApiKey(claudeKey);
    setKeySavedMessage("Claude API Key saved securely in your browser!");
    setTimeout(() => setKeySavedMessage(""), 3500);
  };

  const handleTestClaudeKey = async () => {
    if (!claudeKey.trim()) {
      setTestResult({ success: false, error: "Please enter your Claude API key first" });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    const res = await testClaudeApiKey(claudeKey.trim());
    setIsTestingKey(false);
    setTestResult(res);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const processAiExtractedCalendar = (parsedResult, sourceLabel) => {
    if (!parsedResult) {
      throw new Error("Could not parse calendar from AI response.");
    }
    const events = [];
    (parsedResult.holidays || []).forEach((h, idx) => {
      events.push({
        id: `claude-h-${idx}-${Date.now()}`,
        type: "holiday",
        name: h.name,
        date: h.date,
        countsAsClass: false,
      });
    });
    (parsedResult.examinations || []).forEach((ex, idx) => {
      events.push({
        id: `claude-ex-${idx}-${Date.now()}`,
        type: "exam",
        name: ex.name,
        date: ex.startDate,
        endDate: ex.endDate,
        countsAsClass: Boolean(ex.countsAsClass),
      });
    });
    (parsedResult.nonInstructionalDays || []).forEach((ni, idx) => {
      events.push({
        id: `claude-ni-${idx}-${Date.now()}`,
        type: "non-instructional",
        name: ni.name,
        date: ni.date,
        countsAsClass: false,
      });
    });

    setExtractedEvents(events);
    setCalendarMetadata({
      semester: parsedResult.semester,
      academicYear: parsedResult.academicYear,
      startDate: parsedResult.startDate,
      endDate: parsedResult.endDate,
      weekends: parsedResult.weekends,
    });
    setParseStats({
      source: `${sourceLabel} (Claude 3.5 Sonnet Vision & AI)`,
      holidays: (parsedResult.holidays || []).length,
      exams: (parsedResult.examinations || []).length,
      other: (parsedResult.nonInstructionalDays || []).length,
    });
  };

  // Scan circular photo or screenshot with Claude Vision
  const handleScanImageWithClaude = async () => {
    if (!imagePreview) {
      setErrorMessage("Please select or capture a circular or academic calendar image first.");
      return;
    }
    setIsProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");
    setParseStats(null);

    try {
      const mime = imageFile?.type || "image/jpeg";
      const result = await analyzeCalendarImageWithClaude(imagePreview, mime, claudeKey);
      processAiExtractedCalendar(result, imageFile?.name || "Uploaded Circular Image");
    } catch (err) {
      setErrorMessage(`Claude Vision Error: ${err.message || "Failed to scan calendar image."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract events from text with Claude AI
  const handleParseTextWithClaude = async () => {
    if (!pasteText.trim()) return;
    setIsProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");
    setParseStats(null);

    try {
      const result = await analyzeCalendarTextWithClaude(pasteText, claudeKey);
      processAiExtractedCalendar(result, "Pasted Circular / Notice Text");
    } catch (err) {
      setErrorMessage(`Claude AI Error: ${err.message || "Failed to parse text. Falling back to local heuristic..."}`);
      // Fallback to local regex parser
      const parsed = extractEventsFromText(pasteText, 2026);
      setExtractedEvents(parsed);
      setParseStats({
        source: "Pasted Text (Fallback Local Parser)",
        holidays: parsed.filter((e) => e.type === "holiday").length,
        exams: parsed.filter((e) => e.type === "exam").length,
        other: parsed.filter((e) => e.type === "non-instructional").length,
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
      ...(calendarMetadata?.startDate ? { startDate: calendarMetadata.startDate } : {}),
      ...(calendarMetadata?.endDate ? { endDate: calendarMetadata.endDate } : {}),
      ...(calendarMetadata?.semester ? { semester: calendarMetadata.semester } : {}),
      ...(calendarMetadata?.weekends?.length ? { weekends: calendarMetadata.weekends } : {}),
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
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
            <span className="agent-badge">✨ CALENDAR INTELLIGENCE</span>
            <span className="agent-status-tag">
              {claudeKey.trim() ? "🟢 Claude 3.5 Sonnet Connected" : "⚡ Claude AI Ready"}
            </span>
          </div>
          <h2 className="section-heading">AI Academic Calendar Importer</h2>
          <p className="section-desc">
            Import your university&apos;s official academic calendar — scan photos of circulars with Claude 3.5 Sonnet Vision, paste text, or load presets.
          </p>
        </div>
      </div>

      {/* CLAUDE API KEY DRAWER */}
      <div className="gemini-key-drawer" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          className="drawer-toggle-btn"
          onClick={() => setIsKeyDrawerOpen((prev) => !prev)}
        >
          <span>🤖 Anthropic Claude AI Settings (Vision & Text Calendar Extraction)</span>
          <span className="drawer-arrow">{isKeyDrawerOpen ? "▲" : "▼"}</span>
        </button>

        {isKeyDrawerOpen && (
          <div className="drawer-body">
            <p className="drawer-hint">
              Enter your Anthropic Claude API Key from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="link-primary"
              >
                console.anthropic.com
              </a>{" "}
              to scan circular photos, examination notices, and semester schedules directly.
            </p>
            <div className="key-input-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="password"
                className="form-input key-input"
                placeholder="sk-ant-api03-... (Claude API Key)"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                style={{ flex: 1, minWidth: "220px" }}
              />
              <Button variant="outline" size="sm" onClick={handleTestClaudeKey} disabled={isTestingKey}>
                {isTestingKey ? "Testing..." : "Test Key"}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveClaudeKey}>
                Save Key
              </Button>
            </div>
            {testResult && (
              <div style={{ marginTop: "6px", fontSize: "12px", color: testResult.success ? "#10b981" : "#ef4444" }}>
                {testResult.success ? "✅ Claude API connected successfully!" : `❌ Test failed: ${testResult.error}`}
              </div>
            )}
            {keySavedMessage && <div className="text-success text-xs mt-1" style={{ marginTop: "6px" }}>{keySavedMessage}</div>}
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #f87171", borderRadius: "8px", color: "#b91c1c", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <IconAlertTriangle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

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
          className={`mode-tab ${importMode === "image" ? "active" : ""}`}
          onClick={() => setImportMode("image")}
        >
          <IconCamera size={16} /> 📷 Claude Vision (Circular Photo)
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
          <IconUpload size={16} /> Upload TXT / CSV
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

      {/* IMAGE / CIRCULAR SCANNER MODE (CLAUDE VISION) */}
      {importMode === "image" && (
        <div className="ai-upload-card">
          <div className="upload-dropzone" style={{ padding: "24px 16px" }}>
            {imagePreview ? (
              <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
                <img
                  src={imagePreview}
                  alt="Calendar Circular Preview"
                  style={{ maxHeight: "260px", maxWidth: "100%", borderRadius: "8px", objectFit: "contain", border: "1px solid var(--border-color)" }}
                />
                <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  {imageFile?.name || "Selected Circular Image"}
                </p>
                <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
                  <Button variant="primary" size="md" onClick={handleScanImageWithClaude} disabled={isProcessing}>
                    <IconSparkles size={16} /> {isProcessing ? "Scanning with Claude Vision..." : "Extract Calendar with Claude Vision"}
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setImagePreview("");
                      setImageFile(null);
                    }}
                  >
                    Change Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <IconCamera size={48} className="upload-icon text-primary" />
                <h3>Photograph or Upload Academic Circular</h3>
                <p>
                  Claude 3.5 Sonnet Vision reads official notifications, holiday lists, and exam schedules from photos or screenshots (PNG, JPG, WEBP).
                </p>
                <div className="upload-btn-row">
                  <label className="saas-btn btn-primary btn-md cursor-pointer">
                    <IconUpload size={16} /> Choose Image / Snap Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden-file-input"
                      onChange={handleImageFileChange}
                    />
                  </label>
                </div>
              </>
            )}
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
              Extract with Claude AI for deep contextual understanding or use the fast heuristic engine.
            </p>
            <textarea
              className="form-input paste-textarea"
              rows={9}
              placeholder={`Example formats supported:\n\n15/08/2026 - Independence Day\n02.10.2026 | Mahatma Gandhi Jayanti\n21/10/2026 to 31/10/2026 - Mid-Term Examinations\nDiwali - 08/11/2026\n15 August 2026 - Independence Day\nRaksha Bandhan 28 Aug 2026`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="paste-actions-row" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <span className="paste-line-count">
                {pasteText.split("\n").filter(Boolean).length} lines
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleParseText}
                  disabled={!pasteText.trim() || isProcessing}
                >
                  📋 Local Heuristic Parse
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleParseTextWithClaude}
                  disabled={!pasteText.trim() || isProcessing}
                >
                  <IconSparkles size={16} /> Extract with Claude AI
                </Button>
              </div>
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
              For circular photos or screenshots, use the <strong>Claude Vision</strong> tab.
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
