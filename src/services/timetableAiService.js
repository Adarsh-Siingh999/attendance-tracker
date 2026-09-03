/**
 * Timetable AI Vision & Extraction Agent Service
 * 
 * Capabilities:
 * 1. Analyzes photos/screenshots of academic timetables using Google Gemini Vision API.
 * 2. Detects day(s) of week (single day or full weekly grid) and extracts times, subjects, codes, types, and rooms.
 * 3. Provides built-in smart presets and heuristic text parsing so new users can test instantly even without an API key.
 * 4. Generates missing subject records with zero attendance to configure a new user's entire account in one click!
 */

const STORAGE_API_KEY = "at_saas_gemini_api_key";

export const DAY_MAP = {
  sunday: 0, sun: 0, 0: 0,
  monday: 1, mon: 1, 1: 1,
  tuesday: 2, tue: 2, 2: 2,
  wednesday: 3, wed: 3, 3: 3,
  thursday: 4, thu: 4, 4: 4,
  friday: 5, fri: 5, 5: 5,
  saturday: 6, sat: 6, 6: 6,
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SUBJECT_COLORS = [
  "#2563eb", // Blue
  "#7c3aed", // Violet
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Red
  "#0891b2", // Cyan
  "#4b5563", // Slate
  "#db2777", // Pink
  "#4f46e5", // Indigo
  "#0d9488", // Teal
];

/**
 * Get stored Gemini API key from localStorage
 */
export function getStoredApiKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_API_KEY) || "";
}

/**
 * Save Gemini API key to localStorage
 */
export function saveStoredApiKey(apiKey) {
  if (typeof window === "undefined") return;
  if (!apiKey) {
    localStorage.removeItem(STORAGE_API_KEY);
  } else {
    localStorage.setItem(STORAGE_API_KEY, apiKey.trim());
  }
}

/**
 * Clean & normalize JSON text from LLM response
 */
function extractJsonFromResponse(rawText) {
  let text = rawText.trim();
  // Remove markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(text);
}

/**
 * Standardize time string into HH:MM (24-hour format)
 */
export function normalizeTime(rawTime) {
  if (!rawTime) return "09:00";
  const s = rawTime.trim().toLowerCase();

  // Check 12-hour AM/PM format, e.g. "01:45 PM", "9:00am"
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? ampmMatch[2].padStart(2, "0") : "00";
    const period = ampmMatch[3];
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // Check 24-hour format "08:30" or "8:30"
  const stdMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (stdMatch) {
    const hours = stdMatch[1].padStart(2, "0");
    const minutes = stdMatch[2];
    return `${hours}:${minutes}`;
  }

  return "09:00";
}

/**
 * Call Gemini Vision API with base64 image data
 */
export async function analyzeTimetableImageWithGemini(base64Data, mimeType = "image/jpeg", apiKey = "") {
  const key = apiKey || getStoredApiKey();
  if (!key) {
    throw new Error("No Gemini API key provided. Please configure your key or use a built-in sample.");
  }

  const prompt = `You are an expert academic timetable extraction assistant.
Analyze this image of a university / college class schedule or timetable.
The image might display:
- A single day schedule (e.g. Tuesday)
- A multi-day table (e.g. Monday to Friday/Saturday)
- An official department timetable notice or portal screenshot

Carefully detect:
1. Which day(s) of the week the classes are for (Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6).
2. For each day, all consecutive class periods sorted chronologically.
3. For each period:
   - start: start time in 24h HH:MM (e.g. "08:30", "13:45")
   - end: end time in 24h HH:MM (e.g. "09:20", "14:35")
   - subject: title of the subject/course (e.g. "Problem-Driven Programming", "Machine Learning")
   - code: course code if visible (e.g. "R1UC544B", "CS301", or "")
   - type: component type ("Lecture", "Lab", "Practical", "PP", "PR", "Tutorial")
   - room: room number or lab name (e.g. "Room 401", "Lab 2", "Audi B", or "")

Return ONLY a valid JSON object matching this exact structure:
{
  "detectedDays": [
    {
      "dayIndex": 2,
      "dayName": "Tuesday",
      "classes": [
        {
          "start": "08:30",
          "end": "09:20",
          "subject": "Programming Skills with Advanced Data Structures",
          "code": "R1UC543L",
          "type": "PR",
          "room": "Lab 3"
        }
      ]
    }
  ],
  "confidence": "high",
  "summary": "Extracted 8 periods for Tuesday"
}`;

  // Strip prefix like "data:image/jpeg;base64," if present
  const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    },
  };

  // Try Gemini 2.0 Flash first, fallback to Gemini 1.5 Flash
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini returned an empty response");
      }

      const parsed = extractJsonFromResponse(rawText);
      return sanitizeDetectedDays(parsed);
    } catch (err) {
      lastError = err;
      // Try next model if applicable
    }
  }

  throw lastError || new Error("Failed to extract timetable with Gemini Vision");
}

