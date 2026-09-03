# AttendanceFlow — Total Classes, Absence Budget & August Baseline Timetable

## 1. 🎯 Maximum Allowed Absences & Total Classes Engine

We conducted a complete mathematical and architectural audit of the **Max Absences Allowed** logic, comparing past conducted classes with future timetable classes projected through the official academic calendar.

### Mathematical Foundations:
For any course (and overall):
- $C = \text{conducted classes recorded so far}$
- $A = \text{attended classes recorded so far}$
- $M = C - A = \text{classes missed / absent so far}$
- $F = \text{future classes remaining}$ (projected by repeating the weekly timetable through all instructional dates in the academic calendar, excluding holidays, non-instructional days, exams with `countsAsClass: false`, and weekends).
- $T = C + F = \text{Total Semester Classes}$.
- $P_{\text{target}} = \text{eligibility threshold}$ (e.g., $75\% = 0.75$, $65\% = 0.65$).

### The 4 Distinct Metrics Calculated:

1. **Total Semester Absence Budget**:
   $$\text{Max Total Absences in Semester} = \lfloor (1 - P_{\text{target}}) \times T \rfloor = \lfloor (1 - P_{\text{target}}) \times (C + F) \rfloor$$

2. **Absences Already Missed**:
   $$\text{Missed So Far} = C - A$$

3. **Remaining Safe Skips (Future Allowed Absences)**:
   $$\text{Remaining Safe Skips} = \text{Max Total Absences} - \text{Missed So Far}$$

4. **Immediate Consecutive Bunks (Right Now)**:
   $$\text{Immediate Bunks} = \max(0, \lfloor \frac{A}{P_{\text{target}}} - C \rfloor)$$

---

## 2. 📅 August Baseline Timetable vs. September 1 Live Tracking

### The Architecture:
1. **August Baseline Period (`2026-08-01` to `2026-08-31`)**:
   - Uses the **`August Baseline Timetable`** (`augustSemesterTimetable` / version `semester-v-august-baseline`).
   - Attendance for all of August is preserved in the student's initial baseline ($45$ attended / $77$ conducted).
   - In [`AppContext.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/context/AppContext.jsx), dates prior to `liveAttendanceStart` (`2026-09-01`) are excluded from daily live summation, preventing double-counting while preserving exact historical dates.
   - In [`CalendarPage.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/CalendarPage.jsx), August dates display a gold banner:
     `📌 August Baseline Period: Historical classes use the August Baseline Timetable. Attendance is preserved as your initial baseline (45/77).`
   - Day Inspector clearly labels August dates as `📌 August Baseline Timetable (Pre-Sept 1)`.

2. **September Onward Live Tracking (`2026-09-01` to `2026-12-31`)**:
   - Uses the revised **`September Onward Timetable`** (`semesterTimetable` / version `semester-v-september-current`).
   - Active daily attendance logging increments live attendance on top of the August baseline.
   - Calendar and Day Inspector display an electric blue badge: `⚡ Live Attendance Active (September Onward Timetable)`.

---

## 3. 🧪 Automated Test Verification

- **`npm test`**: **329 / 329 tests passing (100%)**
  - `testAttendanceCalculations.js`: **66 / 66 passed** (including Section 16 testing August baseline timetable resolution, September timetable resolution, and live tracking boundaries).
  - `testAttendanceButtons.js`: **23 / 23 passed**
  - `testTimetableAi.js`: **218 / 218 passed**
  - `testCrossDeviceSync.js`: **22 / 22 passed**
- **Production Build**: `npx vite build` completed in **160ms** with 0 errors.
