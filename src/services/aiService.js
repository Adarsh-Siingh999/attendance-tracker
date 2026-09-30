/**
 * Unified AI Intelligence Service
 * 
 * Provides seamless integration with Anthropic Claude API (Claude 3.5 Sonnet / Haiku Vision)
 * and Google Gemini API for:
 * 1. AI Timetable Photo & Screenshot Scanning (OCR + chronological class schedule detection)
 * 2. Academic Calendar Extraction (Holidays, Examination schedules, Non-instructional days)
 * 3. Smart Fallbacks & Browser-Safe Direct API execution
 */

export const STORAGE_KEYS = {
  CLAUDE_API_KEY: "at_saas_claude_api_key",
  GEMINI_API_KEY: "at_saas_gemini_api_key",
  PREFERRED_PROVIDER: "at_saas_preferred_ai", // "claude" | "gemini"
};

export const CLAUDE_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
];

// ----------------------------------------------------------------------------
// API KEY MANAGEMENT & ENVIRONMENT RESOLUTION
// ----------------------------------------------------------------------------

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

export function getStoredClaudeApiKey() {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEYS.CLAUDE_API_KEY);
    if (saved) return saved.trim();
  }
  // Check Vite environment variables if available
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const envKey = import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (envKey) return envKey.trim();
    }
  } catch (e) {
    // Ignore in non-vite / testing environments
  }
  return "";
}

export function saveStoredClaudeApiKey(key) {
  const storage = getStorage();
  if (!storage) return;
  if (!key) {
    storage.removeItem(STORAGE_KEYS.CLAUDE_API_KEY);
  } else {
    storage.setItem(STORAGE_KEYS.CLAUDE_API_KEY, key.trim());
  }
}

export function getStoredGeminiApiKey() {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    if (saved) return saved.trim();
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (envKey) return envKey.trim();
    }
  } catch (e) {
    // Ignore in non-vite / testing environments
  }
  return "";
}

export function saveStoredGeminiApiKey(key) {
  const storage = getStorage();
  if (!storage) return;
  if (!key) {
    storage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
  } else {
    storage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key.trim());
  }
}

export function getPreferredAiProvider() {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEYS.PREFERRED_PROVIDER);
    if (saved === "gemini" || saved === "claude") return saved;
  }
  // Default to Claude if Claude key exists, otherwise check Gemini
  if (getStoredClaudeApiKey()) return "claude";
  if (getStoredGeminiApiKey()) return "gemini";
  return "claude"; // Default premier provider
}

export function savePreferredAiProvider(provider) {
  const storage = getStorage();
  if (!storage) return;
  if (provider === "claude" || provider === "gemini") {
    storage.setItem(STORAGE_KEYS.PREFERRED_PROVIDER, provider);
  }
}

// ----------------------------------------------------------------------------
// JSON PARSING & NORMALIZATION HELPERS
// ----------------------------------------------------------------------------

export function extractJsonFromAiResponse(rawText) {
  if (!rawText) return null;
  let text = String(rawText).trim();

  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  if (text.includes("```")) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      text = match[1].trim();
    } else {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(text);
  } catch (err) {
    // Look for first '{' or '[' and last '}' or ']'
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub);
    }
    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const sub = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(sub);
    }
    throw new Error(`Failed to parse AI JSON response: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// CORE CLAUDE MESSAGES API CALLER
// ----------------------------------------------------------------------------

/**
 * Call the Anthropic Claude Messages API.
 * Uses browser-safe header 'anthropic-dangerous-direct-browser-access: true'
 * for zero-backend client-side execution.
 */
export async function callClaudeApi({
  messages,
  system = "",
  maxTokens = 4096,
  temperature = 0.1,
  apiKey = "",
  preferredModel = "",
}) {
  const key = apiKey || getStoredClaudeApiKey();
  if (!key) {
    throw new Error("No Claude API key configured. Please enter your Anthropic API key.");
  }

  // Models to attempt in priority sequence
  const modelsToTry = preferredModel
    ? [preferredModel, ...CLAUDE_MODELS.filter((m) => m !== preferredModel)]
    : CLAUDE_MODELS;

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const bodyPayload = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages,
      };
      if (system) {
        bodyPayload.system = system;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "anthropic-beta": "pdfs-2024-09-25",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errMsg = errorJson.error?.message || `Claude API returned status ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      const text = data?.content?.map((c) => (c.type === "text" ? c.text : "")).join("\n");
      if (!text) {
        throw new Error("Claude returned an empty response.");
      }

      return {
        text,
        model: data.model || model,
        usage: data.usage,
      };
    } catch (err) {
      lastError = err;
      // If error is 401 unauthorized or invalid key, no point cycling models
      if (err.message && (err.message.includes("invalid x-api-key") || err.message.includes("401"))) {
        throw new Error("Invalid Claude API key. Please check your Anthropic API key in Settings.");
      }
    }
  }

  throw lastError || new Error("Failed to communicate with Claude API.");
}

