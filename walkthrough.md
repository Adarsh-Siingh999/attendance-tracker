# AttendanceFlow — Total Classes, Absence Budget & Projection Audit

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
   *Example*: In a course with 30 conducted so far and 30 upcoming in the timetable ($T = 60$), the total 75% semester absence budget is $\lfloor 0.25 \times 60 \rfloor = 15$ classes.

2. **Absences Already Missed**:
   $$\text{Missed So Far} = C - A$$
   *Example*: Attended 26 out of 30 conducted classes $\rightarrow$ $30 - 26 = 4$ absences used.

3. **Remaining Safe Skips (Future Allowed Absences)**:
   $$\text{Remaining Safe Skips} = \text{Max Total Absences} - \text{Missed So Far}$$
   *Example*: $15 - 4 = 11$ safe skips remaining out of the 30 future classes.
   If the student skips 11 of the 30 upcoming classes and attends 19, their final attendance is:
   $$\frac{26 + 19}{60} = \frac{45}{60} = 75.0\% \text{ (Eligible)}$$
   If they were to skip 12 classes, their final attendance is $44/60 = 73.33\% < 75\%$ (Ineligible).
   Thus, 11 is the exact, mathematically proven maximum safe future absences!
   *(If missed so far exceeds the budget, remaining safe skips is 0, and recovery is flagged as unrecoverable).*

4. **Immediate Consecutive Bunks (Right Now)**:
   $$\text{Immediate Bunks} = \max(0, \lfloor \frac{A}{P_{\text{target}}} - C \rfloor)$$
   *Example*: Without needing future classes, how many classes can a student skip consecutively right now without dipping below 75%? $\lfloor 26 / 0.75 - 30 \rfloor = 4$ classes.

---

## 2. 🖥️ Visual Enhancements Across the App

### 1. Subject Cards ([`SubjectsPage.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/SubjectsPage.jsx))
- **Semester Projection Banner**:
  - **Total Semester Classes**: e.g., `Total: 60 classes (30 conducted + 30 upcoming in timetable)`
  - **Semester Absence Budget**: e.g., `15 max allowed (4 used • 11 safe skips left)`
- **Max Absences Target Box**: Displays safe skips left with budget breakdown subtitle.
- **Component Breakdown (PP / PR / Lecture / Lab)**: Each individual component now compares its conducted count with its upcoming timetable frequency.

### 2. Projections & Roadmap ([`ForecastPage.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/ForecastPage.jsx))
- **Total Semester Classes Card**: Displays total classes across all enrolled subjects.
- **Course-by-Course Table**: Shows Total Semester Classes ($C + F$) and full Max Absences Budget breakdown per subject.

---

## 3. 🧪 Automated Test Verification

- **`npm test`**: **324 / 324 tests passing (100%)**
  - `testAttendanceCalculations.js`: **61 / 61 passed** (including Section 15 testing total classes, absence budget, edge cases, and timetable comparisons).
  - `testAttendanceButtons.js`: **23 / 23 passed**
  - `testTimetableAi.js`: **218 / 218 passed**
  - `testCrossDeviceSync.js`: **22 / 22 passed**
- **Production Build**: `npx vite build` completed in **212ms** with 0 errors.
