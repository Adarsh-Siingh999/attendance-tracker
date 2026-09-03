/* global process */
import {
  calculatePercentage,
  calculateBestPossibleAttendance,
  calculateMaximumAllowedAbsences,
  calculateRecoveryProjection,
  calculateRequiredClasses,
  getEligibility,
  getSubjectStatus,
} from "./attendanceCalculations.js";

import { simulateSkipImpact } from "./skipSimulator.js";
import {
  getTimetableForDate,
  generateSemesterScheduleFromTimetable,
} from "./academicCalendarUtils.js";

console.log("=== RUNNING ATTENDANCE ENGINE TEST SUITE ===");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
  }
}

// 1. Percentage Tests
assert(calculatePercentage(0, 0) === null, "0/0 conducted returns null");
assert(calculatePercentage(10, 10) === 100, "10/10 returns 100%");
assert(calculatePercentage(3, 4) === 75, "3/4 returns 75%");
assert(calculatePercentage(2, 3) === 66.67, "2/3 rounds correctly to 66.67%");

// 2. Eligibility & Status Tests
assert(getEligibility(75, 75) === "Eligible", "75% is Eligible at threshold 75");
assert(getEligibility(74.99, 75) === "Not Eligible", "74.99% is Not Eligible at threshold 75");
assert(getSubjectStatus(80, 75, 65) === "Eligible", "80% is Eligible");
assert(getSubjectStatus(70, 75, 65) === "Precaution", "70% is Precaution between 65 and 75");
assert(getSubjectStatus(64.99, 75, 65) === "Critical", "64.99% is Critical below 65");

// 3. Required Classes Tests
assert(calculateRequiredClasses(75, 100, 75) === 0, "Already eligible needs 0 required classes");
assert(calculateRequiredClasses(60, 100, 75) === 60, "60/100 needs 60 consecutive classes to hit 75%");
assert(calculateRequiredClasses(0, 10, 75) === 30, "0/10 needs 30 consecutive classes to hit 75%");

// 4. Best Possible & Absences Tests
const best = calculateBestPossibleAttendance(45, 77, 20);
assert(best.attended === 65 && best.conducted === 97, "Best possible adds remaining classes to both attended and conducted");

const maxAbsences = calculateMaximumAllowedAbsences(45, 50, 10, 75);
assert(maxAbsences >= 0, "Max absences calculates valid safe number");

// 5. Recovery Projection Tests
// For 45/77 to reach 75%: ceil((0.75*77 - 45)/0.25) = ceil(12.75/0.25) = 51 classes required.
// With 60 remaining classes, 60 >= 51, so recovery is mathematically possible.
const recoveryPossible = calculateRecoveryProjection(45, 77, 60, 75);
assert(recoveryPossible.canRecover === true, "Can recover when remaining classes (60) > required classes (51)");

// With only 5 remaining classes, 5 < 51, recovery is impossible.
const recoveryImpossible = calculateRecoveryProjection(10, 100, 5, 75);
assert(recoveryImpossible.canRecover === false, "Cannot recover when remaining classes < required classes");

// 6. Skip Simulator Tests
const mockSubjects = [
  { id: "s1", name: "Subject 1", code: "S1", attended: 20, conducted: 22 }, // 90.9%
  { id: "s2", name: "Subject 2", code: "S2", attended: 15, conducted: 20 }, // 75.0%
];
const simResult = simulateSkipImpact({
  subjects: mockSubjects,
  classesToSkip: [{ code: "S2", subject: "Subject 2" }],
  threshold: 75,
  criticalThreshold: 65,
});
assert(simResult.verdict === "CAUTION", "Skipping class that drops subject below 75% yields CAUTION");
assert(simResult.affectedSubjects.length === 1, "Correctly identifies the single affected subject");
assert(simResult.affectedSubjects[0].crossedThreshold === true, "Flags that subject crossed threshold");

// 7. Timetable Versioning & Immutability Tests
const versionedTimetable = {
  current: {
    1: [{ subject: "AI", code: "CS602" }],
  },
  versions: [
    {
      id: "v1",
      effectiveFrom: "2026-08-01",
      effectiveTo: "2026-09-10",
      timetable: { 1: [{ subject: "Math", code: "MA101" }] },
    },
    {
      id: "v2",
      effectiveFrom: "2026-09-11",
      effectiveTo: null,
      timetable: { 1: [{ subject: "AI", code: "CS602" }] },
    },
  ],
};

const pastClasses = getTimetableForDate("2026-09-05", versionedTimetable);
assert(pastClasses[1][0].subject === "Math", "Past date resolves historical timetable version (Math)");

const futureClasses = getTimetableForDate("2026-09-15", versionedTimetable);
assert(futureClasses[1][0].subject === "AI", "Future date resolves updated timetable version (AI)");

// 8. Full Semester Schedule AI Mapping
const scheduleResult = generateSemesterScheduleFromTimetable({
  startDate: "2027-01-18", // Monday
  endDate: "2027-01-31",   // Sunday (14 days = 2 weeks)
  weekends: [0, 6],        // Saturday & Sunday are weekends
  holidays: [{ date: "2027-01-26", name: "Republic Day" }], // Tuesday holiday
  weeklyTimetable: {
    1: [{ subject: "Cloud", code: "CS601" }], // Mon
    2: [{ subject: "DL", code: "AI602" }],    // Tue
  },
});

assert(scheduleResult.totalDays === 14, "AI Schedule counts exact 14 days in two weeks");
assert(scheduleResult.instructionalDays === 3, "AI Schedule counts exactly 3 instructional days (2 Mondays + 1 Tuesday, skipping 1 holiday Tuesday)");
assert(scheduleResult.subjectBreakdown["CS601"] === 2, "AI Schedule maps 2 Cloud classes across 2 Mondays");
assert(scheduleResult.subjectBreakdown["AI602"] === 1, "AI Schedule maps 1 DL class, accurately skipping Republic Day holiday");

console.log(`\n=== TEST RESULTS: ${passed}/${total} PASSED ===\n`);
if (passed !== total && typeof process !== "undefined") {
  process.exit(1);
}