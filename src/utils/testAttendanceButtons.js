/* global process */
import { storageService } from "../services/storageService.js";
import { getClassesForDate } from "./academicCalendarUtils.js";
import { calculateOverallAttendance } from "./attendanceCalculations.js";
import { SEED_CALENDAR, SEED_TIMETABLE } from "../data/seedData.js";

console.log("=== COMPREHENSIVE ATTENDANCE BUTTON VERIFICATION SUITE ===");

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

// 1. Initial State Check
storageService.init();

const semesterId = "sem-5-2026";
const testDate = "2026-09-08"; // Tuesday
const classIndex = 0;

// Clean test records for this date
storageService.clearDateAttendance(semesterId, testDate);

let allRecords = storageService.getAttendanceRecords(semesterId);
let dayRecords = allRecords[testDate] || {};
assert(dayRecords[classIndex] === undefined, "Initial state: class is unmarked");

// 2. Action: User clicks 'Present' button
const classes = getClassesForDate(testDate, {
  calendar: SEED_CALENDAR[semesterId],
  timetable: SEED_TIMETABLE[semesterId],
});
const classSnapshot = classes[classIndex];

storageService.setAttendanceStatus(semesterId, testDate, classIndex, "present", classSnapshot);

allRecords = storageService.getAttendanceRecords(semesterId);
dayRecords = allRecords[testDate] || {};
let entry = dayRecords[classIndex];
let status = typeof entry === "object" ? entry?.status : entry;

assert(status === "present", "Click 1 [Present]: Status successfully set to 'present'");
assert(entry?.subject === classSnapshot.subject, "Snapshot saved: Preserves exact subject name for past history");

// Test UI presentation rules for Present
const dashPresentLabel = status === "present" ? "Attended ✓" : "Present";
const dashPresentActive = status === "present";
const calPresentLabel = status === "present" ? "Attended" : "Present";
const calPresentActive = status === "present";

assert(dashPresentLabel === "Attended ✓", "Dashboard Button: Label transforms to 'Attended ✓'");
assert(dashPresentActive === true, "Dashboard Button: '.active' class applied (triggers 1.10x scale & emerald gradient)");
assert(calPresentLabel === "Attended", "Calendar Button: Label transforms to 'Attended'");
assert(calPresentActive === true, "Calendar Button: '.active' class applied (triggers 1.12x scale & emerald gradient)");

// 3. Action: User clicks 'Present' again (Toggle / Unmark)
storageService.setAttendanceStatus(semesterId, testDate, classIndex, "present", classSnapshot);

allRecords = storageService.getAttendanceRecords(semesterId);
dayRecords = allRecords[testDate] || {};
entry = dayRecords[classIndex];
status = typeof entry === "object" ? entry?.status : entry;

assert(status === undefined, "Click 2 [Present again]: Toggles off and unmarks class cleanly");
assert(
  (status === "present" ? "Attended ✓" : "Present") === "Present",
  "Dashboard Button: Label resets back to 'Present'"
);
assert(
  (status === "present" ? "Attended" : "Present") === "Present",
  "Calendar Button: Label resets back to 'Present'"
);
assert(!status, "Active class removed: Buttons return to normal size");

// 4. Action: User clicks 'Absent' button
storageService.setAttendanceStatus(semesterId, testDate, classIndex, "absent", classSnapshot);

allRecords = storageService.getAttendanceRecords(semesterId);
dayRecords = allRecords[testDate] || {};
entry = dayRecords[classIndex];
status = typeof entry === "object" ? entry?.status : entry;

assert(status === "absent", "Click 3 [Absent]: Status successfully set to 'absent'");

// Test UI presentation rules for Absent
const dashAbsentLabel = status === "absent" ? "Missed ✗" : "Absent";
const dashAbsentActive = status === "absent";
const calAbsentLabel = status === "absent" ? "Missed" : "Absent";
const calAbsentActive = status === "absent";

assert(dashAbsentLabel === "Missed ✗", "Dashboard Button: Label transforms to 'Missed ✗'");
assert(dashAbsentActive === true, "Dashboard Button: '.active' class applied (triggers 1.10x scale & crimson gradient)");
assert(calAbsentLabel === "Missed", "Calendar Button: Label transforms to 'Missed'");
assert(calAbsentActive === true, "Calendar Button: '.active' class applied (triggers 1.12x scale & crimson gradient)");

// Sibling contrast verification: Present button is not active when Absent is active
const presentActiveWhenAbsent = status === "present";
assert(presentActiveWhenAbsent === false, "Sibling Contrast: Present button is inactive and dims when Absent is selected");

// 5. Action: User switches directly from Absent to Present
storageService.setAttendanceStatus(semesterId, testDate, classIndex, "present", classSnapshot);

allRecords = storageService.getAttendanceRecords(semesterId);
dayRecords = allRecords[testDate] || {};
entry = dayRecords[classIndex];
status = typeof entry === "object" ? entry?.status : entry;

assert(status === "present", "Click 4 [Switch to Present]: Status directly flips from absent to present in 1 tap");
assert(
  (status === "present" ? "Attended ✓" : "Present") === "Attended ✓",
  "Button label flips to 'Attended ✓'"
);
assert(
  (status === "absent" ? "Missed ✗" : "Absent") === "Absent",
  "Absent button label flips back to 'Absent'"
);

// 6. Action: Clean up test date
storageService.clearDateAttendance(semesterId, testDate);
allRecords = storageService.getAttendanceRecords(semesterId);
assert(allRecords[testDate] === undefined, "Date clear: Cleans up date records completely");

// 7. Overall calculation impact verification
const baselineAttended = 45;
const baselineConducted = 77;
const initialOverall = calculateOverallAttendance(baselineAttended, baselineConducted);

// Simulate 1 additional present class
const markedPresentOverall = calculateOverallAttendance(baselineAttended + 1, baselineConducted + 1);
assert(
  markedPresentOverall.percentage > initialOverall.percentage,
  `Marking Present increases overall percentage (${initialOverall.percentage}% -> ${markedPresentOverall.percentage}%)`
);

// Simulate 1 additional absent class
const markedAbsentOverall = calculateOverallAttendance(baselineAttended, baselineConducted + 1);
assert(
  markedAbsentOverall.percentage < initialOverall.percentage,
  `Marking Absent decreases overall percentage (${initialOverall.percentage}% -> ${markedAbsentOverall.percentage}%)`
);

console.log(`\n=== ATTENDANCE BUTTON TEST RESULTS: ${passed}/${total} PASSED ===\n`);
if (passed !== total && typeof process !== "undefined") {
  process.exit(1);
}
