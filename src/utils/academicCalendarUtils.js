import { academicCalendar as defaultCalendar } from "../data/academicCalendar.js";
import { semesterTimetable as defaultTimetable, timetableVersions } from "../data/timetableData.js";

const NON_INSTRUCTIONAL_STORAGE_KEY =
  "attendanceTrackerNonInstructionalDays";

const NON_INSTRUCTIONAL_UPDATED_EVENT =
  "nonInstructionalDaysUpdated";

export function parseDate(dateString) {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDayOfWeek(dateString) {
  return parseDate(dateString).getDay();
}

export function isWeekend(dateString, weekends = null) {
  const day = getDayOfWeek(dateString);
  const activeWeekends = weekends || defaultCalendar.weekends || [0, 1];
  return activeWeekends.includes(day);
}

export function getHoliday(dateString, holidays = null) {
  const activeHolidays = holidays || defaultCalendar.holidays || [];
  return activeHolidays.find(
    (holiday) => holiday.date === dateString
  );
}

export function isHoliday(dateString, holidays = null) {
  return Boolean(getHoliday(dateString, holidays));
}

export function isWithinRange(dateString, startDate, endDate) {
  return dateString >= startDate && dateString <= endDate;
}

export function getExamForDate(dateString, examinations = null) {
  const activeExams = examinations || defaultCalendar.examinations || {};

  for (const exam of Object.values(activeExams)) {
    if (isWithinRange(dateString, exam.startDate, exam.endDate)) {
      return exam;
    }
  }

  return null;
}

export function isSemesterActive(dateString, calendar = null) {
  const activeCal = calendar || defaultCalendar;
  if (activeCal.startDate && dateString < activeCal.startDate) {
    return false;
  }

  if (activeCal.endDate && dateString > activeCal.endDate) {
    return false;
  }

  return true;
}

export function getTimetableForDate(dateString, customTimetable = null) {
  if (customTimetable && Object.keys(customTimetable).length > 0) {
    return customTimetable;
  }

  const versions = (timetableVersions || [])
    .filter((version) => dateString >= version.effectiveFrom)
    .filter(
      (version) =>
        !version.effectiveTo || dateString <= version.effectiveTo
    )
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom)
    );

  if (versions.length > 0) {
    return versions[0].timetable;
  }

  return defaultTimetable;
}

export function loadNonInstructionalDays() {
  try {
    const stored = localStorage.getItem(
      NON_INSTRUCTIONAL_STORAGE_KEY
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isNonInstructionalDay(dateString, nonInstructionalList = null) {
  const activeList = nonInstructionalList || loadNonInstructionalDays();
  return activeList.includes(dateString);
}

export function setNonInstructionalDay(dateString, value) {
  try {
    const current = loadNonInstructionalDays();
    let updated;

    if (value) {
      updated = current.includes(dateString)
        ? current
        : [...current, dateString];
    } else {
      updated = current.filter(
        (date) => date !== dateString
      );
    }

    localStorage.setItem(
      NON_INSTRUCTIONAL_STORAGE_KEY,
      JSON.stringify(updated)
    );

    window.dispatchEvent(
      new CustomEvent(
        NON_INSTRUCTIONAL_UPDATED_EVENT,
        {
          detail: updated,
        }
      )
    );
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Resolves the classes for a given date considering holidays, exams, weekends,
 * non-instructional marks, and the active timetable schedule.
 */
export function getClassesForDate(dateString, options = {}) {
  const {
    calendar = defaultCalendar,
    timetable = null,
    ignoreSemesterRange = false,
  } = options;

  if (!ignoreSemesterRange && !isSemesterActive(dateString, calendar)) {
    return [];
  }

  const nonInst = calendar?.nonInstructionalDays || loadNonInstructionalDays();
  if (isNonInstructionalDay(dateString, nonInst)) {
    return [];
  }

  if (isWeekend(dateString, calendar?.weekends)) {
    return [];
  }

  if (isHoliday(dateString, calendar?.holidays)) {
    return [];
  }

  const exam = getExamForDate(dateString, calendar?.examinations);
  if (exam && !exam.countsAsClass) {
    return [];
  }

  const activeTimetable = getTimetableForDate(dateString, timetable);
  const dayOfWeek = getDayOfWeek(dateString);

  return activeTimetable[dayOfWeek] || [];
}

export function isInstructionalDay(dateString, options = {}) {
  return getClassesForDate(dateString, options).length > 0;
}

export function getDateRange(startDate, endDate) {
  const dates = [];
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}