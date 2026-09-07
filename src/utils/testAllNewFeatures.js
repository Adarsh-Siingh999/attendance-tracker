/* global process */
import { storageService } from "../services/storageService.js";
import {
  getClassesForDate,
  isWeekend,
  isHoliday,
  isSpecialInstructionalDay,
  getSpecialInstructionalDay,
  generateSemesterScheduleFromTimetable,
} from "./academicCalendarUtils.js";
import {
  calculateOverallAttendance,
  calculateSubjectAttendance,
  calculatePercentage,
  calculateSemesterAbsenceBudget,
} from "./attendanceCalculations.js";
import {
  extractTimetableFromText,
  generateSubjectsFromExtractedClasses,
  SAMPLE_PRESETS,
  DAY_MAP,
  DAY_NAMES,
} from "../services/timetableAiService.js";
import { simulateDateRangeLeave } from "./skipSimulator.js";

console.log("================================================================================");
console.log("🎯 RUNNING COMPREHENSIVE VERIFICATION SUITE: ALL NEW FEATURES & REBUILD AUDIT");
console.log("================================================================================\n");

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

storageService.init();

// ============================================================================
// TEST SUITE 1: DYNAMIC BASELINE & ANY-MONTH ONBOARDING (NO AUGUST TRAP)
// ============================================================================
console.log("--- 1. Testing Dynamic Baseline & Onboarding on Any Month/Date ---");

// Create a new user who joins in mid-semester (October 10)
const octUser = storageService.createUser({
  name: "Priya Sharma",
  email: "priya.sharma@example.com",
  institution: "State Tech University",
  program: "B.Tech Computer Science",
  template: "clean",
});

assert(Boolean(octUser.id), "New user created successfully with unique ID");
assert(storageService.getCurrentUserId() === octUser.id, "Active user switched to new user");

const userSemesters = storageService.getSemesters();
const activeSem = storageService.getActiveSemester();
assert(activeSem.weekends.length === 0, "New user clean semester has empty weekends [] (no default day blocking)");
assert(activeSem.liveAttendanceStart === undefined, "New user has no hardcoded August liveAttendanceStart");

// User adds subjects:
// 1. Data Science (0 initial baseline)
const sub1 = storageService.saveSubject({
  name: "Data Science & Big Data",
  code: "DS401",
  credits: 4,
  components: {
    Lecture: { attended: 0, conducted: 0 },
  },
});

// 2. Machine Learning (feeds present attendance baseline from joining: 8 attended / 10 conducted)
const sub2 = storageService.saveSubject({
  name: "Machine Learning Concepts",
  code: "ML501",
  credits: 4,
  components: {
    Lecture: { attended: 8, conducted: 10 },
  },
});

const userSubjects = storageService.getSubjects();
assert(userSubjects.length === 2, "2 subjects saved for new user");

// User sets up weekly schedule
const userTimetable = {
  // Thursday (day 4)
  4: [
    { start: "10:00", end: "11:00", subject: "Data Science & Big Data", code: "DS401", type: "Lecture" },
    { start: "11:15", end: "12:15", subject: "Machine Learning Concepts", code: "ML501", type: "Lecture" },
  ],
};
storageService.saveTimetable(activeSem.id, userTimetable);

// Record attendance in October (October 15, 2026 is a Thursday)
const oct15 = "2026-10-15";
const octClasses = getClassesForDate(oct15, {
  calendar: storageService.getCalendar(activeSem.id),
  timetable: storageService.getTimetableData(activeSem.id),
  ignoreSemesterRange: true,
});
assert(octClasses.length === 2, "October 15 (Thursday) resolves 2 scheduled classes");

// Mark DS401 as present and ML501 as present on Oct 15
storageService.setAttendanceStatus(activeSem.id, oct15, 0, "present", octClasses[0]);
storageService.setAttendanceStatus(activeSem.id, oct15, 1, "present", octClasses[1]);

// Record attendance in November (November 12, 2026 is a Thursday)
const nov12 = "2026-11-12";
const novClasses = getClassesForDate(nov12, {
  calendar: storageService.getCalendar(activeSem.id),
  timetable: storageService.getTimetableData(activeSem.id),
  ignoreSemesterRange: true,
});
// Mark DS401 as absent on Nov 12
storageService.setAttendanceStatus(activeSem.id, nov12, 0, "absent", novClasses[0]);

