import {
  getClassesForDate,
  isWeekend,
  isHoliday,
  getExamForDate,
} from "./academicCalendarUtils";

console.log("=== ATTENDANCE TRACKER CALENDAR TEST ===");

const testDates = [
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
  "2026-09-13",
  "2026-09-04",
  "2026-10-25",
];

testDates.forEach((date) => {
  console.log(`\nDate: ${date}`);
  console.log("Weekend:", isWeekend(date));
  console.log("Holiday:", isHoliday(date));
  console.log("Exam:", getExamForDate(date)?.name || "None");

  const classes = getClassesForDate(date);

  console.log("Classes:", classes.length);

  classes.forEach((classItem, index) => {
    console.log(
      `${index + 1}. ${classItem.start} - ${classItem.end} | ${classItem.subject} | ${classItem.type}`
    );
  });
});