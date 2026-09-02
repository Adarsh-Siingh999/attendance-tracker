import {
  getClassesForDate as getAcademicClassesForDate,
} from "./academicCalendarUtils";

export function getClassesForDate(date) {
  return getAcademicClassesForDate(date);
}

export function getClassCountForDate(date) {
  return getClassesForDate(date).length;
}

export function getClassesBetweenDates(
  startDate,
  endDate
) {
  const classes = [];

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(
      current.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      current.getDate()
    ).padStart(2, "0");

    const date = `${year}-${month}-${day}`;

    const dayClasses = getClassesForDate(date);

    for (const classItem of dayClasses) {
      classes.push({
        date,
        ...classItem,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return classes;
}

export function getFutureClasses(
  startDate,
  endDate
) {
  return getClassesBetweenDates(
    startDate,
    endDate
  );
}