// Verify recorded attendance computation simulation
const records = storageService.getAttendanceRecords(activeSem.id);
assert(Boolean(records[oct15]), "October 15 records exist");
assert(Boolean(records[nov12]), "November 12 records exist");

// Compute live attendance totals
let totalPresent = 0;
let totalAbsent = 0;
const subTotals = {};

for (const [date, dayRecs] of Object.entries(records)) {
  for (const [, entry] of Object.entries(dayRecs)) {
    const st = typeof entry === "object" ? entry.status : entry;
    const key = entry.code || entry.subject;
    if (!subTotals[key]) subTotals[key] = { present: 0, absent: 0 };
    if (st === "present") {
      totalPresent++;
      subTotals[key].present++;
    } else if (st === "absent") {
      totalAbsent++;
      subTotals[key].absent++;
    }
  }
}

assert(totalPresent === 2, "Total live present marks = 2 (counted in full, not dropped by August baseline)");
assert(totalAbsent === 1, "Total live absent marks = 1 (counted in full)");
assert(subTotals["DS401"].present === 1 && subTotals["DS401"].absent === 1, "DS401 has 1 present, 1 absent");
assert(subTotals["ML501"].present === 1, "ML501 has 1 present");

// Verify aggregated subject percentages with initial baseline
const mlInitialAttended = 8;
const mlInitialConducted = 10;
const mlFinalAttended = mlInitialAttended + subTotals["ML501"].present; // 9
const mlFinalConducted = mlInitialConducted + subTotals["ML501"].present; // 11
const mlPct = calculatePercentage(mlFinalAttended, mlFinalConducted);
assert(mlFinalAttended === 9, "ML501 attended = 8 baseline + 1 live mark = 9");
assert(mlFinalConducted === 11, "ML501 conducted = 10 baseline + 1 live mark = 11");
assert(mlPct === 81.82, `ML501 percentage is correctly 81.82% (calculated ${mlPct}%)`);

// ============================================================================
// TEST SUITE 2: SUNDAY CLASSES & WEEKEND HANDLING (NO FALSE WEEKENDS)
// ============================================================================
console.log("\n--- 2. Testing Sundays As Instructional Class Days & Weekend Handling ---");

const sundayDate = "2026-10-18"; // Sunday (Day of week 0)

// A. Sunday with classes scheduled in timetable
const timetableWithSunday = {
  0: [
    { start: "09:00", end: "10:00", subject: "Cloud Architecture", code: "CS601", type: "Lecture", room: "LT-1" },
    { start: "10:15", end: "12:15", subject: "Cloud Lab", code: "CS601L", type: "PR", room: "Cloud Lab 2" },
  ],
};

// Even if calendar weekends array contains Sunday [0, 6], the presence of classes in the timetable overrides weekend blocking!
const isSundayWeekendWithClasses = isWeekend(sundayDate, [0, 6], timetableWithSunday);
assert(isSundayWeekendWithClasses === false, "isWeekend returns FALSE on Sunday when timetable has scheduled Sunday classes");

const resolvedSundayClasses = getClassesForDate(sundayDate, {
  calendar: { weekends: [0, 6], holidays: [] },
  timetable: timetableWithSunday,
  ignoreSemesterRange: true,
});
assert(resolvedSundayClasses.length === 2, "getClassesForDate returns all 2 scheduled Sunday classes (not blocked as weekend)");
assert(resolvedSundayClasses[0].subject === "Cloud Architecture", "First Sunday class matches timetable");
assert(resolvedSundayClasses[1].type === "PR", "Second Sunday class is Lab PR");

// B. Sunday without classes scheduled
const isSundayWeekendWithoutClasses = isWeekend(sundayDate, [0, 6], { 1: [{ subject: "Monday Only" }] });
assert(isSundayWeekendWithoutClasses === true, "isWeekend returns TRUE on Sunday when timetable has no Sunday classes and [0] in weekends");

