import { academicCalendar as defaultCalendar } from "../data/academicCalendar.js";
import { semesterTimetable as defaultTimetable, timetableVersions } from "../data/timetableData.js";

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

/**
 * Resolves the timetable for a given date, supporting both versioned
 * timetables ({ current, versions: [...] }) and flat timetables.
 */
export function getTimetableForDate(dateString, customTimetable = null) {
  if (customTimetable) {
    // If versioned timetable structure
    if (customTimetable.versions && Array.isArray(customTimetable.versions)) {
      const matching = customTimetable.versions
        .filter((v) => !v.effectiveFrom || dateString >= v.effectiveFrom)
        .filter((v) => !v.effectiveTo || dateString <= v.effectiveTo)
        .sort((a, b) => (b.effectiveFrom || "").localeCompare(a.effectiveFrom || ""));

      if (matching.length > 0) {
        return matching[0].timetable;
      }
      return customTimetable.current || {};
    }

    if (Object.keys(customTimetable).length > 0) {
      return customTimetable;
    }
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

export function isNonInstructionalDay(dateString, nonInstructionalDays = null) {
  const activeList = nonInstructionalDays || [];
  return activeList.includes(dateString);
}

/**
 * Resolves scheduled classes for a given date.
 */
export function getClassesForDate(dateString, options = {}) {
  const {
    calendar = null,
    timetable = null,
    ignoreSemesterRange = false,
  } = options;

  if (!ignoreSemesterRange && !isSemesterActive(dateString, calendar)) {
    return [];
  }

  const holiday = getHoliday(dateString, calendar?.holidays);
  if (holiday) {
    return [];
  }

  if (isNonInstructionalDay(dateString, calendar?.nonInstructionalDays)) {
    return [];
  }

  const exam = getExamForDate(dateString, calendar?.examinations);
  if (exam && !exam.countsAsClass) {
    return [];
  }

  if (isWeekend(dateString, calendar?.weekends)) {
    return [];
  }

  const activeTimetable = getTimetableForDate(dateString, timetable);
  const dayOfWeek = getDayOfWeek(dateString);

  return (activeTimetable && activeTimetable[dayOfWeek]) ? [...activeTimetable[dayOfWeek]] : [];
}

/**
 * AI Semester Schedule Generator:
 * Takes a 1-week weekly timetable and repeats it across every instructional week
 * of the full semester calendar, skipping holidays, weekends, non-instructional days,
 * and accounting for exam periods.
 */
export function generateSemesterScheduleFromTimetable({
  startDate,
  endDate,
  weekends = [0, 6],
  holidays = [],
  examinations = {},
  nonInstructionalDays = [],
  weeklyTimetable = {},
}) {
  if (!startDate || !endDate || startDate > endDate) {
    return { totalDays: 0, instructionalDays: 0, totalClasses: 0, classList: [], subjectBreakdown: {} };
  }

  const calendarConfig = {
    startDate,
    endDate,
    weekends,
    holidays,
    examinations,
    nonInstructionalDays,
  };

  const classList = [];
  const subjectBreakdown = {};
  let totalDays = 0;
  let instructionalDays = 0;

  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    totalDays++;
    const dateStr = formatDate(current);
    const dayClasses = getClassesForDate(dateStr, {
      calendar: calendarConfig,
      timetable: weeklyTimetable,
    });

    if (dayClasses.length > 0) {
      instructionalDays++;
      for (const cls of dayClasses) {
        const item = { date: dateStr, ...cls };
        classList.push(item);
        const codeKey = cls.code || cls.subject;
        subjectBreakdown[codeKey] = (subjectBreakdown[codeKey] || 0) + 1;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalDays,
    instructionalDays,
    totalClasses: classList.length,
    classList,
    subjectBreakdown,
  };
}

export function formatAcademicDate(dateString) {
  const date = parseDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}