/**
 * Ping test for Claude API key
 */
export async function testClaudeApiKey(apiKey) {
  try {
    const res = await callClaudeApi({
      messages: [{ role: "user", content: "Reply with 'ok' to verify connection." }],
      maxTokens: 10,
      apiKey,
      preferredModel: "claude-3-5-haiku-20241022",
    });
    return { success: true, message: `Connected successfully to Claude! (${res.model})` };
  } catch (err) {
    return { success: false, error: err.message || "Failed to connect to Claude" };
  }
}

// ----------------------------------------------------------------------------
// FEATURE 1: CLAUDE AI TIMETABLE SCANNER (VISION & TEXT)
// ----------------------------------------------------------------------------

const TIMETABLE_SYSTEM_PROMPT = `You are an elite academic timetable extraction agent.
Your mission is to examine photos, screenshots, or text of college/university class routines and timetables.

Identify:
1. Day(s) of the week:
   Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5, Saturday = 6.
2. For each day, all class periods sorted chronologically.
3. For each period:
   - "start": start time in 24-hour HH:MM format (e.g. "08:30", "13:15")
   - "end": end time in 24-hour HH:MM format (e.g. "09:20", "14:15")
   - "subject": course name (e.g. "Machine Learning", "Operating Systems Lab")
   - "code": course code if present (e.g. "CS601", "R1UC544B", or "")
   - "type": "Lecture" | "Lab" | "Practical" | "PP" | "PR" | "Tutorial"
   - "room": room / hall / lab number if visible (or "")

OUTPUT FORMAT:
Respond with ONLY a valid JSON object:
{
  "detectedDays": [
    {
      "dayIndex": 1,
      "dayName": "Monday",
      "classes": [
        {
          "start": "09:00",
          "end": "10:00",
          "subject": "Deep Learning",
          "code": "AI601",
          "type": "Lecture",
          "room": "Audi A"
        }
      ]
    }
  ],
  "confidence": "high",
  "summary": "Extracted Monday to Friday routine with 24 periods"
}`;

/**
 * Scan a timetable image (photo/screenshot) or PDF document using Claude
 */
export async function analyzeTimetableImageWithClaude(base64Data, mimeType = "image/jpeg", apiKey = "") {
  // Clean base64 header if present
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const cleanMime = (mimeType || "image/jpeg").split(";")[0].trim();
  const isPdf = cleanMime === "application/pdf";

  const contentBlock = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: cleanBase64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: cleanMime,
          data: cleanBase64,
        },
      };

  const messages = [
    {
      role: "user",
      content: [
        contentBlock,
        {
          type: "text",
          text: isPdf
            ? "Extract the complete class timetable from this schedule PDF document into structured JSON according to the instructions."
            : "Extract the complete class timetable from this schedule image into structured JSON according to the instructions.",
        },
      ],
    },
  ];

  const response = await callClaudeApi({
    messages,
    system: TIMETABLE_SYSTEM_PROMPT,
    apiKey,
    preferredModel: "claude-3-5-sonnet-20241022",
  });

  const parsed = extractJsonFromAiResponse(response.text);
  return sanitizeExtractedTimetable(parsed);
}

/**
 * Scan timetable text / syllabus notice using Claude
 */