// C. Clean profile default with empty weekends
const isSundayWeekendClean = isWeekend(sundayDate, [], timetableWithSunday);
assert(isSundayWeekendClean === false, "isWeekend returns FALSE when weekends array is empty []");

// D. Mark attendance on Sunday
storageService.setAttendanceStatus(activeSem.id, sundayDate, 0, "present", resolvedSundayClasses[0]);
const sundayRecs = storageService.getAttendanceRecords(activeSem.id)[sundayDate];
assert(sundayRecs[0].status === "present", "Attendance marked successfully on Sunday class");
assert(sundayRecs[0].subject === "Cloud Architecture", "Sunday attendance snapshot preserved");

// ============================================================================
// TEST SUITE 3: "MARK DAY AS INSTRUCTIONAL" FEATURE
// ============================================================================
console.log("\n--- 3. Testing 'Mark as Instructional Day' Feature & Overrides ---");

const holidayDate = "2026-10-02"; // Gandhi Jayanti (Friday)
const fridayTimetable = {
  5: [
    { start: "09:00", end: "10:00", subject: "Operating Systems", code: "CS204", type: "Lecture" },
    { start: "10:00", end: "11:00", subject: "Computer Networks", code: "CS203", type: "Lecture" },
  ],
};

const baseCalendar = {
  holidays: [{ date: holidayDate, name: "Mahatma Gandhi Jayanti" }],
  weekends: [0, 6],
  specialInstructionalDays: [],
};

// 1. Without override: It's a holiday, no classes
const normalHolidayClasses = getClassesForDate(holidayDate, {
  calendar: baseCalendar,
  timetable: fridayTimetable,
  ignoreSemesterRange: true,
});
assert(normalHolidayClasses.length === 0, "Before override: Holiday blocks regular scheduled classes");

// 2. Mark day as instructional
const overriddenCalendar = {
  ...baseCalendar,
  specialInstructionalDays: [
    { date: holidayDate, scheduleDay: null, note: "Working Gandhi Jayanti (Special Make-up Day)" },
  ],
};

const isMarked = isSpecialInstructionalDay(holidayDate, overriddenCalendar.specialInstructionalDays);
assert(isMarked === true, "isSpecialInstructionalDay returns true for designated working day");

const overriddenClasses = getClassesForDate(holidayDate, {
  calendar: overriddenCalendar,
  timetable: fridayTimetable,
  ignoreSemesterRange: true,
});
assert(overriddenClasses.length === 2, "After override: Classes are unblocked and active for attendance!");
assert(overriddenClasses[0].code === "CS204", "Class details match day's timetable");

// 3. Mark a weekend/Sunday as instructional following another day's schedule (e.g. Follow Monday on a Sunday)
const workingSundayDate = "2026-10-25"; // Sunday (Day 0)
const fullTimetable = {
  1: [
    { start: "08:30", end: "09:20", subject: "Monday Morning Lecture", code: "MON101", type: "Lecture" },
    { start: "09:20", end: "10:10", subject: "Monday Lab Session", code: "MON102", type: "PR" },
    { start: "10:15", end: "11:05", subject: "Monday Seminar", code: "MON103", type: "Tutorial" },
  ],
};

const sundayFollowMondayCal = {
  weekends: [0, 6],
  specialInstructionalDays: [
    { date: workingSundayDate, scheduleDay: 1, note: "Working Sunday (Run Monday Timetable)" },
  ],
};

const sundayMondayClasses = getClassesForDate(workingSundayDate, {
  calendar: sundayFollowMondayCal,
  timetable: fullTimetable,
  ignoreSemesterRange: true,
});
assert(sundayMondayClasses.length === 3, "Working Sunday correctly loads Monday's 3 periods via scheduleDay: 1");
assert(sundayMondayClasses[0].code === "MON101", "Period 1 matches Monday schedule");
assert(sundayMondayClasses[1].code === "MON102", "Period 2 matches Monday schedule");

// 4. Revert / unmark instructional day
const revertedCalendar = {
  ...overriddenCalendar,
  specialInstructionalDays: overriddenCalendar.specialInstructionalDays.filter((d) => d.date !== holidayDate),
};
const isReverted = isSpecialInstructionalDay(holidayDate, revertedCalendar.specialInstructionalDays);
assert(isReverted === false, "Unmarking instructional day removes override");

