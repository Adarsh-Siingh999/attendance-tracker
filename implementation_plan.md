# Rebuild & Refactoring Plan: Universal Timetable, Dynamic Baseline, Instructional Days & AI Engine

## 1. Goal Description
The user needs the attendance tracker to work seamlessly for **any student joining on any date of any month**, without hardcoded August baseline assumptions trapping their attendance. In addition:
1. **Sundays are not official holidays by default**: Only explicitly declared holidays/exceptions are non-instructional. Classes scheduled on Sundays must render and be markable in the calendar without showing "Weekend".
2. **"Mark Day as Instructional" Feature**: Users can mark any day (including weekends or holidays) as an instructional working day (with an optional timetable day mapping, e.g. "Follow Monday Schedule" or date's regular schedule).
3. **Dynamic User Onboarding & Baseline**: New users joining on any date can set their initial attendance baseline up to their joining date, or start tracking live from day 1 without arbitrary historical cutoffs.
4. **Enhanced AI Timetable Upload Engine**: Robust multi-photo timetable upload, automated day-of-week detection (including Sundays), course extraction, room/type classification, and instant subject generation.

---

## 2. Proposed Architectural Changes

### A. Eliminate Hardcoded August Baseline & Make Baseline Dynamic
- **Problem**: `AppContext.jsx` hardcoded `liveStart = activeSemester?.liveAttendanceStart || "2026-09-01"` and skipped `date < liveStart`. `CalendarPage.jsx` had hardcoded `month === 7 && year === 2026` banners and `selectedDate < liveStart` banners.
- **Solution**:
  - Remove all hardcoded `2026-09-01` fallbacks and August-specific banners.
  - In `activeSemester`, introduce an optional `trackingStartDate` (defaulting to the semester's `startDate` or the user's account creation date).
  - For historical baseline: if a subject has initial `components` with attended/conducted counts, those counts represent the baseline prior to the user's live tracking. If the user marks attendance on any date, attendance is directly recorded and counted for that day without being dropped or forced into August.
  - In `CalendarPage.jsx`, replace the August-specific strip with a dynamic status indicator if a custom tracking start date is configured, or keep calendar fully live for all dates within the semester.

### B. Sunday & Weekend Handling
- **Problem**: `academicCalendar.js`, `academicCalendarUtils.js`, and `storageService.js` defaulted `weekends` to `[0, 1]` (Sunday & Monday) or `[0, 6]`. Any class scheduled on Sunday (day 0) was suppressed by `isWeekend` in `getClassesForDate`, and the calendar marked it as "Weekend".
- **Solution**:
  - For new semesters / general calendars, `weekends` should default to `[]` (no automatic weekend blocking) or only explicitly selected days by the user in Settings.
  - In `getClassesForDate`: If a day has classes scheduled in the timetable for that day of week, it is treated as **instructional** unless explicitly marked as a university holiday or non-instructional day!
  - Sunday classes uploaded or scheduled in the timetable will immediately display, allow attendance marking, and never show "Weekend" if classes exist.

### C. "Mark Day as Instructional" Override
- **Feature**:
  - Add `instructionalOverrides` / `specialInstructionalDays` to the calendar schema:
    ```js
    specialInstructionalDays: [
      { date: "2026-09-13", scheduleDay: 0, note: "Working Sunday" } // or uses date's day of week
    ]
    ```
  - In `CalendarPage.jsx`:
    - In the Day Inspector, provide a quick action button: **"Mark as Instructional Day"** (with optional prompt to select timetable day schedule or use default).
    - If a day is marked as instructional, it overrides weekend status and non-instructional status.
    - Provide a button to "Revert to Non-Instructional / Holiday" if already overridden.
  - Update `getClassesForDate` and `generateSemesterScheduleFromTimetable` to prioritize `specialInstructionalDays`.

### D. AI Timetable Upload Engine Upgrade ([`timetableAiService.js`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/services/timetableAiService.js) & [`TimetableAiModal.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/components/common/TimetableAiModal.jsx))
- **Enhancements**:
  - Support Sunday (day index 0) explicitly in AI extraction prompt, normalization, and sample presets.
  - Support multi-image upload (e.g. uploading photos of Monday, Tuesday, Sunday simultaneously).
  - Enhanced Vision prompt with high-accuracy day recognition (Sunday to Saturday), period timing formats (AM/PM and 24h), course codes, and lab/theory categorization.
  - Auto-generate subject cards with proper credit weights and component structures directly into user storage upon confirmation.
  - Improved error handling with fallback to heuristic OCR text parsing if API key is invalid or rate-limited.

---

## 3. Files to Modify

| Component | File | Changes |
|---|---|---|
| Calendar Engine | `src/utils/academicCalendarUtils.js` | Support Sunday classes, `specialInstructionalDays` override, remove hardcoded `[0, 1]` weekend fallback. |
| State & Context | `src/context/AppContext.jsx` | Remove hardcoded August baseline (`liveStart = 2026-09-01`), allow attendance on any date to count properly, integrate `specialInstructionalDays`. |
| Storage & Schema | `src/services/storageService.js` | Update clean user partition template, support `specialInstructionalDays`, ensure fresh user profiles don't inherit old baseline dates. |
| Calendar Page UI | `src/pages/CalendarPage.jsx` | Remove hardcoded August banners, add "Mark as Instructional Day" / "Unmark Instructional Day" toggle buttons and modal in Day Inspector. |
| AI Service | `src/services/timetableAiService.js` | Improve Gemini Vision prompt for all 7 days (including Sunday), multi-photo support, accurate course code and type extraction. |
| AI Modal UI | `src/components/common/TimetableAiModal.jsx` | Allow multiple photo drops, clear Sunday indicator, preview of extracted days before applying. |
| Tests | `src/utils/testAttendanceCalculations.js` & new tests | Test Sunday timetable rendering, instructional day overrides, and any-month dynamic onboarding. |

---

## 4. Verification Plan

### Automated Tests
- Run `npm test` verifying all 329+ unit tests continue to pass.
- Add new test cases:
  1. Sunday class scheduling: verify `getClassesForDate` returns Sunday classes and doesn't mark as weekend when timetable has Sunday periods.
  2. Marking a holiday or weekend date as an instructional day properly returns scheduled classes.
  3. User onboarding on arbitrary date (e.g. Oct 15) records attendance without being skipped.
  4. AI timetable parser correctly parses Sunday schedules.

### Manual Verification
- Test creating a new user profile, uploading/adding Sunday classes, and verifying Sunday displays classes in Calendar without showing "Weekend".
- Test the "Mark as Instructional Day" button on a holiday or weekend day.
- Run `npx vite build` to ensure clean production compilation.