export async function analyzeTimetableTextWithClaude(text, apiKey = "") {
  const messages = [
    {
      role: "user",
      content: `Extract the academic timetable from the following pasted text:\n\n${text}`,
    },
  ];

  const response = await callClaudeApi({
    messages,
    system: TIMETABLE_SYSTEM_PROMPT,
    apiKey,
    preferredModel: "claude-3-5-sonnet-20241022",
  });

  const parsed = extractJsonFromAiResponse(response.text);
  return sanitizeExtractedTimetable(parsed);
}

/**
 * Sanitize and validate timetable extraction output
 */
export function sanitizeExtractedTimetable(raw) {
  if (!raw || typeof raw !== "object") return { detectedDays: [] };
  const days = Array.isArray(raw.detectedDays) ? raw.detectedDays : [];
  const cleanDays = [];
  const DAY_MAP = {
    sunday: 0, sun: 0, 0: 0,
    monday: 1, mon: 1, 1: 1,
    tuesday: 2, tue: 2, 2: 2,
    wednesday: 3, wed: 3, 3: 3,
    thursday: 4, thu: 4, 4: 4,
    friday: 5, fri: 5, 5: 5,
    saturday: 6, sat: 6, 6: 6,
  };
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function normalizeTime(t) {
    if (!t) return "09:00";
    let str = String(t).trim();
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = match12[2];
      const meridiem = (match12[3] || "").toLowerCase();
      if (meridiem === "pm" && h < 12) h += 12;
      if (meridiem === "am" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}`;
    }
    return str;
  }

  for (const d of days) {
    let dayIdx = Number(d.dayIndex);
    if (isNaN(dayIdx) || dayIdx < 0 || dayIdx > 6) {
      const nameKey = String(d.dayName || "").toLowerCase().trim();
      dayIdx = DAY_MAP[nameKey] !== undefined ? DAY_MAP[nameKey] : 1;
    }
    const dayName = DAY_NAMES[dayIdx];
    const classes = Array.isArray(d.classes) ? d.classes : [];
    const cleanClasses = classes.map((c) => ({
      start: normalizeTime(c.start),
      end: normalizeTime(c.end),
      subject: String(c.subject || "Untitled Class").trim(),
      code: String(c.code || "").trim(),
      type: String(c.type || "Lecture").trim(),
      room: String(c.room || "").trim(),
    }));

    cleanClasses.sort((a, b) => a.start.localeCompare(b.start));

    cleanDays.push({
      dayIndex: dayIdx,
      dayName,
      classes: cleanClasses,
    });
  }

  cleanDays.sort((a, b) => a.dayIndex - b.dayIndex);
  return { detectedDays: cleanDays };
}

// ----------------------------------------------------------------------------
// FEATURE 2: CLAUDE AI ACADEMIC CALENDAR EXTRACTOR (VISION & TEXT)
// ----------------------------------------------------------------------------

const CALENDAR_SYSTEM_PROMPT = `You are an expert university academic calendar parser.
Extract semester dates, holidays, exam schedules, and non-instructional days from university circulars, calendar charts, or notices.

Detect:
1. Semester Name: e.g. "Semester VI (Spring 2027)" or "Semester V (Autumn 2026)"
2. Academic Year: e.g. "2026-27"
3. Semester Start Date: "YYYY-MM-DD"
4. Semester End Date: "YYYY-MM-DD" (or null if not stated)
5. Weekends: array of weekday numbers that are non-working (e.g. [0, 6] for Saturday & Sunday, or [0, 1] for Sunday & Monday)
6. Holidays: array of { "date": "YYYY-MM-DD", "name": "Holiday Name" }
7. Examinations: array of {
     "id": "slug-name",
     "name": "Mid-Term Examinations (MTE)",
     "startDate": "YYYY-MM-DD",
     "endDate": "YYYY-MM-DD",
     "countsAsClass": false (false for theory exams like MTE/ETE, true for practicals / continuous assessments)
   }
8. Non-Instructional Days: array of { "date": "YYYY-MM-DD", "name": "Sports Fest / Tech Day" }

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "semester": "Semester VI",
  "academicYear": "2026-27",
  "startDate": "2027-01-18",
  "endDate": "2027-05-28",
  "weekends": [0, 6],
  "holidays": [
    { "date": "2027-01-26", "name": "Republic Day" }
  ],
  "examinations": [
    {
      "id": "mte-2027",
      "name": "Mid-Term Examinations (MTE)",
      "startDate": "2027-03-15",
      "endDate": "2027-03-20",
      "countsAsClass": false
    }
  ],
  "nonInstructionalDays": [
    { "date": "2027-02-28", "name": "Annual Sports Meet" }
  ],
  "summary": "Extracted 6 holidays and 3 examination periods"
}`;

/**
 * Extract academic calendar events from an image (circular photo, chart screenshot) or PDF document using Claude
 */
export async function analyzeCalendarImageWithClaude(base64Data, mimeType = "image/jpeg", apiKey = "") {
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const cleanMime = (mimeType || "image/jpeg").split(";")[0].trim();
  const isPdf = cleanMime === "application/pdf";

  const contentBlock = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: cleanBase64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: cleanMime,
          data: cleanBase64,
        },
      };

  const messages = [
    {
      role: "user",
      content: [
        contentBlock,
        {
          type: "text",
          text: isPdf
            ? "Extract all academic calendar information (semester dates, holidays, exams, non-instructional days) from this academic calendar PDF document into structured JSON according to the instructions."
            : "Extract all academic calendar information (semester dates, holidays, exams, non-instructional days) from this circular image into structured JSON according to the instructions.",
        },
      ],
    },
  ];

  const response = await callClaudeApi({
    messages,
    system: CALENDAR_SYSTEM_PROMPT,
    apiKey,
    preferredModel: "claude-3-5-sonnet-20241022",
  });

  const parsed = extractJsonFromAiResponse(response.text);
  return sanitizeExtractedCalendar(parsed);
}

export const analyzeCalendarDocumentWithClaude = analyzeCalendarImageWithClaude;

/**
 * Extract academic calendar events from pasted circular text or syllabus notes using Claude
 */
export async function analyzeCalendarTextWithClaude(text, apiKey = "") {
  const messages = [
    {
      role: "user",
      content: `Extract all academic calendar information (semester dates, holidays, exams, non-instructional days) from this text:\n\n${text}`,
    },
  ];

  const response = await callClaudeApi({
    messages,
    system: CALENDAR_SYSTEM_PROMPT,
    apiKey,
    preferredModel: "claude-3-5-sonnet-20241022",
  });

  const parsed = extractJsonFromAiResponse(response.text);
  return sanitizeExtractedCalendar(parsed);
}

/**
 * Sanitize and validate calendar output from AI
 */
export function sanitizeExtractedCalendar(raw) {
  if (!raw || typeof raw !== "object") return null;

  const holidays = Array.isArray(raw.holidays)
    ? raw.holidays
        .filter((h) => h && h.date && h.name)
        .map((h) => ({
          date: String(h.date).trim(),
          name: String(h.name).trim(),
          type: "holiday",
        }))
    : [];

  const examinations = Array.isArray(raw.examinations)
    ? raw.examinations
        .filter((e) => e && (e.startDate || e.date) && e.name)
        .map((e, idx) => ({
          id: e.id || `exam-${idx}-${Date.now()}`,
          name: String(e.name).trim(),
          startDate: String(e.startDate || e.date).trim(),
          endDate: String(e.endDate || e.startDate || e.date).trim(),
          countsAsClass: Boolean(e.countsAsClass),
          type: "exam",
        }))
    : [];

  const nonInstructionalDays = Array.isArray(raw.nonInstructionalDays)
    ? raw.nonInstructionalDays
        .filter((n) => n && n.date && n.name)
        .map((n) => ({
          date: String(n.date).trim(),
          name: String(n.name).trim(),
          type: "non-instructional",
        }))
    : [];

  const weekends = Array.isArray(raw.weekends)
    ? raw.weekends.map(Number).filter((n) => !isNaN(n) && n >= 0 && n <= 6)
    : [0, 6];

  return {
    semester: raw.semester || "Extracted Semester",
    academicYear: raw.academicYear || "2026-27",
    startDate: raw.startDate || null,
    endDate: raw.endDate || null,
    weekends,
    holidays,
    examinations,
    nonInstructionalDays,
    summary: raw.summary || `Extracted ${holidays.length} holidays, ${examinations.length} exam periods`,
  };
}