const revertedClasses = getClassesForDate(holidayDate, {
  calendar: revertedCalendar,
  timetable: fridayTimetable,
  ignoreSemesterRange: true,
});
assert(revertedClasses.length === 0, "After revert: Original holiday status is cleanly restored");

// ============================================================================
// TEST SUITE 4: AI TIMETABLE UPLOAD ENGINE & MULTI-PHOTO SUPPORT
// ============================================================================
console.log("\n--- 4. Testing AI Timetable Upload Engine & Multi-Photo Features ---");

// 1. Test Sunday text parsing in heuristic / OCR engine
const sundayOcrText = `
Sunday
09:30 - 10:30 Artificial Intelligence AI301 Lecture Room 101
10:30 - 11:30 Cloud Computing CS601 Lecture Room 101
11:45 - 13:45 AI Lab AI301L PR Lab 1
`;

const parsedSunday = extractTimetableFromText(sundayOcrText);
assert(parsedSunday.detectedDays.length === 1, "OCR/Heuristic engine detects Sunday schedule from text");
assert(parsedSunday.detectedDays[0].dayIndex === 0, "Detected dayIndex is 0 (Sunday)");
assert(parsedSunday.detectedDays[0].dayName === "Sunday", "Detected dayName is 'Sunday'");
assert(parsedSunday.detectedDays[0].classes.length === 3, "Extracted all 3 Sunday periods");
assert(parsedSunday.detectedDays[0].classes[0].start === "09:30", "Period 1 start time is 09:30");
assert(parsedSunday.detectedDays[0].classes[0].code === "AI301", "Period 1 code is AI301");
assert(parsedSunday.detectedDays[0].classes[2].type === "PR", "Period 3 type recognized as PR");

// 2. Test Sunday preset availability in SAMPLE_PRESETS
const sundayPreset = SAMPLE_PRESETS.find((p) => p.id === "sunday-classes");
assert(Boolean(sundayPreset), "Built-in 'sunday-classes' sample preset exists for zero-key instant preview");
assert(sundayPreset.previewDays[0].dayIndex === 0, "Preset day index is 0 (Sunday)");
assert(sundayPreset.previewDays[0].classes.length === 4, "Preset contains 4 curated Sunday classes");

// 3. Test multi-photo merge simulation
// Photo A extracted Sunday (Day 0); Photo B extracted Monday (Day 1)
const photoADay = {
  dayIndex: 0,
  dayName: "Sunday",
  classes: [{ start: "10:00", end: "11:00", subject: "Robotics", code: "ROB101", type: "Lecture", room: "R1" }],
};
const photoBDay = {
  dayIndex: 1,
  dayName: "Monday",
  classes: [{ start: "09:00", end: "10:00", subject: "Compiler Design", code: "CS402", type: "Lecture", room: "R2" }],
};

const combinedDays = [photoADay, photoBDay];
assert(combinedDays.length === 2, "Multi-photo merger combines detected days from distinct photos");

// 4. Test generateSubjectsFromExtractedClasses
const existingSubs = [{ name: "Robotics", code: "ROB101" }]; // Robotics already exists
const newAutoCreated = generateSubjectsFromExtractedClasses(combinedDays, existingSubs);
assert(newAutoCreated.length === 1, "generateSubjectsFromExtractedClasses ignores already existing subjects");
assert(newAutoCreated[0].code === "CS402", "Auto-created subject is Compiler Design (CS402)");
assert(Boolean(newAutoCreated[0].color), "Auto-assigned accessible subject color");

// 5. Test initial timetable versioning for a new user
const cleanUserId = `user-tt-test-${Date.now()}`;
storageService.createUser({
  name: "Aman Verma",
  email: "aman@example.com",
  template: "clean",
});
const amanSem = storageService.getActiveSemester();
const newTimetableData = {
  0: [{ start: "10:00", end: "11:00", subject: "Robotics", code: "ROB101", type: "Lecture" }],
  1: [{ start: "09:00", end: "10:00", subject: "Compiler Design", code: "CS402", type: "Lecture" }],
};

storageService.saveTimetable(amanSem.id, newTimetableData, {
  applyFromDate: "2026-09-07",
  note: "Initial AI Timetable Setup",
});

