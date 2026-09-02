import {
  getFutureClasses,
} from "./timetableUtils";

export function getFutureClassCount(
  startDate,
  endDate
) {
  return getFutureClasses(
    startDate,
    endDate
  ).length;
}

export function getFutureClassesForSubject(
  startDate,
  endDate,
  subjectCode
) {
  return getFutureClasses(
    startDate,
    endDate
  ).filter(
    (classItem) =>
      classItem.code === subjectCode
  );
}

export function getFutureClassesForComponent(
  startDate,
  endDate,
  subjectCode,
  type
) {
  return getFutureClassesForSubject(
    startDate,
    endDate,
    subjectCode
  ).filter(
    (classItem) =>
      classItem.type === type
  );
}

export function getFutureAttendanceBreakdown(
  startDate,
  endDate,
  subjectCode
) {
  const classes =
    getFutureClassesForSubject(
      startDate,
      endDate,
      subjectCode
    );

  const pp =
    classes.filter(
      (classItem) =>
        classItem.type === "PP"
    ).length;

  const pr =
    classes.filter(
      (classItem) =>
        classItem.type === "PR"
    ).length;

  return {
    total: classes.length,
    PP: pp,
    PR: pr,
  };
}

export function getFutureClassesBySubject(
  startDate,
  endDate
) {
  const classes = getFutureClasses(
    startDate,
    endDate
  );

  const subjects = {};

  classes.forEach((classItem) => {
    if (!subjects[classItem.code]) {
      subjects[classItem.code] = {
        name: classItem.subject,
        code: classItem.code,
        total: 0,
        PP: 0,
        PR: 0,
      };
    }

    subjects[classItem.code].total++;

    if (classItem.type === "PP") {
      subjects[classItem.code].PP++;
    }

    if (classItem.type === "PR") {
      subjects[classItem.code].PR++;
    }
  });

  return subjects;
}