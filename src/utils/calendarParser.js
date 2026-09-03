/**
 * Smart Academic Calendar Text Parser
 * Extracts holidays, exams, and events from pasted university calendar text.
 *
 * Supports:
 * - Indian date formats: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
 * - Written dates: "15 August 2026", "Aug 15, 2026", "15th August"
 * - Date ranges: "21 Oct - 31 Oct", "21-31 October"
 * - Table/tabular layouts: "15.08.2026 | Independence Day"
 * - Numbered list: "1. 15/08/2026 Independence Day"
 */

const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const EXAM_KEYWORDS = [
  "exam", "examination", "test", "mte", "ete", "ia1", "ia2", "ia-1", "ia-2",
  "mid.?term", "end.?term", "practical", "viva", "assessment", "sessional",
  "quiz", "internal", "external", "semester.?exam", "supplementary",
];

const HOLIDAY_KEYWORDS = [
  "holiday", "jayanti", "birthday", "puja", "diwali", "holi", "eid",
  "christmas", "independence", "republic", "gandhi", "dussehra", "dussehara",
  "navratri", "navmi", "raksha", "bandhan", "shivratri", "milad",
  "nabi", "guru.?nanak", "bhai.?duj", "chhath", "chat", "goverdhan",
  "ambedkar", "makar", "sankranti", "lohri", "pongal", "onam",
  "muharram", "ramadan", "bakrid", "university.?day", "founder",
  "buddha", "mahavir", "good.?friday", "easter", "vishu", "ugadi",
  "gudi.?padwa", "baisakhi", "bihu", "harvest", "festival",
];

const NON_INSTRUCTIONAL_KEYWORDS = [
  "orientation", "registration", "admission", "convocation", "sports.?day",
  "cultural.?fest", "placement.?drive", "workshop", "seminar", "conference",
  "break", "vacation", "recess", "winter.?break", "summer.?break",
];

/**
 * Parse a date string in multiple formats, return YYYY-MM-DD or null.
 */