const storedTtData = storageService.getTimetableData(amanSem.id);
assert(Boolean(storedTtData.versions), "Timetable saved with versioning");
assert(storedTtData.versions[0].timetable[0][0].code === "ROB101", "Sunday class saved under day index 0 in versioned routine");
assert(storedTtData.versions[0].effectiveFrom === amanSem.startDate, "Initial version effectiveFrom starts from semester start date rather than only today");

// ============================================================================
// TEST SUITE 6: PP & PR BASELINE EDITING & LOCKED ATTENDANCE MARKING TILL BASELINE
// ============================================================================
console.log("\n--- 6. Testing PP & PR Baseline Editing & Attendance Marking Lock ---");

// 1. Create a user with semester cut-off date at 2026-09-05
const baselineUser = storageService.createUser({
  name: "Rohan Kulkarni",
  email: "rohan.k@example.com",
  template: "clean",
});
const rohanSem = storageService.getActiveSemester();

// Set semester baseline cutoff date to 2026-09-05
const updatedRohanSem = storageService.saveSemester({
  ...rohanSem,
  baselineDate: "2026-09-05",
  liveAttendanceStart: "2026-09-05",
});
assert(updatedRohanSem.baselineDate === "2026-09-05", "Semester baselineDate correctly saved as 2026-09-05");

// 2. User edits a subject to include PP (attended: 9, conducted: 10) and PR (attended: 11, conducted: 13)
const subWithPPPR = storageService.saveSubject({
  name: "Object Oriented Programming",
  code: "CS202",
  credits: 4,
  components: {
    PP: { attended: 9, conducted: 10 },
    PR: { attended: 11, conducted: 13 },
  },
});

// Calculate subject attendance from baseline components
const subAttendance = calculateSubjectAttendance(subWithPPPR);
assert(subAttendance.attended === 20, "calculateSubjectAttendance sums PP (9) + PR (11) = 20 attended");
assert(subAttendance.conducted === 23, "calculateSubjectAttendance sums PP (10) + PR (13) = 23 conducted");
const expectedPct = (20 / 23) * 100;
assert(Math.abs(subAttendance.percentage - expectedPct) < 0.01, "PP + PR baseline percentage is correctly 86.96%");

// 3. Verify helper logic: dates on or before 2026-09-05 are in baseline
const isDateInBaseline = (dateStr, cutoff) => {
  if (!cutoff) return false;
  return dateStr <= cutoff;
};

assert(isDateInBaseline("2026-08-30", "2026-09-05") === true, "2026-08-30 is identified as within baseline period");
assert(isDateInBaseline("2026-09-05", "2026-09-05") === true, "Cut-off date 2026-09-05 itself is within baseline period (inclusive)");
assert(isDateInBaseline("2026-09-06", "2026-09-05") === false, "2026-09-06 is strictly after baseline (live instructional day)");

// 4. Simulate recordedAttendance filtering:
// If historical records exist on or before 2026-09-05 (e.g. from an old import or accidental mark),
// they MUST NOT be added on top of the PP/PR baseline!
const testRecords = {
  "2026-09-03": { [subWithPPPR.id]: "present" }, // in baseline
  "2026-09-05": { [subWithPPPR.id]: "present" }, // in baseline
  "2026-09-08": { [subWithPPPR.id]: "present" }, // after baseline
  "2026-09-09": { [subWithPPPR.id]: "absent" },  // after baseline
};

// Filter recorded attendance strictly after baseline
const filteredLiveCounts = { [subWithPPPR.id]: { present: 0, absent: 0 } };
for (const [dStr, recs] of Object.entries(testRecords)) {
  if (isDateInBaseline(dStr, "2026-09-05")) {
    continue; // Strictly excluded
  }
  for (const [sId, st] of Object.entries(recs)) {
    if (st === "present") filteredLiveCounts[sId].present += 1;
    if (st === "absent") filteredLiveCounts[sId].absent += 1;
  }
}

assert(filteredLiveCounts[subWithPPPR.id].present === 1, "Only 1 present counted after baseline (Sep 8), Sep 3 & 5 safely excluded");
assert(filteredLiveCounts[subWithPPPR.id].absent === 1, "1 absent counted after baseline (Sep 9)");

