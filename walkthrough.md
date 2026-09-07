# Baseline Attendance Integration & Marking Lock

## Summary of Changes

To prevent double-counting and calculation errors when editing component balances (like **PP**, **PR**, **Lecture**, and **Lab**) from university ERP reports, we implemented a baseline cut-off date system. Component counts edited in Subjects now serve strictly as the opening baseline, and attendance marking is locked for all dates on or before the baseline cut-off date.

---

### 1. Subject Component Integration (PP & PR)
- **Component Breakdown Support**:
  - When users add or edit subjects in [SubjectsPage](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/SubjectsPage.jsx), they can configure components like `PP` (Practical/Project), `PR` (Practical Lab), `Lecture`, etc., with custom attended and conducted counts.
  - Added quick-add shortcut chips for `+ PP`, `+ PR`, `+ Lecture`, `+ Lab`, `+ Tutorial` directly in the subject editor.
  - Added a baseline notification banner displaying the active cut-off date and explaining that component numbers establish the ERP opening balance.
  - Provided inline cut-off date adjustment directly on the Subjects page.
- **Mid-Semester Setup Modal**:
  - Updated [MidSemesterSetupModal](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/components/common/MidSemesterSetupModal.jsx) to display and edit component balances (PP, PR, Lecture) individually.
  - Automatically updates the semester's `baselineDate` to the selected ERP report cut-off date upon saving.

---

### 2. Double-Counting Prevention & Strict Attendance Locking
- **AppContext Filtering**:
  - In [AppContext.jsx](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/context/AppContext.jsx), `recordedAttendance` skips any attendance marks recorded on or before `baselineDate`.
  - `markAttendance` checks `isDateInBaseline(dateStr)`. If the date is on or before `baselineDate`, marking is immediately rejected.
- **Calendar Day Inspector Locking**:
  - In [CalendarPage.jsx](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/CalendarPage.jsx), days within the baseline period show a `🔒 Baseline Period (Locked)` banner.
  - Attendance pills are disabled (`disabled={isSelectedInBaseline}`), have a locked tooltip, and quick bulk actions are replaced with a `🔒 Baseline Attendance Locked` badge.
- **Dashboard Schedule Locking**:
  - In [DashboardPage.jsx](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/DashboardPage.jsx), if today falls on or before `baselineDate`, a locked notification banner is shown and the `Present` / `Absent` buttons are disabled with `🔒 Baseline` and `🔒 Locked` indicators.

---

### 3. Verification & Testing
- Added **Test Suite 6** in [testAllNewFeatures.js](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/utils/testAllNewFeatures.js):
  - Created subject with `PP: 9/10` and `PR: 11/13` (Total: `20/23 = 86.96%`).
  - Verified baseline cut-off at `2026-09-05` identifies `2026-08-30` and `2026-09-05` as locked, and `2026-09-06` as live.
  - Verified historical records on `2026-09-03` and `2026-09-05` are safely excluded from live attendance to prevent double-counting.
  - Verified live classes marked on `2026-09-08` and `2026-09-09` accumulate cleanly to `21/25 = 84.0%`.
- Ran full test suite: **409 / 409 tests passed (100%)**.
- Ran production build: **Vite build completed cleanly with 0 errors**.
- Changes committed and pushed to GitHub repository (`Adarsh-Siingh999/attendance-tracker`).