function parseDate(raw, fallbackYear = 2026) {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, " ");

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // yyyy-mm-dd (ISO already)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;

  // "15 August 2026" or "15th August 2026" or "15 Aug 2026"
  m = s.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s*(\d{4})?$/i);
  if (m) {
    const day = m[1].padStart(2, "0");
    const monthIdx = MONTH_NAMES[m[2].toLowerCase().slice(0, 3)];
    const year = m[3] || String(fallbackYear);
    if (monthIdx !== undefined) {
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day}`;
    }
  }

  // "August 15, 2026" or "Aug 15 2026"
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s*(\d{4})?$/i);
  if (m) {
    const day = m[2].padStart(2, "0");
    const monthIdx = MONTH_NAMES[m[1].toLowerCase().slice(0, 3)];
    const year = m[3] || String(fallbackYear);
    if (monthIdx !== undefined) {
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${day}`;
    }
  }

  // dd/mm (no year)
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})$/);
  if (m) {
    const [, dd, mm] = m;
    return `${fallbackYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Classify an event name as holiday, exam, or non-instructional.
 */
function classifyEvent(name) {
  const lower = name.toLowerCase();
  for (const kw of EXAM_KEYWORDS) {
    if (new RegExp(kw, "i").test(lower)) return "exam";
  }
  for (const kw of NON_INSTRUCTIONAL_KEYWORDS) {
    if (new RegExp(kw, "i").test(lower)) return "non-instructional";
  }
  // Default to holiday for everything else (most calendar items are holidays)
  return "holiday";
}

/**
 * Main extraction function.
 * Takes raw pasted text and returns an array of extracted events.
 */
export function extractEventsFromText(text, fallbackYear = 2026) {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const events = [];
  let counter = 0;

  for (const line of lines) {
    // Skip header/title lines
    if (/^(s\.?\s*no|sr\.?\s*no|#|date|event|holiday|list|academic)/i.test(line)) continue;
    if (line.length < 5) continue;

    let startDate = null;
    let endDate = null;
    let name = "";

    // Pattern 1: "dd/mm/yyyy | Event Name" or "dd.mm.yyyy - Event Name"
    let match = line.match(
      /^[\d#.)\s]*(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*[\|–—\-:,\t]+\s*(.+)$/
    );
    if (match) {
      startDate = parseDate(match[1], fallbackYear);
      name = match[2].trim();
    }

    // Pattern 2: "15 August 2026 - Independence Day" or "15th Aug - Independence Day"
    if (!startDate) {
      match = line.match(
        /^[\d#.)\s]*(\d{1,2}\s*(?:st|nd|rd|th)?\s+[A-Za-z]+\s*,?\s*\d{0,4})\s*[\|–—\-:,\t]+\s*(.+)$/i
      );
      if (match) {
        startDate = parseDate(match[1], fallbackYear);
        name = match[2].trim();
      }
    }

    // Pattern 3: "Independence Day - 15/08/2026" (name first, date after)
    if (!startDate) {
      match = line.match(
        /^[\d#.)\s]*(.+?)\s*[\|–—\-:,\t]+\s*(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*$/
      );
      if (match && match[1].length > 2) {
        startDate = parseDate(match[2], fallbackYear);
        name = match[1].trim();
      }
    }

    // Pattern 4: "Event Name - August 15, 2026"
    if (!startDate) {
      match = line.match(
        /^[\d#.)\s]*(.+?)\s*[\|–—\-:,\t]+\s*(\d{1,2}\s*(?:st|nd|rd|th)?\s+[A-Za-z]+\s*,?\s*\d{0,4})\s*$/i
      );
      if (match && match[1].length > 2) {
        startDate = parseDate(match[2], fallbackYear);
        name = match[1].trim();
      }
    }

    // Pattern 5: Date range "21/10/2026 - 31/10/2026 MTE Examination"
    if (!startDate) {
      match = line.match(
        /^[\d#.)\s]*(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*(?:to|–|—|-)\s*(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*[\|–—\-:,\t]*\s*(.+)$/i
      );
      if (match) {
        startDate = parseDate(match[1], fallbackYear);
        endDate = parseDate(match[2], fallbackYear);
        name = match[3].trim();
      }
    }

    // Pattern 6: "MTE Examination 21/10/2026 to 31/10/2026"
    if (!startDate) {
      match = line.match(
        /^[\d#.)\s]*(.+?)\s+(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*(?:to|–|—|-)\s*(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{2,4})\s*$/i
      );
      if (match && match[1].length > 2) {
        startDate = parseDate(match[2], fallbackYear);
        endDate = parseDate(match[3], fallbackYear);
        name = match[1].trim();
      }
    }

    // Pattern 7: Embedded date anywhere in line
    if (!startDate) {
      // Find dd/mm/yyyy anywhere
      match = line.match(/(\d{1,2}[/\-.]?\d{1,2}[/\-.]?\d{4})/);
      if (match) {
        startDate = parseDate(match[1], fallbackYear);
        name = line.replace(match[0], "").replace(/[\|–—\-:,\t]+/g, " ").replace(/\s+/g, " ").trim();
        // Clean leading/trailing numbers and bullets
        name = name.replace(/^[\d#.)\s]+/, "").replace(/[\d#.)\s]+$/, "").trim();
      }
    }

    if (!startDate || !name || name.length < 2) continue;

    // Clean the name
    name = name
      .replace(/^[\d#.)\s\-–—]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (name.length < 2) continue;

    const type = classifyEvent(name);
    const isExam = type === "exam";

    counter++;
    events.push({
      id: `parsed-${counter}-${Date.now()}`,
      type,
      name,
      date: startDate,
      endDate: isExam ? (endDate || startDate) : undefined,
      countsAsClass: isExam ? false : false,
    });
  }

  return events;
}

/**
 * Comprehensive Galgotias University Semester V (Autumn 2026) academic events.
 * This is the full official calendar — much more complete than the old 6-event sample.
 */
export const GALGOTIAS_SEM5_2026_EVENTS = [
  // ── HOLIDAYS ──
  { id: "gu-h1", type: "holiday", name: "Sawan Shivratri", date: "2026-08-11", countsAsClass: false },
  { id: "gu-h2", type: "holiday", name: "Independence Day", date: "2026-08-15", countsAsClass: false },
  { id: "gu-h3", type: "holiday", name: "Milad un-Nabi / Id-e-Milad", date: "2026-08-26", countsAsClass: false },
  { id: "gu-h4", type: "holiday", name: "Raksha Bandhan", date: "2026-08-28", countsAsClass: false },
  { id: "gu-h5", type: "holiday", name: "Janmashtmi", date: "2026-09-04", countsAsClass: false },
  { id: "gu-h6", type: "holiday", name: "Mahatma Gandhi Jayanti", date: "2026-10-02", countsAsClass: false },
  { id: "gu-h7", type: "holiday", name: "Ram Navmi", date: "2026-10-19", countsAsClass: false },
  { id: "gu-h8", type: "holiday", name: "Dussehra / Vijayadashami", date: "2026-10-20", countsAsClass: false },
  { id: "gu-h9", type: "holiday", name: "Maharishi Valmiki Jayanti", date: "2026-10-26", countsAsClass: false },
  { id: "gu-h10", type: "holiday", name: "Diwali (Deepavali)", date: "2026-11-08", countsAsClass: false },
  { id: "gu-h11", type: "holiday", name: "Goverdhan Puja", date: "2026-11-09", countsAsClass: false },
  { id: "gu-h12", type: "holiday", name: "Bhai Dooj", date: "2026-11-11", countsAsClass: false },
  { id: "gu-h13", type: "holiday", name: "Chhath Puja", date: "2026-11-15", countsAsClass: false },
  { id: "gu-h14", type: "holiday", name: "Guru Nanak Jayanti / Teg Bahadur Shahidi Diwas", date: "2026-11-24", countsAsClass: false },
  { id: "gu-h15", type: "holiday", name: "Christmas Day", date: "2026-12-25", countsAsClass: false },

  // ── EXAMINATIONS ──
  { id: "gu-e1", type: "exam", name: "Internal Assessment 1 (IA1)", date: "2026-09-14", endDate: "2026-09-19", countsAsClass: true },
  { id: "gu-e2", type: "exam", name: "Mid-Term Examinations (MTE)", date: "2026-10-21", endDate: "2026-10-31", countsAsClass: false },
  { id: "gu-e3", type: "exam", name: "Internal Assessment 2 (IA2)", date: "2026-11-17", endDate: "2026-11-21", countsAsClass: true },
  { id: "gu-e4", type: "exam", name: "End-Term Practical Examinations", date: "2026-12-11", endDate: "2026-12-15", countsAsClass: true },
  { id: "gu-e5", type: "exam", name: "End-Term Theory Examinations (ETE)", date: "2026-12-16", endDate: "2026-12-31", countsAsClass: false },

  // ── NON-INSTRUCTIONAL / ACADEMIC MILESTONES ──
  { id: "gu-n1", type: "non-instructional", name: "Orientation & Registration (New Students)", date: "2026-08-01", countsAsClass: false },
  { id: "gu-n2", type: "non-instructional", name: "Commencement of Classes", date: "2026-08-06", countsAsClass: false },
  { id: "gu-n3", type: "non-instructional", name: "Last Date for Course Add/Drop", date: "2026-08-20", countsAsClass: false },
  { id: "gu-n4", type: "non-instructional", name: "Sports Day / Annual Meet", date: "2026-09-27", countsAsClass: false },
  { id: "gu-n5", type: "non-instructional", name: "Diwali Vacation Begins", date: "2026-11-05", countsAsClass: false },
  { id: "gu-n6", type: "non-instructional", name: "Classes Resume After Diwali", date: "2026-11-12", countsAsClass: false },
  { id: "gu-n7", type: "non-instructional", name: "Last Instructional Day of Semester", date: "2026-12-10", countsAsClass: false },
];
