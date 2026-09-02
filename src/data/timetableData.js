export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/*
========================================
SEMESTER V TIMETABLE
========================================

This is the original timetable for
Semester V.

Do not modify this object when the
university changes the timetable.

Instead, create a new timetable version
inside timetableVersions below.

This preserves historical accuracy.
*/

export const semesterTimetable = {
  2: [
    {
      start: "08:30",
      end: "09:20",
      subject:
        "Programming Skills with Advanced Data Structures",
      code: "R1UC543L",
      type: "PR",
    },
    {
      start: "09:20",
      end: "10:10",
      subject:
        "Programming Skills with Advanced Data Structures",
      code: "R1UC543L",
      type: "PR",
    },
    {
      start: "10:15",
      end: "11:05",
      subject:
        "Programming Skills with Advanced Data Structures",
      code: "R1UC543L",
      type: "PR",
    },
    {
      start: "11:05",
      end: "11:55",
      subject: "Machine Learning",
      code: "R1UC525B",
      type: "PP",
    },
    {
      start: "12:00",
      end: "12:50",
      subject: "System Design",
      code: "R1UC515T",
      type: "PP",
    },
    {
      start: "13:45",
      end: "14:35",
      subject: "Applied Predictive Analysis",
      code: "R1UC552B",
      type: "PP",
    },
    {
      start: "14:35",
      end: "15:25",
      subject: "Applied Predictive Analysis",
      code: "R1UC552B",
      type: "PP",
    },
    {
      start: "15:30",
      end: "16:20",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
  ],

  3: [
    {
      start: "08:30",
      end: "09:20",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "09:20",
      end: "10:10",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "10:15",
      end: "11:05",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "11:05",
      end: "11:55",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "12:00",
      end: "12:50",
      subject: "System Design",
      code: "R1UC515T",
      type: "PP",
    },
    {
      start: "13:45",
      end: "14:35",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PR",
    },
    {
      start: "14:35",
      end: "15:25",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PR",
    },
    {
      start: "15:30",
      end: "16:20",
      subject: "Soft Computing",
      code: "R1UC549B",
      type: "PP",
    },
  ],

  4: [
    {
      start: "08:30",
      end: "09:20",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "09:20",
      end: "10:10",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "10:15",
      end: "11:05",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "11:05",
      end: "11:55",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "12:00",
      end: "12:50",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "12:50",
      end: "13:40",
      subject: "System Design",
      code: "R1UC515T",
      type: "PR",
    },
    {
      start: "14:35",
      end: "15:25",
      subject: "Machine Learning",
      code: "R1UC525B",
      type: "PR",
    },
    {
      start: "15:30",
      end: "16:20",
      subject: "Machine Learning",
      code: "R1UC525B",
      type: "PR",
    },
  ],

  5: [
    {
      start: "09:20",
      end: "10:10",
      subject: "Soft Computing",
      code: "R1UC549B",
      type: "PP",
    },
    {
      start: "10:15",
      end: "11:05",
      subject: "Machine Learning",
      code: "R1UC525B",
      type: "PP",
    },
    {
      start: "11:05",
      end: "11:55",
      subject: "Soft Computing",
      code: "R1UC549B",
      type: "PP",
    },
    {
      start: "12:50",
      end: "13:40",
      subject: "Machine Learning",
      code: "R1UC525B",
      type: "PP",
    },
    {
      start: "13:45",
      end: "14:35",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PP",
    },
    {
      start: "14:35",
      end: "15:25",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PR",
    },
    {
      start: "15:30",
      end: "16:20",
      subject: "Problem-Driven Programming",
      code: "R1UC544B",
      type: "PR",
    },
  ],

  6: [
    {
      start: "09:20",
      end: "10:10",
      subject: "Applied Predictive Analysis",
      code: "R1UC552B",
      type: "PP",
    },
    {
      start: "10:15",
      end: "11:05",
      subject: "Applied Predictive Analysis",
      code: "R1UC552B",
      type: "PR",
    },
    {
      start: "11:05",
      end: "11:55",
      subject: "Applied Predictive Analysis",
      code: "R1UC552B",
      type: "PR",
    },
    {
      start: "12:50",
      end: "13:40",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "13:45",
      end: "14:35",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "14:35",
      end: "15:25",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
    {
      start: "15:30",
      end: "16:20",
      subject: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      type: "PR",
    },
  ],
};

/*
========================================
SEMESTER INFORMATION
========================================
*/

export const semesterInfo = {
  semester: "V",
  academicYear: "2026-27",
  startDate: "2026-09-01",
  endDate: null,
};

/*
========================================
HOLIDAYS
========================================

These remain separate from weekends and
non-instructional days.
*/

export const holidays = [
  "2026-08-11",
  "2026-08-15",
  "2026-08-26",
  "2026-08-28",
  "2026-09-04",
  "2026-10-02",
  "2026-10-19",
  "2026-10-20",
  "2026-10-26",
  "2026-11-08",
  "2026-11-09",
  "2026-11-11",
  "2026-11-15",
  "2026-11-24",
  "2026-12-25",
];

/*
========================================
DEFAULT WEEKENDS
========================================

0 = Sunday
6 = Saturday

The settings system we build later will
allow these to be changed without
modifying this file manually.

For now, Saturday and Sunday remain the
default weekends.
*/

export const defaultWeekends = [
  WEEKDAYS.SUNDAY,
  WEEKDAYS.SATURDAY,
];

/*
========================================
TIMETABLE VERSIONS
========================================

IMPORTANT:

Never overwrite an old timetable when
the university changes it.

Instead, add another version with a new
effectiveFrom date.

Example:

{
  id: "semester-v-revised-september",
  effectiveFrom: "2026-09-15",
  effectiveTo: null,
  timetable: revisedTimetable
}

The utility automatically selects the
correct version for a particular date.

This means:

September 1–14
→ Old timetable

September 15 onward
→ Revised timetable

This is important because attendance
records from previous dates must continue
using the timetable that was actually
active on those dates.
*/

export const timetableVersions = [
  {
    id: "semester-v-current",
    effectiveFrom: "2026-09-01",
    effectiveTo: null,
    timetable: semesterTimetable,
  },
];