/**
 * Sanitize and validate detected days structure
 */
function sanitizeDetectedDays(rawResult) {
  const days = Array.isArray(rawResult?.detectedDays) ? rawResult.detectedDays : [];
  const cleanDays = [];

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

    // Sort chronologically
    cleanClasses.sort((a, b) => a.start.localeCompare(b.start));

    cleanDays.push({
      dayIndex: dayIdx,
      dayName,
      classes: cleanClasses,
    });
  }

  return {
    detectedDays: cleanDays,
    confidence: rawResult?.confidence || "high",
    summary: rawResult?.summary || `Extracted schedule across ${cleanDays.length} day(s)`,
  };
}

/**
 * High-quality preset samples (especially Galgotias University Sem V)
 * Enables immediate one-click testing without requiring an API key.
 */
export const SAMPLE_PRESETS = [
  {
    id: "galgotias-tue",
    title: "Galgotias Univ: Tuesday Schedule",
    desc: "8 periods — Programming Lab (3 periods), ML, System Design, Predictive Analysis & PDP",
    previewDays: [
      {
        dayIndex: 2,
        dayName: "Tuesday",
        classes: [
          { start: "08:30", end: "09:20", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "09:20", end: "10:10", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "10:15", end: "11:05", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "11:05", end: "11:55", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
          { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
          { start: "13:45", end: "14:35", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
          { start: "14:35", end: "15:25", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
          { start: "15:30", end: "16:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
        ],
      },
    ],
  },
  {
    id: "galgotias-wed",
    title: "Galgotias Univ: Wednesday Schedule",
    desc: "8 periods — Soft Skills, PDP (Theory + Lab), System Design, Soft Computing",
    previewDays: [
      {
        dayIndex: 3,
        dayName: "Wednesday",
        classes: [
          { start: "08:30", end: "09:20", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "09:20", end: "10:10", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "10:15", end: "11:05", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "11:05", end: "11:55", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
          { start: "13:45", end: "14:35", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
          { start: "14:35", end: "15:25", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
          { start: "15:30", end: "16:20", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
        ],
      },
    ],
  },
  {
    id: "galgotias-full-week",
    title: "Galgotias Univ: Full Weekly Schedule (Tue - Sat)",
    desc: "Complete 5-day academic routine — 37 total periods auto-configured across all subjects",
    previewDays: [
      {
        dayIndex: 2,
        dayName: "Tuesday",
        classes: [
          { start: "08:30", end: "09:20", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "09:20", end: "10:10", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "10:15", end: "11:05", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
          { start: "11:05", end: "11:55", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
          { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
          { start: "13:45", end: "14:35", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
          { start: "14:35", end: "15:25", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
          { start: "15:30", end: "16:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
        ],
      },
      {
        dayIndex: 3,
        dayName: "Wednesday",
        classes: [
          { start: "08:30", end: "09:20", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "09:20", end: "10:10", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "10:15", end: "11:05", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "11:05", end: "11:55", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
          { start: "13:45", end: "14:35", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
          { start: "14:35", end: "15:25", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
          { start: "15:30", end: "16:20", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
        ],
      },
      {
        dayIndex: 4,
        dayName: "Thursday",
        classes: [
          { start: "08:30", end: "09:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "09:20", end: "10:10", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "10:15", end: "11:05", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "11:05", end: "11:55", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "12:00", end: "12:50", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "12:50", end: "13:40", subject: "System Design", code: "R1UC515T", type: "PR", room: "Lab 1" },
          { start: "14:35", end: "15:25", subject: "Machine Learning", code: "R1UC525B", type: "PR", room: "Lab 4" },
          { start: "15:30", end: "16:20", subject: "Machine Learning", code: "R1UC525B", type: "PR", room: "Lab 4" },
        ],
      },
      {
        dayIndex: 5,
        dayName: "Friday",
        classes: [
          { start: "09:20", end: "10:10", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
          { start: "10:15", end: "11:05", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
          { start: "11:05", end: "11:55", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
          { start: "12:50", end: "13:40", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
          { start: "13:45", end: "14:35", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
          { start: "14:35", end: "15:25", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
          { start: "15:30", end: "16:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
        ],
      },
      {
        dayIndex: 6,
        dayName: "Saturday",
        classes: [
          { start: "09:20", end: "10:10", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
          { start: "10:15", end: "11:05", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PR", room: "Lab 3" },
          { start: "11:05", end: "11:55", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PR", room: "Lab 3" },
          { start: "12:50", end: "13:40", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "13:45", end: "14:35", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "14:35", end: "15:25", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
          { start: "15:30", end: "16:20", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
        ],
      },
    ],
  },
  {
    id: "standard-mon-fri",
    title: "Standard 5-Day Schedule (Mon - Fri)",
    desc: "4 core subjects per day across Monday to Friday (Engineering / CS curriculum)",
    previewDays: [
      {
        dayIndex: 1,
        dayName: "Monday",
        classes: [
          { start: "09:00", end: "10:00", subject: "Data Structures & Algorithms", code: "CS201", type: "Lecture", room: "LT-1" },
          { start: "10:00", end: "11:00", subject: "Database Management Systems", code: "CS202", type: "Lecture", room: "LT-1" },
          { start: "11:15", end: "13:15", subject: "Data Structures Lab", code: "CS201L", type: "Lab", room: "Computing Lab A" },
          { start: "14:00", end: "15:00", subject: "Computer Networks", code: "CS203", type: "Lecture", room: "LT-2" },
        ],
      },
      {
        dayIndex: 2,
        dayName: "Tuesday",
        classes: [
          { start: "09:00", end: "10:00", subject: "Operating Systems", code: "CS204", type: "Lecture", room: "LT-1" },
          { start: "10:00", end: "11:00", subject: "Computer Networks", code: "CS203", type: "Lecture", room: "LT-1" },
          { start: "11:15", end: "12:15", subject: "Database Management Systems", code: "CS202", type: "Lecture", room: "LT-2" },
          { start: "13:30", end: "15:30", subject: "Database Lab", code: "CS202L", type: "Lab", room: "DB Lab 1" },
        ],
      },
      {
        dayIndex: 3,
        dayName: "Wednesday",
        classes: [
          { start: "09:00", end: "10:00", subject: "Data Structures & Algorithms", code: "CS201", type: "Lecture", room: "LT-1" },
          { start: "10:00", end: "11:00", subject: "Operating Systems", code: "CS204", type: "Lecture", room: "LT-1" },
          { start: "11:15", end: "13:15", subject: "Operating Systems Lab", code: "CS204L", type: "Lab", room: "OS Lab" },
          { start: "14:00", end: "15:00", subject: "Technical Communication", code: "HU101", type: "Tutorial", room: "Seminar Hall" },
        ],
      },
      {
        dayIndex: 4,
        dayName: "Thursday",
        classes: [
          { start: "09:00", end: "10:00", subject: "Computer Networks", code: "CS203", type: "Lecture", room: "LT-1" },
          { start: "10:00", end: "11:00", subject: "Database Management Systems", code: "CS202", type: "Lecture", room: "LT-1" },
          { start: "11:15", end: "13:15", subject: "Networks Lab", code: "CS203L", type: "Lab", room: "Networks Lab" },
          { start: "14:00", end: "15:00", subject: "Data Structures & Algorithms", code: "CS201", type: "Lecture", room: "LT-2" },
        ],
      },
      {
        dayIndex: 5,
        dayName: "Friday",
        classes: [
          { start: "09:00", end: "10:00", subject: "Operating Systems", code: "CS204", type: "Lecture", room: "LT-1" },
          { start: "10:00", end: "11:00", subject: "Mathematics for Computing", code: "MA201", type: "Lecture", room: "LT-1" },
          { start: "11:15", end: "12:15", subject: "Mathematics for Computing", code: "MA201", type: "Lecture", room: "LT-1" },
          { start: "13:30", end: "15:30", subject: "Project & Seminar", code: "CS205", type: "Practical", room: "Seminar Hall" },
        ],
      },
    ],
  },
];

/**
 * Heuristic text / OCR parser for timetables
 * Takes raw copy-pasted timetable text (e.g. from university portal or PDF OCR)
 */
export function extractTimetableFromText(text) {
  if (!text || !text.trim()) return { detectedDays: [] };

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let currentDayIdx = 1; // Default to Monday
  const dayBuckets = {};

  const DAY_REGEX = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;
  const TIME_REGEX = /(\d{1,2}:\d{2})\s*(?:to|-|–|—)\s*(\d{1,2}:\d{2})/i;

  for (const line of lines) {
    // Check if line indicates a day
    const dayMatch = line.match(DAY_REGEX);
    if (dayMatch && !line.match(TIME_REGEX)) {
      const dName = dayMatch[1].toLowerCase();
      if (DAY_MAP[dName] !== undefined) {
        currentDayIdx = DAY_MAP[dName];
        if (!dayBuckets[currentDayIdx]) {
          dayBuckets[currentDayIdx] = [];
        }
        continue;
      }
    }

    // Check for pipe-separated or tab-separated structured line
    if (line.includes("|") || line.includes("\t")) {
      const parts = line.split(/[|\t]+/).map((p) => p.trim()).filter(Boolean);
      const timePartIdx = parts.findIndex((p) => p.match(TIME_REGEX));
      if (timePartIdx >= 0) {
        if (!dayBuckets[currentDayIdx]) dayBuckets[currentDayIdx] = [];
        const timeMatch = parts[timePartIdx].match(TIME_REGEX);
        const start = normalizeTime(timeMatch[1]);
        const end = normalizeTime(timeMatch[2]);

        const otherParts = parts.filter((_, i) => i !== timePartIdx);
        let subject = "";
        let code = "";
        let type = "Lecture";
        let room = "";

        for (const part of otherParts) {
          if (/^(pr|lab|practical)$/i.test(part)) {
            type = "PR";
          } else if (/^(pp|theory|lecture)$/i.test(part)) {
            type = "PP";
          } else if (/^(tutorial|tut)$/i.test(part)) {
            type = "Tutorial";
          } else if (/^(room\s*\d+|lab\s*\d+|audi\s*[a-z0-9]+|lt-?\d+)$/i.test(part)) {
            room = part;
          } else if (/^[A-Z0-9]{5,10}$/i.test(part) && /\d/.test(part)) {
            code = part.toUpperCase();
          } else if (!subject) {
            subject = part;
          } else if (!code && /^[A-Z0-9_-]{4,10}$/i.test(part) && /\d/.test(part)) {
            code = part.toUpperCase();
          } else if (!room) {
            room = part;
          }
        }

        if (!subject) subject = code ? `Course ${code}` : "Scheduled Class";

        dayBuckets[currentDayIdx].push({
          start,
          end,
          subject,
          code,
          type,
          room,
        });
        continue;
      }
    }

    // Check for free-form class period with time
    const timeMatch = line.match(TIME_REGEX);
    if (timeMatch) {
      if (!dayBuckets[currentDayIdx]) dayBuckets[currentDayIdx] = [];

      const start = normalizeTime(timeMatch[1]);
      const end = normalizeTime(timeMatch[2]);
      let remainder = line.replace(timeMatch[0], "").replace(/[|,\t]+/g, " ").trim();

      // Look for course code like R1UC544B or CS201 (requires at least one digit)
      let code = "";
      const codeMatch = remainder.match(/\b([A-Z]{1,5}\d[A-Z0-9]{1,8}|\d{1,4}[A-Z]{1,5}\d{0,4})\b/i);
      if (codeMatch) {
        code = codeMatch[1].trim().toUpperCase();
        remainder = remainder.replace(codeMatch[0], "").trim();
      }

      // Look for type
      let type = "Lecture";
      if (/\b(lab|practical|pr)\b/i.test(remainder)) type = "PR";
      else if (/\b(theory|lecture|pp)\b/i.test(remainder)) type = "PP";
      else if (/\b(tutorial|tut)\b/i.test(remainder)) type = "Tutorial";

      // Look for room
      let room = "";
      const roomMatch = remainder.match(/\b(room\s*\d+|lab\s*\d+|audi\s*[a-z0-9]+|lt-?\d+)\b/i);
      if (roomMatch) {
        room = roomMatch[1].trim();
        remainder = remainder.replace(roomMatch[0], "").trim();
      }

      // Clean subject
      let subject = remainder
        .replace(/\b(lecture|lab|practical|pp|pr|tutorial)\b/gi, "")
        .replace(/[-–—|:]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!subject || subject.length < 2) {
        subject = code ? `Course ${code}` : "Scheduled Class";
      }

      dayBuckets[currentDayIdx].push({
        start,
        end,
        subject,
        code,
        type,
        room,
      });
    }
  }

  const detectedDays = Object.keys(dayBuckets).map((idxStr) => {
    const idx = parseInt(idxStr, 10);
    const classes = dayBuckets[idx];
    classes.sort((a, b) => a.start.localeCompare(b.start));
    return {
      dayIndex: idx,
      dayName: DAY_NAMES[idx],
      classes,
    };
  });

  return {
    detectedDays,
    confidence: detectedDays.length > 0 ? "medium" : "low",
    summary: `Extracted timetable across ${detectedDays.length} day(s) from text`,
  };
}

/**
 * Automatically reconciles and generates new subject records for missing subjects.
 * For new users, this auto-populates their entire Subjects list!
 */
export function generateSubjectsFromExtractedClasses(detectedDays, existingSubjects = []) {
  const newSubjectsToCreate = [];
  const existingNames = new Set(existingSubjects.map((s) => s.name?.toLowerCase().trim()));
  const existingCodes = new Set(existingSubjects.map((s) => s.code?.toLowerCase().trim()).filter(Boolean));

  let colorIdx = existingSubjects.length % SUBJECT_COLORS.length;

  for (const day of detectedDays) {
    for (const cls of day.classes) {
      const sName = cls.subject.trim();
      const sCode = cls.code?.trim() || "";
      const lowerName = sName.toLowerCase();
      const lowerCode = sCode.toLowerCase();

      // Check if already in existing subjects or already staged for creation
      const alreadyExists =
        existingNames.has(lowerName) ||
        (sCode && existingCodes.has(lowerCode)) ||
        newSubjectsToCreate.some(
          (ns) => ns.name.toLowerCase() === lowerName || (sCode && ns.code?.toLowerCase() === lowerCode)
        );

      if (!alreadyExists && sName.length > 1) {
        // Determine component types found in timetable
        const isLab = cls.type === "PR" || cls.type.toLowerCase().includes("lab");
        const components = {};

        if (cls.type === "PP" || cls.type === "PR") {
          components.PP = { attended: 0, conducted: 0 };
          components.PR = { attended: 0, conducted: 0 };
        } else if (isLab) {
          components.Lab = { attended: 0, conducted: 0 };
          components.Lecture = { attended: 0, conducted: 0 };
        } else {
          components.Lecture = { attended: 0, conducted: 0 };
        }

        const newSubj = {
          name: sName,
          code: sCode,
          credits: isLab ? 4 : 3,
          color: SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length],
          components,
        };

        newSubjectsToCreate.push(newSubj);
        colorIdx++;
      }
    }
  }

  return newSubjectsToCreate;
}
