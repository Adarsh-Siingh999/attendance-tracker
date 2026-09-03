/**
 * Automated Test Suite for Cross-Device Live State Synchronization
 */

import { storageService } from "../services/storageService.js";
import {
  compressState,
  decompressState,
  generateDeviceSyncUrl,
} from "../services/crossDeviceSyncService.js";
import { calculateOverallAttendance } from "./attendanceCalculations.js";

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

async function runTests() {
  console.log("=== RUNNING CROSS-DEVICE SYNC TESTS ===");

  // 1. Compression / Decompression Roundtrip
  console.log("\n1. Compression & Decompression Roundtrip Tests:");
  const sampleState = {
    version: "3.0.0",
    user: { id: "user-phone-123", name: "Adarsh Phone", email: "phone@example.com" },
    exportedAt: new Date().toISOString(),
    profile: {
      id: "user-phone-123",
      fullName: "Adarsh Singh",
      institution: "Galgotias University",
      program: "B.Tech CSE (AIML)",
      avatarInitials: "AS",
    },
    semesters: [{ id: "sem-5-2026", name: "Semester V", isActive: true }],
    activeSemester: "sem-5-2026",
    subjects: [
      {
        id: "sub-pdp",
        name: "Problem-Driven Programming",
        code: "R1UC544B",
        components: {
          PP: { attended: 15, conducted: 18 },
          PR: { attended: 12, conducted: 14 },
        },
      },
      {
        id: "sub-ml",
        name: "Machine Learning",
        code: "R1UC525B",
        components: {
          PP: { attended: 8, conducted: 10 },
          PR: { attended: 9, conducted: 10 },
        },
      },
    ],
    timetables: {
      "sem-5-2026": {
        2: [
          { start: "08:30", end: "09:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
        ],
      },
    },
    calendars: {
      "sem-5-2026": {
        holidays: [{ date: "2026-10-02", name: "Mahatma Gandhi Jayanti" }],
        examinations: {},
      },
    },
    attendanceRecords: {
      "sem-5-2026": {
        "2026-09-02": {
          0: { status: "present", subject: "Problem-Driven Programming", code: "R1UC544B" },
        },
        "2026-09-03": {
          0: { status: "absent", subject: "Problem-Driven Programming", code: "R1UC544B" },
        },
      },
    },
    publicSettings: { isPublicEnabled: true, publicSlug: "adarsh-live" },
  };

  const compressed = await compressState(sampleState);
  assert(Boolean(compressed), "Compressed state to string");
  assert(compressed.startsWith("gz_") || compressed.startsWith("raw_"), "Compressed string has format prefix");
  assert(compressed.length < 2000, `Compressed string is URL-safe and compact (${compressed.length} chars)`);

  const decompressed = await decompressState(compressed);
  assert(Boolean(decompressed), "Successfully decompressed token");
  assertEqual(decompressed.profile.fullName, sampleState.profile.fullName, "Student name preserved exactly");
  assertEqual(decompressed.profile.institution, sampleState.profile.institution, "Institution preserved exactly");
  assertEqual(decompressed.subjects.length, 2, "Subjects count preserved");
  assertEqual(decompressed.subjects[0].components.PP.attended, 15, "Subject component attended count preserved");
  assertEqual(decompressed.attendanceRecords["sem-5-2026"]["2026-09-02"][0].status, "present", "Marked attendance record snapshot preserved");

  // 2. Storage Service Hydration on New Device
  console.log("\n2. Storage Service Import / Hydration Tests:");
  const importedUser = storageService.importAllData(decompressed, { makeActive: true });
  assert(Boolean(importedUser), "importAllData returned user summary");
  assertEqual(importedUser.id, "user-phone-123", "User ID assigned correctly");

  const activeUserId = storageService.getCurrentUserId();
  assertEqual(activeUserId, "user-phone-123", "Imported user is made active immediately");

  const hydratedProfile = storageService.getProfile();
  assertEqual(hydratedProfile.fullName, "Adarsh Singh", "Hydrated profile name matches");

  const hydratedSubjects = storageService.getSubjects("sem-5-2026");
  assertEqual(hydratedSubjects.length, 2, "Hydrated subjects array length matches");
  assertEqual(hydratedSubjects[0].code, "R1UC544B", "Hydrated subject course code matches");

  const hydratedRecords = storageService.getAttendanceRecords("sem-5-2026");
  assertEqual(hydratedRecords["2026-09-02"][0].status, "present", "Hydrated attendance record matches phone state");

  // 3. Overall Attendance Calculation Parity Across Devices
  console.log("\n3. Overall Attendance Parity Verification:");
  const phoneOverall = calculateOverallAttendance(sampleState.subjects, sampleState.attendanceRecords["sem-5-2026"]);
  const laptopOverall = calculateOverallAttendance(hydratedSubjects, hydratedRecords);

  assertEqual(laptopOverall.percentage.toFixed(2), phoneOverall.percentage.toFixed(2), "Attendance percentage on new device exactly matches phone");
  assertEqual(laptopOverall.totalAttended, phoneOverall.totalAttended, "Total attended classes match exactly");
  assertEqual(laptopOverall.totalConducted, phoneOverall.totalConducted, "Total conducted classes match exactly");

  // 4. Shareable Live Sync URL Generation
  console.log("\n4. Live Sync URL Generation Tests:");
  const syncInfo = await generateDeviceSyncUrl("https://attendance-tracker-adarsh.vercel.app");
  assert(syncInfo.url.startsWith("https://attendance-tracker-adarsh.vercel.app#sync="), "Sync URL has clean domain and hash anchor");
  assert(syncInfo.tokenLength > 50, "Sync URL has valid non-empty state payload");

  // Test decompressing from generated sync URL
  const hashPart = syncInfo.url.split("#sync=")[1];
  const rehydrated = await decompressState(hashPart);
  assertEqual(rehydrated.profile.fullName, "Adarsh Singh", "State reconstructed cleanly from Vercel sync URL hash");

  console.log(`\n=== CROSS-DEVICE SYNC TEST RESULTS: ${passed}/${passed + failed} PASSED ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
