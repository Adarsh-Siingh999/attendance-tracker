# 📊 AttendanceFlow SaaS — Modern Academic Attendance Management Platform

[![React](https://img.shields.io/badge/React-19.2.8-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.2-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-emerald.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-33%2F33%20Passing-success.svg)](src/utils/testAttendanceCalculations.js)

**AttendanceFlow SaaS** is a modern, mobile-responsive, multi-user attendance tracking and forecasting platform designed specifically for college students and institutions (with **Galgotias University** presets). It transforms attendance tracking from a passive chore into an active, predictive academic copilot.

Every student gets their own isolated profile, semesters, custom subjects, weekly timetables, academic calendars, daily attendance logs, and an intelligent **"Can I Skip?" consequence simulator**.

---

## ✨ Features at a Glance

### 👥 1. Full Authentication Gate, Email/Password & Google Login
- **Secure Email & Password Sign In**: Sign in with college or personal email (e.g. Gmail) and password with show/hide toggle.
- **Clean Slate Guarantee for New Students**: When a new user registers with a new email, **everything starts 100% fresh** (their own private profile, empty course list, fresh timetable, and 0% attendance baseline).
- **Local Seed Account (Adarsh Singh)**: Adarsh Singh's Semester V record (`singhadarshkr836@gmail.com`, 45/77 baseline attendance, 7 subjects) is saved locally and accessible via 1-click demo button or email sign-in.
- **Google OAuth Simulation**: Single-click "Continue with Google" sign-in for frictionless access.
- **Sign Out & Account Switcher**: Easy sign out from top header or sidebar to switch between students.

### 📖 2. Interactive New User Onboarding Guide
- Built-in multi-step walkthrough tailored for university attendance rules:
  - **75% Mandatory Target**: Eligibility threshold required to appear for End-Term Examinations (ETE).
  - **65% Debarment Boundary**: Critical warning line to prevent admit card withholding.
  - **Component Breakdown**: How PP (Programming/Practical), PR (Practical), and Lectures are aggregated.
  - **Timetable AI Mapping & Consequence Simulator**: How to safely use the platform without jeopardizing standing.

### 🛡️ 3. Immutable Past Attendance & Timetable Versioning
- **Edit Timetables Without Affecting Past History**:
  - Class metadata (`subject`, `code`, `type`, `status`) is snapshotted upon marking attendance.
  - Updating or removing a class from the weekly timetable only applies from today onward.
  - Historical records, streaks, and previous percentages remain **100% immutable and accurate**.
  - Supports schedule versioning with effective date ranges.

### 🚀 4. Galgotias Semester VI Setup Wizard with 1-Week Timetable AI Mapping
- **1-Week Input → Full-Semester Schedule**:
  - Simply enter your **1-week weekly timetable** (Monday to Saturday) once.
  - The AI projection engine repeats the weekly timetable across all 18 instructional weeks of the academic calendar (`2027-01-18` to `2027-05-28`).
  - Automatically accounts for official holidays (Republic Day, Maha Shivratri, Holi, Ambedkar Jayanti) and examination study leaves (MTE, ETE), while including instructional tests (IA2, Practicals).
  - Instantly computes projected conducted classes (~240+ periods) so forecasting and skip simulation work on Day 1!

### 📚 5. Dynamic Subject Directory & Custom Components
- Add, edit, and delete courses with custom course codes, credits, and color tags.
- Flexible component configurator: supports **Lecture**, **Lab**, **Tutorial**, **Practical**, or university components like **PP** and **PR** with individual attended and conducted counts.

### 🗓️ 6. Academic Calendar & Daily Attendance Logger
- Interactive monthly calendar with visual badges:
  - **Class Days**: scheduled periods for that day.
  - **Holidays**: university holidays.
  - **Examinations**: distinguishes between instructional tests and study leaves.
  - **Weekends**: configurable non-working days.
  - **Non-Instructional Days**: cancel classes for specific days if university is closed.
- Date inspector panel with 1-tap **Present ✓** and **Absent ✗** marking.

### 💤 7. "Can I Skip?" Absence Consequence Simulator
- Dedicated absence consequence engine that answers: *"Can I skip tomorrow or this specific class?"*
- Select a date or specific periods to simulate skipping.
- Instant high-contrast verdict:
  - 🟢 **SAFE TO SKIP**: All courses remain $\ge$ your eligibility threshold.
  - 🟡 **PROCEED WITH CAUTION**: One or more courses drop below the required threshold.
  - 🔴 **DO NOT SKIP**: Attendance drops into the critical shortage boundary ($< 65\%$).
- Comprehensive impact table showing exact drop deltas (e.g. $75.0\% \rightarrow 71.4\%$, $-3.6\%$).

### 🔮 8. Attendance Forecasting & Mathematical Recovery Roadmap
- Course-by-course and overall projections based on remaining timetable classes in the semester.
- Calculates:
  - **Best Achievable Attendance**: maximum percentage if all remaining classes are attended.
  - **Required Consecutive Classes**: exact classes needed to cross the target threshold.
  - **Maximum Safe Absences**: number of classes you can miss while maintaining eligibility.
  - **Recovery Feasibility**: mathematically evaluates whether recovery is possible given remaining schedule.

### ✨ 9. AI Academic Calendar Importer
- Upload official university calendar notices (PDF or Image).
- Multimodal OCR/AI parsing extracts semester boundaries, holidays, and exam timeframes.
- **Human-in-the-loop review table**: inspect, edit titles or dates, toggle "Counts as class", and confirm before applying.

### 🔗 10. Public Shareable Profiles & Privacy Controls
- Generate a read-only vanity link (`/u/:publicSlug`) to share verified attendance with parents or advisors.
- Granular privacy toggles: show/hide overall attendance, subject names, course codes, timetable, and institution.

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
| **State & Auth** | React Context + Multi-Tenant Store | Namespaced user storage, event bus, and optimistic updates |
| **Persistence** | LocalStorage + Supabase Cloud | Resilient offline mode with PostgreSQL cloud sync & RLS |
| **Icons** | Custom Inline SVG Icons | Zero-dependency, lightweight, high-performance icons |
| **Testing** | Automated Node.js Test Suite | 25 unit tests covering calculations, versioning, and AI schedule mapping |

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
    │   ├── auth/              # Authentication & user switching
    │   │   └── AuthModal.jsx  # Login, Register, & Profile Switcher dialog
    │   ├── common/            # Reusable UI primitives
    │   │   ├── Badge.jsx      # Semantic status badges
    │   │   ├── Button.jsx     # Button variants (primary, secondary, outline, ghost)
    │   │   ├── Modal.jsx      # Accessible dialog with backdrop blur & ESC dismiss
    │   │   ├── EmptyState.jsx # Actionable empty state placeholders
    │   │   ├── Icons.jsx      # Zero-dependency inline SVG icon library
    │   │   ├── UserGuideModal.jsx      # Galgotias student onboarding guide
    │   │   └── SemesterWizardModal.jsx # Semester VI 1-week timetable mapper
    │   └── layout/            # Navigation layout
    │       ├── Sidebar.jsx    # Desktop collapsible sidebar with user profile widget
    │       ├── Header.jsx     # Top bar with status pill & user switcher button
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
    │   ├── TimetablePage.jsx      # Interactive weekly schedule builder with versioning
    │   ├── CalendarPage.jsx       # Academic calendar & date-wise attendance logger
    │   ├── SkipSimulatorPage.jsx  # "Can I Skip?" absence impact engine
    │   ├── ForecastPage.jsx       # Recovery projections & required classes table
    │   ├── CalendarImportPage.jsx # AI calendar notice uploader & review table
    │   ├── PublicProfilePage.jsx  # Public shareable link & privacy controls
    │   └── SettingsPage.jsx       # Semester manager, threshold rules, & data export
    ├── services/
    │   ├── storageService.js  # Multi-user repository layer, auth, & timetable versioning
    │   └── supabaseClient.js  # Cloud database & auth connector
    └── utils/
        ├── attendanceCalculations.js     # Pure math calculation engine
        ├── skipSimulator.js              # Absence simulation engine
        ├── academicCalendarUtils.js      # Timetable versioning, calendar & AI schedule mapper
        ├── timetableUtils.js             # Timetable schedule extraction
        ├── futureAttendance.js           # Upcoming class projection helpers
        └── testAttendanceCalculations.js # Automated test runner (25/25 passing)
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
Open your browser at `http://localhost:5173`. The application runs immediately in **full-featured mode** with Galgotias Semester V data preserved!

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
Galgotias University  
GitHub: [@Adarsh-Siingh999](https://github.com/Adarsh-Siingh999)

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).