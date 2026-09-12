# Post-Leave Extra Leave Days Allowance (Staying Above 65% and 70%)

## Overview
We enhanced the **Date Range Leave (X to Y)** simulator within the **"Can I Skip"** feature to answer:
> *"After taking my leave from date $X$ to date $Y$, how many **maximum additional instructional days** can I leave/bunk across the rest of the semester so that **every single subject** still stays above **70%** and above **65%**?"*

---

## What Was Added

### 1. Mathematical Simulation Engine ([`skipSimulator.js`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/utils/skipSimulator.js))
- **Day-by-Day Constraint Checker**:
  - Iterates forward across all scheduled instructional days in `postLeaveDays` (from date $Y + 1$ to `semesterEndDate`).
  - Simulates missing full instructional days and checks every subject's resulting semester percentage:
    $$\text{Projected Attended} = \text{Final Semester Attended} - \text{Missed Post-Leave Classes}$$
    $$\text{Projected Converted \%} = \frac{\text{Projected Attended}}{\text{Final Semester Conducted}} \times 100$$
  - Stops as soon as any subject dips below the target threshold ($70\%$ or $65\%$).
- **Bottleneck Subject Detection**:
  - Identifies which specific subject is the limiting factor (the first course that would breach $70\%$ or $65\%$).
- **Subject-Level Missable Class Buffer**:
  - For each individual course, calculates the exact number of classes it can afford to miss:
    $$\text{Buffer} = \lfloor\text{Final Semester Attended} - (\text{Target \%} / 100) \times \text{Final Semester Conducted}\rfloor$$

---

### 2. Dedicated UI Section ([`SkipSimulatorPage.jsx`](file:///C:/Users/Adarsh%20Singh/.gemini/antigravity/brain/92c7ac22-4c42-4766-9d32-69ab00208a49/scratch/attendance-tracker/src/pages/SkipSimulatorPage.jsx))
1. **Post-Leave Extra Leave Allowance Banner**:
   - **Target $\ge 70\%$ Card**: Displays the maximum number of instructional days you can leave post-leave, with status pill and callout of the bottleneck subject.
   - **Critical Limit $\ge 65\%$ Card**: Displays the maximum number of instructional days you can leave before reaching debarment territory, with status pill and limiting subject.
2. **Subject Breakdown Table Enhanced**:
   - Added **Post-Leave Buffer ($\ge 70\%$)**: Shows exact individual classes each subject can spare.
   - Added **Post-Leave Buffer ($\ge 65\%$)**: Shows critical debarment safety margin per subject.

---

## Verification & Deployment
- **Unit Tests**: All **431 unit tests** passing (`npm test` exited 0).
- **Production Build**: `npx vite build` completed cleanly.
- **Git Repository**: Pushed to `origin main` (commit `b9c06ef`).
