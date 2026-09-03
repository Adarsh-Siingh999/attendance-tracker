/**
 * Automated Test Suite for Timetable AI Vision & Extraction Agent
 */

import {
  normalizeTime,
  DAY_MAP,
  DAY_NAMES,
  extractTimetableFromText,
  generateSubjectsFromExtractedClasses,
  SAMPLE_PRESETS,
} from "../services/timetableAiService.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message} (expected: "${expected}", got: "${actual}")`);
    failed++;
  }
}

console.log("=== RUNNING TIMETABLE AI AGENT TESTS ===");

// 1. Time Normalization Tests
console.log("\n1. Time Normalization Tests:");
assertEqual(normalizeTime("08:30"), "08:30", "Preserves 24h formatted time 08:30");
assertEqual(normalizeTime("8:30"), "08:30", "Pads single-digit hour 8:30 to 08:30");
assertEqual(normalizeTime("1:45 PM"), "13:45", "Converts 1:45 PM to 13:45");
assertEqual(normalizeTime("9:00 AM"), "09:00", "Converts 9:00 AM to 09:00");
assertEqual(normalizeTime("12:00 PM"), "12:00", "Converts 12:00 PM to 12:00 (noon)");
assertEqual(normalizeTime("12:00 AM"), "00:00", "Converts 12:00 AM to 00:00 (midnight)");
assertEqual(normalizeTime("11:05pm"), "23:05", "Handles lowercase am/pm without space");

// 2. Day Mapping Tests
console.log("\n2. Day Mapping & Normalization Tests:");
assertEqual(DAY_MAP["monday"], 1, "Monday maps to day index 1");
assertEqual(DAY_MAP["tuesday"], 2, "Tuesday maps to day index 2");
assertEqual(DAY_MAP["wed"], 3, "Wed maps to day index 3");
assertEqual(DAY_MAP["thu"], 4, "Thu maps to day index 4");
assertEqual(DAY_MAP["friday"], 5, "Friday maps to day index 5");
assertEqual(DAY_MAP["saturday"], 6, "Saturday maps to day index 6");
assertEqual(DAY_MAP["sunday"], 0, "Sunday maps to day index 0");
assertEqual(DAY_NAMES[2], "Tuesday", "Day index 2 resolves to 'Tuesday'");

// 3. Text / OCR Extraction Tests
console.log("\n3. Text / OCR Heuristic Extraction Tests:");
const sampleText = `
Tuesday
08:30 - 09:20 | Programming Skills with Advanced Data Structures | R1UC543L | PR | Lab 3
11:05 - 11:55 | Machine Learning | R1UC525B | PP | Room 402
12:00 - 12:50 | System Design | R1UC515T | PP | Room 402

Wednesday
08:30 - 09:20 | Soft Skills & Aptitude Readiness | O1UA505L | PR | Audi B
10:15 - 11:05 | Problem-Driven Programming | R1UC544B | PP | Room 401
`;

const extracted = extractTimetableFromText(sampleText);
assert(extracted.detectedDays.length === 2, "Detected 2 days from multi-day schedule text");

const tue = extracted.detectedDays.find((d) => d.dayIndex === 2);
assert(Boolean(tue), "Successfully found Tuesday (dayIndex: 2)");
assertEqual(tue.classes.length, 3, "Extracted 3 classes for Tuesday");
assertEqual(tue.classes[0].subject, "Programming Skills with Advanced Data Structures", "First class subject extracted");
assertEqual(tue.classes[0].code, "R1UC543L", "First class course code extracted");
assertEqual(tue.classes[0].type, "PR", "First class type recognized as PR");
assertEqual(tue.classes[0].room, "Lab 3", "First class room recognized as Lab 3");
assertEqual(tue.classes[1].subject, "Machine Learning", "Second class subject extracted");
assertEqual(tue.classes[1].start, "11:05", "Second class start time extracted");

const wed = extracted.detectedDays.find((d) => d.dayIndex === 3);
assert(Boolean(wed), "Successfully found Wednesday (dayIndex: 3)");
assertEqual(wed.classes.length, 2, "Extracted 2 classes for Wednesday");
assertEqual(wed.classes[0].subject, "Soft Skills & Aptitude Readiness", "Wednesday class 1 subject extracted");
assertEqual(wed.classes[0].room, "Audi B", "Wednesday class 1 room recognized as Audi B");

// 4. New User Subject Auto-Generation Tests
console.log("\n4. New User Subject Auto-Generation Tests:");
// Scenario A: New user with 0 existing subjects (clean slate)
const newSubjects = generateSubjectsFromExtractedClasses(extracted.detectedDays, []);
assertEqual(newSubjects.length, 5, "Generated 5 unique subjects from extracted schedule for clean new user");

const pdpSubj = newSubjects.find((s) => s.name === "Problem-Driven Programming");
assert(Boolean(pdpSubj), "Auto-generated Problem-Driven Programming subject card");
assertEqual(pdpSubj.code, "R1UC544B", "Subject has correct course code");
assert(Boolean(pdpSubj.color), "Subject assigned distinctive color");
assert(Boolean(pdpSubj.components.PP), "Subject configured with PP component");
assertEqual(pdpSubj.components.PP.attended, 0, "New subject starts with 0 attended classes");
assertEqual(pdpSubj.components.PP.conducted, 0, "New subject starts with 0 conducted classes");

// Scenario B: User already has Machine Learning configured
const existingSubjects = [
  { id: "sub-1", name: "Machine Learning", code: "R1UC525B" },
];
const incrementalSubjects = generateSubjectsFromExtractedClasses(extracted.detectedDays, existingSubjects);
assertEqual(incrementalSubjects.length, 4, "Does not duplicate existing subject 'Machine Learning' (4 new subjects generated)");
assert(!incrementalSubjects.some((s) => s.name === "Machine Learning"), "Machine Learning excluded from creation list");

// 5. University Preset Samples Integrity Tests
console.log("\n5. Built-in Preset Samples Integrity Tests:");
assert(SAMPLE_PRESETS.length >= 4, "Has at least 4 built-in preset samples");

for (const preset of SAMPLE_PRESETS) {
  assert(preset.id.length > 0, `Preset ${preset.id} has non-empty ID`);
  assert(preset.previewDays.length > 0, `Preset ${preset.id} contains days`);
  for (const day of preset.previewDays) {
    assert(day.dayIndex >= 0 && day.dayIndex <= 6, `Preset ${preset.id} ${day.dayName} has valid dayIndex ${day.dayIndex}`);
    assert(day.classes.length > 0, `Preset ${preset.id} ${day.dayName} has scheduled classes`);
    for (const cls of day.classes) {
      assert(cls.start.length === 5 && cls.end.length === 5, `Class ${cls.subject} has valid HH:MM time (${cls.start} - ${cls.end})`);
      assert(cls.subject.length > 0, `Class has subject title`);
    }
  }
}

console.log(`\n=== TEST RESULTS: ${passed}/${passed + failed} PASSED ===\n`);

if (failed > 0) {
  process.exit(1);
}