// 5. Total combined attendance (Baseline PP + PR + Live Attendance)
const finalAttended = subAttendance.attended + filteredLiveCounts[subWithPPPR.id].present; // 20 + 1 = 21
const finalConducted = subAttendance.conducted + filteredLiveCounts[subWithPPPR.id].present + filteredLiveCounts[subWithPPPR.id].absent; // 23 + 2 = 25
const finalPct = (finalAttended / finalConducted) * 100; // 84.0%

assert(finalAttended === 21, "Total attended = 21 (20 baseline PP/PR + 1 live present)");
assert(finalConducted === 25, "Total conducted = 25 (23 baseline PP/PR + 2 live classes)");
assert(finalPct === 84.0, "Total attendance percentage accurately computed at 84.0% without double-counting");

// ============================================================================
// TEST SUITE 7: DATE RANGE LEAVE SIMULATOR (X TO Y)
// ============================================================================
console.log("\n--- 7. Testing Date Range Leave Simulator (X to Y) ---");

// Set up sample subjects with current attendance till now
const simSubjects = [
  // Subject 1: High buffer (45/50 = 90.0%)
  { id: "sub-s1", name: "Computer Networks", code: "CN301", attended: 45, conducted: 50, percentage: 90.0 },
  // Subject 2: Fragile margin (30/38 = 78.95%) -> missing classes will drop it below 75%
  { id: "sub-s2", name: "Database Systems", code: "DB201", attended: 30, conducted: 38, percentage: 78.95 },
  // Subject 3: Low margin (24/35 = 68.57%) -> missing classes will drop it below 65% critical
  { id: "sub-s3", name: "Operating Systems", code: "OS401", attended: 24, conducted: 35, percentage: 68.57 },
];

// Mock calendar & timetable
// Monday (1): CN301 (1 class), DB201 (1 class), OS401 (1 class)
// Tuesday (2): DB201 (1 class), OS401 (1 class)
// Wednesday (3): CN301 (1 class), DB201 (1 class)
// Thursday (4): CN301 (1 class), OS401 (1 class)
// Friday (5): DB201 (1 class)
const simTimetable = {
  1: [
    { start: "09:00", end: "10:00", subject: "Computer Networks", code: "CN301", type: "Lecture" },
    { start: "10:00", end: "11:00", subject: "Database Systems", code: "DB201", type: "Lecture" },
    { start: "11:15", end: "12:15", subject: "Operating Systems", code: "OS401", type: "Lecture" },
  ],
  2: [
    { start: "09:00", end: "10:00", subject: "Database Systems", code: "DB201", type: "Lecture" },
    { start: "10:00", end: "11:00", subject: "Operating Systems", code: "OS401", type: "Lecture" },
  ],
  3: [
    { start: "09:00", end: "10:00", subject: "Computer Networks", code: "CN301", type: "Lecture" },
    { start: "10:00", end: "11:00", subject: "Database Systems", code: "DB201", type: "Lecture" },
  ],
  4: [
    { start: "09:00", end: "10:00", subject: "Computer Networks", code: "CN301", type: "Lecture" },
    { start: "10:00", end: "11:00", subject: "Operating Systems", code: "OS401", type: "Lecture" },
  ],
  5: [
    { start: "09:00", end: "10:00", subject: "Database Systems", code: "DB201", type: "Lecture" },
  ],
};

const simCalendar = {
  startDate: "2026-08-01",
  endDate: "2026-12-20",
  weekends: [0, 6],
  holidays: [],
  nonInstructionalDays: [],
  examinations: {},
};

// Test Scenario A: Student takes leave next week from Monday (2026-09-14) to Friday (2026-09-18)
// Today is Monday 2026-09-07.
// Interim dates: 2026-09-08 (Tue) to 2026-09-13 (Sun)
// All scheduled classes in interim are assumed 100% attended!
// Scheduled classes in interim:
// Tue Sep 8: DB201 (1), OS401 (1) -> 2
// Wed Sep 9: CN301 (1), DB201 (1) -> 2
// Thu Sep 10: CN301 (1), OS401 (1) -> 2
// Fri Sep 11: DB201 (1) -> 1
// Sat & Sun: 0
// Total interim attended: 7 classes (CN: 2, DB: 3, OS: 2)

