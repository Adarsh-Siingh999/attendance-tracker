# 📊 AttendanceFlow SaaS — Modern Academic Attendance Management Platform

[![React](https://img.shields.io/badge/React-19.2.8-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-emerald.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-19%2F19%20Passing-success.svg)](src/utils/testAttendanceCalculations.js)

**AttendanceFlow SaaS** is a modern, responsive, multi-user attendance tracking and forecasting platform designed for college students and institutions. It transforms attendance tracking from a passive spreadsheet chore into an active, predictive academic assistant.

Every student gets their own isolated profile, semesters, custom subjects, weekly timetables, academic calendars, daily attendance logs, and an intelligent **"Can I Skip?" consequence simulator**.

---

## ✨ Features at a Glance

### 👥 1. Multi-Tenant Architecture & Data Isolation
- Completely isolated data per user and per semester (`User → Profile → Semesters → [Subjects, Timetable, Attendance, Calendar]`).
- Pluggable storage architecture: runs **100% locally out-of-the-box** with full seed data preservation, and connects seamlessly to **Supabase Cloud (PostgreSQL with Row-Level Security)** for cross-device synchronization.

### 🎓 2. Semester Lifecycle Management
- Transition between academic terms (e.g. **Semester V → Semester VI**) without overwriting historical records.
- Archive completed semesters, mark the active semester, or clone course lists into fresh semesters with zero attendance baseline.

### 📚 3. Dynamic Subject Directory & Custom Components
- Add, edit, and delete courses with custom course codes, credits, and color tags.
- Flexible class-type component configurator: supports **Lecture**, **Lab**, **Tutorial**, **Practical**, or specialized university components like **PP** (Programming/Practical) and **PR** (Practical) with individual attended and conducted counts.

### ⏰ 4. Interactive Weekly Timetable Builder
- Day-by-day weekly schedule editor (Monday through Sunday).
- Add class periods with start/end time pickers, course selectors, room/venue tags, and class types.
- Directly powers daily attendance checks, future projections, and absence consequence simulations.

### 🗓️ 5. Academic Calendar & Daily Attendance Logger
- Interactive monthly calendar with intelligent visual badges:
  - **Class Days**: scheduled periods for that day.
  - **Holidays**: official university holidays.
  - **Examinations**: distinguishes between instructional exams (IA tests/Practicals) and study leaves (MTE/ETE).
  - **Weekends**: configurable non-working days (e.g., Sunday + Monday or Saturday + Sunday).
  - **Non-Instructional Days**: toggle working days as non-instructional if university cancels classes.
- Date inspector panel with 1-tap **Present ✓** and **Absent ✗** marking for scheduled periods.

### 💤 6. "Can I Skip?" / "Can I Sleep?" Simulator
- Dedicated absence consequence engine that answers: *"Can I skip tomorrow or this specific class?"*
- Select a date or specific periods to simulate skipping.
- Instant high-contrast verdict:
  - 🟢 **SAFE TO SKIP**: All courses remain $\ge$ your configured eligibility threshold.
  - 🟡 **PROCEED WITH CAUTION**: One or more courses drop below the required threshold.
  - 🔴 **DO NOT SKIP**: Attendance drops into the critical shortage boundary ($< 65\%$).
- Comprehensive impact table showing exact drop deltas (e.g. $75.0\% \rightarrow 71.4\%$, $-3.6\%$) and flagging vulnerable courses.

### 🔮 7. Attendance Forecasting & Mathematical Recovery Roadmap
- Course-by-course and overall projections based on remaining timetable classes in the semester.
- Calculates:
  - **Best Achievable Attendance**: maximum percentage if all remaining classes are attended.
  - **Required Consecutive Classes**: exact classes needed to cross the target threshold.
  - **Maximum Safe Absences**: number of classes you can miss while maintaining eligibility.
  - **Recovery Feasibility**: mathematically evaluates whether recovery is possible given remaining schedule.

### ✨ 8. AI Academic Calendar Importer
- Upload official university calendar notices (PDF or Image).
- Multimodal OCR/AI parsing extracts semester boundaries, holidays, and exam timeframes.
- **Human-in-the-loop review table**: inspect, edit titles or dates, toggle "Counts as class", and confirm before applying to your live calendar.

### 🔗 9. Public Shareable Profiles & Privacy Controls
- Generate a read-only vanity link (`/u/:publicSlug`) to share verified attendance with parents, advisors, or mentors.
- Granular privacy toggles: choose to show/hide overall attendance, subject names, course codes, timetable, and institution.
- Integrated live visitor preview container.

---

## 📐 Mathematical Formulas

### Attendance Percentage
$$\text{Attendance \%} = \left( \frac{\text{Attended Classes}}{\text{Conducted Classes}} \right) \times 100$$

### Required Consecutive Classes to Reach Target Threshold ($T$)
Given attended classes $A$, conducted classes $C$, and target percentage $T$ (e.g., $75\%$):
$$\text{Required Classes} = \max\left(0, \; \left\lceil \frac{T \cdot C - 100 \cdot A}{100 - T} \right\rceil \right)$$

### Best Achievable Attendance with $R$ Remaining Classes
$$\text{Best Possible \%} = \left( \frac{A + R}{C + R} \right) \times 100$$

### Maximum Allowed Absences
Simulates maximum absences $X \le R$ such that:
$$\left( \frac{A + (R - X)}{C + R} \right) \times 100 \ge T$$

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Ultra-fast build, optimized bundle size, modern JSX transform |
| **Styling** | Custom SaaS CSS | Plus Jakarta Sans typography, responsive desktop sidebar + mobile bottom nav |
| **State & Data** | React Context + Repository Layer | Centralized reactive store with event bus and optimistic updates |
| **Persistence** | LocalStorage + Supabase Cloud | Resilient offline mode with PostgreSQL cloud sync |
| **Icons** | Custom Inline SVG Icons | Zero-dependency, lightweight, high-performance icons |
| **Testing** | Automated Node.js Test Suite | 19 unit tests covering all mathematical formulas and boundary cases |

---

## 📁 Project Structure

```text
attendance-tracker/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── public/                    # Icons and assets
└── src/
    ├── main.jsx               # Application entry
    ├── App.jsx                # SaaS shell (Sidebar, Header, BottomNav, Page Router)
    ├── index.css              # SaaS design system & responsive stylesheet
    ├── components/
    │   ├── common/            # Reusable UI primitives
    │   │   ├── Badge.jsx      # Semantic status badges
    │   │   ├── Button.jsx     # Button variants (primary, secondary, outline, ghost)
    │   │   ├── Modal.jsx      # Accessible dialog with backdrop blur & ESC dismiss
    │   │   ├── EmptyState.jsx # Actionable empty state placeholders
    │   │   └── Icons.jsx      # Zero-dependency inline SVG icon library
    │   └── layout/            # Navigation layout
    │       ├── Sidebar.jsx    # Desktop collapsible sidebar with semester switcher
    │       ├── Header.jsx     # Top bar with status pill & quick action buttons
    │       └── BottomNav.jsx  # Mobile thumb navigation bar
    ├── context/
    │   └── AppContext.jsx     # Centralized reactive SaaS state provider
    ├── data/
    │   ├── schema.sql         # PostgreSQL database schema with Row-Level Security (RLS)
    │   ├── seedData.js        # Historical Semester V seed records (Adarsh Singh)
    │   ├── academicCalendar.js# Legacy calendar reference
    │   ├── attendanceData.js  # Legacy data reference
    │   └── timetableData.js   # Legacy timetable reference
    ├── pages/
    │   ├── DashboardPage.jsx      # Executive dashboard & today's schedule
    │   ├── SubjectsPage.jsx       # Course directory & component manager
    │   ├── TimetablePage.jsx      # Interactive weekly schedule builder
    │   ├── CalendarPage.jsx       # Academic calendar & date-wise attendance logger
    │   ├── SkipSimulatorPage.jsx  # "Can I Skip?" absence impact engine
    │   ├── ForecastPage.jsx       # Recovery projections & required classes table
    │   ├── CalendarImportPage.jsx # AI calendar notice uploader & review table
    │   ├── PublicProfilePage.jsx  # Public shareable link & privacy controls
    │   └── SettingsPage.jsx       # Semester manager, threshold rules, & data export
    ├── services/
    │   ├── storageService.js  # Multi-tenant repository layer & migration engine
    │   └── supabaseClient.js  # Cloud database & auth connector
    └── utils/
        ├── attendanceCalculations.js     # Pure math calculation engine
        ├── skipSimulator.js              # Absence simulation engine
        ├── academicCalendarUtils.js      # Date range, holiday, exam resolution
        ├── timetableUtils.js             # Timetable schedule extraction
        ├── futureAttendance.js           # Upcoming class projection helpers
        └── testAttendanceCalculations.js # Automated test runner (19/19 passing)
```

---

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/Adarsh-Siingh999/attendance-tracker.git
cd attendance-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`. The application runs immediately in **full-featured mode** with your Semester V data preserved!

### 4. Build for production
```bash
npm run build
```

### 5. Run tests & lint
```bash
# Run calculation engine unit tests
node src/utils/testAttendanceCalculations.js

# Run code linter
npm run lint
```

---

## ☁️ Connecting Supabase Cloud (Optional)

The application works 100% offline out-of-the-box. To enable cross-device cloud synchronization:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard and run the schema script provided at [`src/data/schema.sql`](src/data/schema.sql).
3. Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
4. Restart the development server (`npm run dev`). Your data will now synchronize to the cloud with Row-Level Security!

---

## 👨‍💻 Author

**Adarsh Singh**  
B.Tech Computer Science & Engineering (AIML)  
GitHub: [@Adarsh-Siingh999](https://github.com/Adarsh-Siingh999)

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).