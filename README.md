# 📊 Attendance Tracker

A modern, responsive web-based attendance management system designed to help students track their academic attendance, monitor eligibility, analyze subject-wise performance, and forecast future attendance.

The project is currently designed as a React-based personal attendance tracker and is being developed toward a more flexible, multi-user platform where students can configure their own academic information and share their attendance through view-only links.

---

## 🚀 Project Overview

Keeping track of attendance across multiple subjects, practical classes, holidays, examinations, and changing timetables can become difficult.

**Attendance Tracker** aims to solve this problem by providing a centralized dashboard where students can:

- Monitor overall attendance.
- Track attendance subject-wise.
- Record daily attendance.
- View academic dates through an interactive calendar.
- Check eligibility against a required attendance percentage.
- Calculate classes required to recover attendance.
- Determine the maximum number of classes that can be missed.
- Forecast the best possible attendance.
- Identify subjects requiring attention.
- Manage attendance records using a simple interface.

The project is being developed with scalability in mind so that it can eventually support multiple students with separate personal data and shareable attendance profiles.

---

# ✨ Current Features

## 📈 Overall Attendance Dashboard

The dashboard provides a quick overview of:

- Overall attendance percentage
- Total classes attended
- Total classes conducted
- Current eligibility status
- Remaining classes

Example:

```text
Overall Attendance
58.44%

45 / 77 classes


📚 Subject-Wise Attendance

Attendance is calculated independently for every subject.

Each subject displays:

Subject name
Subject code
Attendance percentage
Attended classes
Conducted classes
Eligibility status
Future classes
Required classes
Maximum allowed absences
🧩 PP / PR Component Support

Subjects can contain different academic components such as:

PP — Practical/Programming component
PR — Practical component

Attendance from the individual components is combined to calculate the subject's overall attendance.

Example:

PP: 9 / 10
PR: 11 / 13

Total: 20 / 23
Attendance: 86.96%
📅 Attendance Calendar

The application contains an interactive academic calendar.

The calendar can display:

Regular class days
Weekends
Holidays
Examinations
Examination days that count as classes
Historical dates
Non-instructional days
Days outside the semester
Attendance records

Users can select a date to view detailed information about that day.

📝 Daily Attendance Recording

For classes that have already taken place, attendance can be recorded as:

Present
Absent

Attendance records are stored date-wise.

Example structure:

{
  "2026-09-01": {
    "R1UC544B": {
      "PP": "present",
      "PR": "absent"
    }
  }
}

Only classes that have actually been marked are stored.

💾 Local Data Persistence

Attendance records are currently stored using the browser's:

localStorage

This allows attendance data to remain available after refreshing or reopening the browser.

The current storage key is:

attendanceTrackerRecords
📊 Attendance Calculations

The project includes a dedicated attendance calculation utility.

Attendance Percentage
Attendance % = (Attended Classes / Conducted Classes) × 100

Percentages are displayed up to two decimal places.

🎯 Eligibility Calculation

The application currently uses:

75%

as the default eligibility threshold.

The threshold is stored centrally so it can be changed later without rewriting the entire application.

🚨 Attendance Status

Subjects can be classified according to their attendance percentage.

Current concept:

Attendance	Status
≥ Eligibility Threshold	Eligible / Safe
Below Eligibility Threshold	Precaution / Critical depending on percentage
< 65%	Critical

The project separately recognizes the 65% critical boundary.

This distinction is important because a student may be below the eligibility requirement while still being above the critical attendance level.

🔮 Attendance Forecast

The application provides future attendance calculations.

Required Classes

Calculates the number of consecutive classes a student needs to attend to reach the configured attendance target.

Example:

Current Attendance: 68%
Target: 75%

Required Classes: 18
Best Possible Attendance

Calculates the maximum attendance percentage achievable if the student attends every remaining class.

Example:

Current Attendance: 68%

If every remaining class is attended:

Best Possible Attendance: 79.25%
Maximum Allowed Absences

Calculates how many upcoming classes can be missed while still maintaining the target attendance percentage.

Example:

Maximum Allowed Absences: 4
Recovery Status

The application determines whether a student can still recover to the required attendance level based on the number of classes remaining.

Possible outcomes:

Can Recover

or

Cannot Recover
🗓️ Future Class Forecast

The timetable and academic calendar are used to calculate upcoming classes.

The system can determine:

Total classes remaining
Future classes by subject
Future PP classes
Future PR classes
Subject-specific recovery possibilities
Maximum allowed future absences
📚 Subject Forecast

Each subject can receive its own future attendance projection.

The forecast includes:

Future Classes
Future PP Classes
Future PR Classes
Best Possible Attendance
Required Classes
Maximum Allowed Absences

This allows students to understand which subjects need immediate attention.

🏫 Academic Calendar

The application uses a dedicated academic calendar configuration.

It can account for:

Semester start date
Semester end date
Holidays
Examinations
Non-instructional days
Weekend configuration
Class schedules

This prevents the attendance forecast from simply assuming that every calendar day contains classes.

🧱 Technology Stack

The current project is built using:

Frontend
React
JavaScript
HTML
CSS
Development
Vite
VS Code
npm
Current Storage
Browser localStorage
Planned Backend

A cloud database/backend will be introduced in a future version to support multiple users and online synchronization.

📁 Project Structure

A simplified project structure is:
attendance-tracker/
│
├── src/
│   │
│   ├── components/
│   │   └── AttendanceCalendar.jsx
│   │
│   ├── data/
│   │   ├── attendanceData.js
│   │   └── academicCalendar.js
│   │
│   ├── utils/
│   │   ├── attendanceCalculations.js
│   │   ├── timetableUtils.js
│   │   └── academicCalendarUtils.js
│   │
│   ├── App.jsx
│   └── index.css
│
├── package.json
├── package-lock.json
└── README.md


⚙️ Installation
1. Clone the repository
git clone YOUR_REPOSITORY_URL
2. Enter the project directory
cd attendance-tracker
3. Install dependencies
npm install
4. Start the development server
npm run dev

The application will normally be available at:

http://localhost:5173
🖥️ Build for Production

To create a production build:

npm run build

To preview the production build:

npm run preview
🔐 Current Data Model

The current version contains predefined academic information.

Example:

export const initialAttendance = {
  overall: {
    attended: 45,
    conducted: 77,
  },

  subjects: [
    {
      name: "Problem-Driven Programming",
      code: "R1UC544B",
      components: {
        PP: {
          attended: 9,
          conducted: 10,
        },
        PR: {
          attended: 11,
          conducted: 13,
        },
      },
    },
  ],
};

This structure will eventually be replaced or supplemented by user-configurable data.

🚧 Current Limitations

The current version is primarily a single-user/local application.

Some information is currently configured directly inside the project.

For example:

Subjects
Initial attendance
Academic calendar
Timetable
Attendance threshold

The current version also uses browser-local storage rather than a cloud database.

Therefore, the current application is not yet designed for complete multi-user online usage.

🛣️ Future Roadmap

The following features are planned for future versions.

🔧 1. Editable Timetable

Users will be able to:

Add classes
Edit classes
Delete classes
Change class timings
Change subjects
Change subject codes
Configure PP/PR or other class types
Create their own weekly timetable

The timetable will no longer need to be permanently hard-coded.

🗓️ 2. Editable Weekend Configuration

Users will be able to choose which days are considered weekends.

For example:

Saturday → Weekend
Sunday → Weekend

But if a class exists on Saturday:

Saturday → Weekend + Scheduled Class

the application should still correctly include that class in attendance calculations.

⚙️ 3. Editable Eligibility Criteria

Users will be able to configure their own attendance requirements.

For example:

Eligibility Threshold: 75%
Critical Threshold: 65%

Another institution could potentially use:

Eligibility Threshold: 80%
Critical Threshold: 70%

The application will automatically update calculations and statuses based on these settings.

🧮 4. Improved Required-Class Logic

The system will determine when Required Classes should actually be displayed.

It will account for:

Current attendance
Eligibility threshold
Critical threshold
Number of classes remaining
Whether recovery is mathematically possible

The goal is to avoid showing confusing or unnecessary recovery information.

🎓 5. Semester Management

The application will support multiple semesters.

The immediate transition will be:

Semester 5
      ↓
Semester 6

Semester 5 information should remain available as historical data.

Semester 6 will have its own:

Subjects
Timetable
Attendance
Calendar information
Calculations
Forecasts

Switching semesters must not overwrite previous-semester records.

👤 6. Personal User Profiles

The application will eventually support multiple users.

A user will be able to configure:

Name
Semester
Subjects
Subject codes
Timetable
Attendance
Weekend configuration
Eligibility criteria

This means the application will no longer be tied specifically to one student's information.

👥 7. Multi-User Support

The long-term goal is to allow different students to use the same application.

For example:

Student A
    ↓
Personal Attendance Data

Student B
    ↓
Personal Attendance Data

Student C
    ↓
Personal Attendance Data

Each user's data must remain isolated.

One student must never accidentally see or modify another student's private attendance data.

🔐 8. Private Personal Access

Each user will eventually have a private area where they can:

Add attendance
Edit attendance
Configure subjects
Edit timetable
Change eligibility settings
Manage semesters
View forecasts

Only the authorized user should be able to modify this information.

🔗 9. Public View-Only Link

The application will support a separate shareable link for attendance viewing.

Example concept:

Private Link
↓
Student manages attendance

Public Link
↓
Other people can view attendance

The public link will be view-only.

Visitors should not be able to modify the attendance data.

🌐 10. Online Deployment

The project will be deployed online so it can be accessed through a normal web browser.

The intended architecture is:

React Application
       ↓
GitHub
       ↓
Cloud Hosting
       ↓
Public Web Application

Users should eventually be able to access the application without installing anything locally.

☁️ 11. Cloud Data Storage

To support multi-user access and public sharing, the application will eventually use a cloud database.

This will allow:

Persistent online data
User-specific data
Data synchronization
Multiple devices
Private access
Public view-only profiles
🔄 12. Data Synchronization

Future versions should allow a user to access their attendance from multiple devices.

For example:

Laptop
   ↕
Cloud Database
   ↕
Mobile

Changes made on one device can eventually appear on another device.

📱 13. Responsive Design

The application is designed to work across:

Desktop
Laptop
Tablet
Mobile

The interface uses responsive CSS to adapt the dashboard, subject cards, calendar, and attendance controls to smaller screens.

🔮 Long-Term Vision

The final goal is to transform this project from a personal attendance dashboard into a complete online attendance management platform.

The intended experience is:

Create Profile
      ↓
Select Semester
      ↓
Add Subjects
      ↓
Configure Timetable
      ↓
Configure Eligibility
      ↓
Record Attendance
      ↓
View Analytics
      ↓
Forecast Attendance
      ↓
Generate Public View Link

A student should be able to use the application as their personal attendance assistant without modifying the source code.

🎯 Project Goals

The major goals of this project are:

Make attendance tracking simple.
Reduce manual attendance calculations.
Provide accurate recovery predictions.
Help students avoid attendance shortages.
Make timetable management flexible.
Support multiple semesters.
Support different institutions and attendance criteria.
Keep personal data private.
Allow controlled public sharing.
Make the application accessible online.
Build a scalable architecture for future development.
🤝 Contributing

Contributions, suggestions, and improvements are welcome.

If you want to contribute:

Fork the repository.
Create a new branch.
git checkout -b feature/new-feature
Make your changes.
Commit your changes.
git commit -m "Add new feature"
Push the branch.
git push origin feature/new-feature
Open a Pull Request.
📌 Development Status

Current Status: 🟡 Active Development

The core attendance tracking, calendar, forecasting, and local persistence functionality has been implemented.

The project is currently being prepared for:

Flexible configuration
Semester management
Multi-user support
Cloud storage
Private accounts
Public view-only sharing
Online deployment
📜 License

This project is currently available for educational and personal use.

A formal open-source license can be added in a future version.

👨‍💻 Author

Adarsh Singh

B.Tech Computer Science & Engineering (AIML)

⭐ If you find this project useful, consider giving the repository a star!#   a t t e n d a n c e - t r a c k e r  
 