# Date Range Leave Simulator (X to Y)

## Summary of Changes

Added a new **Date Range Leave (X to Y)** simulation mode to the **"Can I Skip?"** simulator that evaluates whether a student can take leave from Date X to Date Y, assuming 100% attendance from present until departure date X, and reports whether the student will remain eligible upon return, including specific callouts of any subjects dropping below required thresholds.

---

### 1. Simulation Engine (`simulateDateRangeLeave`)
- Located in [skipSimulator.js](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/utils/skipSimulator.js):
  - **Interim Period (`[Today + 1, X - 1]`)**: Resolves scheduled classes using the academic calendar and timetable and marks them as **100% attended** (+1 attended, +1 conducted).
  - **Leave Period (`[X, Y]`)**: Resolves scheduled classes across all days in the range (excluding weekends, holidays, and non-instructional days) and marks them as **missed** (+0 attended, +1 conducted).
  - **Post-Leave Attendance**:
    $$\text{Final Attended} = \text{Current Attended} + \text{Interim Attended}$$
    $$\text{Final Conducted} = \text{Current Conducted} + \text{Interim Attended} + \text{Missed in Leave}$$
    $$\text{Projected Percentage} = \frac{\text{Final Attended}}{\text{Final Conducted}} \times 100$$
  - **Subject Categorization**:
    - **Ineligible Subjects**: Specific subjects dropping below the required threshold ($< 75\%$).
    - **Critical Debarment Risk**: Subjects dropping into the danger zone ($< 65\%$).
    - **Eligible Subjects**: Subjects that maintain $\ge 75\%$ attendance.

---

### 2. User Interface (`SkipSimulatorPage`)
- Located in [SkipSimulatorPage.jsx](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/SkipSimulatorPage.jsx):
  - **Mode Selector**: Added `🗓️ Date Range Leave (X to Y)` button alongside `Skip Tomorrow` and `Single Specific Date`.
  - **Date Range Inputs**:
    - Start Date (X): Date leave begins.
    - End Date (Y): Date leave ends.
    - Quick range presets: `Next 3 Days`, `Next 5 Days`, `1 Week (7 Days)`, and `2 Weeks`.
  - **Leave Summary Metrics Strip**:
    - Total Leave Duration (calendar days)
    - Instructional Class Days (active teaching days)
    - Total Classes Missed in Range
    - Interim Classes Attended prior to leave
  - **Simulation Verdict Banner**:
    - Color-coded verdict (Green: `All Eligible`, Yellow: `Shortage Warning`, Red: `Debarment Risk`).
    - Overall attendance before vs. right after leave (`XX.X% → YY.Y%`).
  - **Specific Ineligible Subjects Alert Box**:
    - If any subjects drop below 75%, an alert highlights the **exact course names, course codes, current %, post-leave %, drop %, and classes missed**.
    - If no subjects drop below threshold, a congratulatory box confirms that all courses remain fully eligible ($\ge 75\%$).
  - **Complete Subject-by-Subject Impact Breakdown Table**:
    - Lists all registered courses with Missed Classes, Interim Attended, Current %, Projected %, Drop %, and status badge.
  - **Collapsible Day-by-Day Leave Itinerary**:
    - Expandable list showing each day in the range [X, Y], the day of the week, and the specific classes scheduled.

---

### 3. Verification & Testing
- Added **Test Suite 7** in [testAllNewFeatures.js](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/utils/testAllNewFeatures.js):
  - Tested leave simulation for 3 subjects (High buffer, fragile margin, low margin).
  - Verified interim classes (7 classes) are credited as attended.
  - Verified classes during leave (10 classes) are counted as missed.
  - Verified `CN301` remains eligible at 85.45%.
  - Verified `DB201` drops below 75% to 73.33% and is identified in `ineligibleSubjects`.
  - Verified `OS401` drops to 65.0% and is identified in `ineligibleSubjects`.
  - Ran full test suite: **427 / 427 tests passed (100%)**.
  - Production Vite build succeeded with 0 errors.
  - Pushed commit `7cc766b` to GitHub (`Adarsh-Siingh999/attendance-tracker`).
