import { academicCalendar } from "../data/academicCalendar";
import { semesterTimetable, timetableVersions } from "../data/timetableData";

const NON_INSTRUCTIONAL_STORAGE_KEY =
  "attendanceTrackerNonInstructionalDays";

const NON_INSTRUCTIONAL_UPDATED_EVENT =
  "nonInstructionalDaysUpdated";

export function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDayOfWeek(dateString) {
  return parseDate(dateString).getDay();
}

export function isWeekend(dateString) {
  const day = getDayOfWeek(dateString);

  return academicCalendar.weekends.includes(day);
}

export function getHoliday(dateString) {
  return academicCalendar.holidays.find(
    (holiday) => holiday.date === dateString
  );
}

export function isHoliday(dateString) {
  return Boolean(getHoliday(dateString));
}

export function isWithinRange(dateString, startDate, endDate) {
  return dateString >= startDate && dateString <= endDate;
}

export function getExamForDate(dateString) {
  const examinations = academicCalendar.examinations;

  for (const exam of Object.values(examinations)) {
    if (isWithinRange(dateString, exam.startDate, exam.endDate)) {
      return exam;
    }
  }

  return null;
}

export function isSemesterActive(dateString) {
  if (dateString < academicCalendar.startDate) {
    return false;
  }

  if (
    academicCalendar.endDate &&
    dateString > academicCalendar.endDate
  ) {
    return false;
  }

  return true;
}

export function getTimetableForDate(dateString) {
  const versions = timetableVersions
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

  return semesterTimetable;
}

function loadNonInstructionalDays() {
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

export function isNonInstructionalDay(dateString) {
  return loadNonInstructionalDays().includes(
    dateString
  );
}

export function setNonInstructionalDay(
  dateString,
  value
) {
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

export function getClassesForDate(dateString) {
  if (!isSemesterActive(dateString)) {
    return [];
  }

  if (isNonInstructionalDay(dateString)) {
    return [];
  }

  if (isWeekend(dateString)) {
    return [];
  }

  if (isHoliday(dateString)) {
    return [];
  }

  const exam = getExamForDate(dateString);

  if (exam && !exam.countsAsClass) {
    return [];
  }

  const timetable = getTimetableForDate(dateString);
  const dayOfWeek = getDayOfWeek(dateString);

  return timetable[dayOfWeek] || [];
}

export function isInstructionalDay(dateString) {
  return getClassesForDate(dateString).length > 0;
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