# Calendar Default to Current Date & Month

## Summary of Changes

When opening the Academic Calendar, the view now immediately opens focused on the **current date of the current month**, with today automatically pre-selected in the Day Inspector.

---

### 1. Default Month & Date Initialization
- In [CalendarPage.jsx](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/CalendarPage.jsx):
  - Previously, `currentDate` was initializing to the semester's `startDate` (e.g. August even if the user opens the app in September or October), and `selectedDate` was set to `null`.
  - Now, `currentDate` initializes dynamically to `new Date(today.getFullYear(), today.getMonth(), 1)`.
  - `selectedDate` initializes to `todayStr` (`YYYY-MM-DD`), so today's scheduled classes and attendance are immediately open in the inspector right away.

---

### 2. "Today" Highlighting & Quick Navigation
- **Today Cell Badge**:
  - The calendar cell for today is given `.today-cell` styling with a blue border and soft highlight.
  - A prominent blue **`TODAY`** pill badge is rendered alongside the day number.
- **"Today" Action Button**:
  - Added a **Today** button next to the month navigation arrows (`← Month Year → [Today]`).
  - If users navigate forward or backward across months to check future exams or past holidays, clicking **Today** immediately jumps back to the current date of the current month.
- **Intelligent Month Navigation**:
  - When flipping between months using `←` and `→`, if the user browses into the current month, today is automatically re-selected.

---

### 3. Verification & Build
- Ran `npm test`: **409 / 409 tests passed (100%)**.
- Ran `npx vite build`: Production bundle compiled cleanly in ~218ms.
- Committed and pushed commit `c43a287` to `main` on GitHub (`Adarsh-Siingh999/attendance-tracker`).
