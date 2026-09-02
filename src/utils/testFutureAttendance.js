import {
  getFutureClassCount,
  getFutureAttendanceBreakdown,
  getFutureClassesBySubject,
} from "./futureAttendance";

import {
  getClassesForDate,
} from "./academicCalendarUtils";

console.log("=== FUTURE ATTENDANCE CALENDAR TEST ===");

const testDates = [
  "2026-09-04",
  "2026-09-08",
  "2026-10-20",
  "2026-10-21",
  "2026-10-31",
  "2026-11-01",
  "2026-11-17",
  "2026-11-21",
  "2026-12-11",
  "2026-12-15",
  "2026-12-16",
  "2026-12-31",
];

testDates.forEach((date) => {
  const classes = getClassesForDate(date);

  console.log(
    `${date} | Classes: ${classes.length}`,
    classes
  );
});

console.log("=== FUTURE RANGE TEST ===");

const startDate = "2026-09-02";
const endDate = "2026-12-31";

console.log(
  "Date Range:",
  startDate,
  "to",
  endDate
);

console.log(
  "Total Future Classes:",
  getFutureClassCount(
    startDate,
    endDate
  )
);

console.log(
  "Subject Breakdown:",
  JSON.stringify(
    getFutureClassesBySubject(
      startDate,
      endDate
    ),
    null,
    2
  )
);

console.log("=== INDIVIDUAL SUBJECT TEST ===");

const subjects = [
  "R1UC544B",
  "R1UC549B",
  "R1UC552B",
  "R1UC515T",
  "R1UC525B",
  "O1UA505L",
  "R1UC543L",
];

subjects.forEach((code) => {
  console.log(
    code,
    JSON.stringify(
      getFutureAttendanceBreakdown(
        startDate,
        endDate,
        code
      )
    )
  );
});

console.log("=== TEST COMPLETE ===");