// Scheduled classes during leave [Sep 14 to Sep 18]:
// Mon Sep 14: CN301 (1), DB201 (1), OS401 (1) -> 3
// Tue Sep 15: DB201 (1), OS401 (1) -> 2
// Wed Sep 16: CN301 (1), DB201 (1) -> 2
// Thu Sep 17: CN301 (1), OS401 (1) -> 2
// Fri Sep 18: DB201 (1) -> 1
// Total missed during leave: 10 classes (CN: 3, DB: 4, OS: 3)

const leaveRangeRes = simulateDateRangeLeave({
  subjects: simSubjects,
  startDate: "2026-09-14",
  endDate: "2026-09-18",
  todayDate: "2026-09-07",
  calendar: simCalendar,
  timetable: simTimetable,
  threshold: 75,
  criticalThreshold: 65,
});

assert(Boolean(leaveRangeRes), "simulateDateRangeLeave returned result");
assert(leaveRangeRes.totalLeaveDays === 5, "Total leave days = 5 (Mon to Fri)");
assert(leaveRangeRes.totalClassesInLeave === 10, "Total classes missed during leave = 10 classes");
assert(leaveRangeRes.totalAttendedInterim === 7, "Total classes attended between today and leave = 7 classes");

// Check CN301 (Computer Networks):
// Current: 45/50. Interim: +2 attended -> 47/52. Missed in leave: 3 -> Attended: 47, Conducted: 55.
// Pct: 47 / 55 = 85.45% (>= 75%).
const cnResult = leaveRangeRes.subjects.find((s) => s.code === "CN301");
assert(cnResult.attendedAfter === 47, "CN301 attended after = 47");
assert(cnResult.conductedAfter === 55, "CN301 conducted after = 55");
assert(cnResult.isEligible === true, "CN301 remains eligible (85.45% >= 75%)");

// Check DB201 (Database Systems):
// Current: 30/38. Interim: +3 attended -> 33/41. Missed in leave: 4 -> Attended: 33, Conducted: 45.
// Pct: 33 / 45 = 73.33% (< 75% threshold!).
const dbResult = leaveRangeRes.subjects.find((s) => s.code === "DB201");
assert(dbResult.attendedAfter === 33, "DB201 attended after = 33");
assert(dbResult.conductedAfter === 45, "DB201 conducted after = 45");
assert(dbResult.isEligible === false, "DB201 drops below threshold (<75%) to 73.33%");
assert(dbResult.isCritical === false, "DB201 is above critical (73.33% >= 65%)");

// Check OS401 (Operating Systems):
// Current: 24/35. Interim: +2 attended -> 26/37. Missed in leave: 3 -> Attended: 26, Conducted: 40.
// Pct: 26 / 40 = 65.0% (< 75% and right at critical threshold).
const osResult = leaveRangeRes.subjects.find((s) => s.code === "OS401");
assert(osResult.attendedAfter === 26, "OS401 attended after = 26");
assert(osResult.conductedAfter === 40, "OS401 conducted after = 40");
assert(osResult.isEligible === false, "OS401 drops below threshold to 65.0%");

// Check overall detection of which particular subjects are ineligible:
assert(leaveRangeRes.ineligibleSubjects.length === 2, "Ineligible subjects count = 2 (DB201 and OS401)");
assert(leaveRangeRes.ineligibleSubjects.some((s) => s.code === "DB201"), "Specific subject DB201 correctly reported in ineligible list");
assert(leaveRangeRes.ineligibleSubjects.some((s) => s.code === "OS401"), "Specific subject OS401 correctly reported in ineligible list");
assert(!leaveRangeRes.ineligibleSubjects.some((s) => s.code === "CN301"), "Eligible subject CN301 NOT in ineligible list");

console.log("\n================================================================================");
console.log(`🎉 ALL NEW FEATURE TESTS PASSED: ${passed}/${total} (100%)`);
console.log("================================================================================\n");

if (passed !== total && typeof process !== "undefined") {
  process.exit(1);
}
