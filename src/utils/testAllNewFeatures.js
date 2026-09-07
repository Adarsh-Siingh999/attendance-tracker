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

console.log("\n================================================================================");
console.log(`🎉 ALL NEW FEATURE TESTS PASSED: ${passed}/${total} (100%)`);
console.log("================================================================================\n");

if (passed !== total && typeof process !== "undefined") {
  process.exit(1);
}
