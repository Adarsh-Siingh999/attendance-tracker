export const academicCalendar = {
  semester: "V",
  academicYear: "2026-27",

  /*
  ========================================
  SEMESTER PERIOD
  ========================================
  */

  startDate: "2026-08-06",

  endDate: null,

  /*
  ========================================
  WEEKENDS
  ========================================

  JavaScript day numbers:

  0 = Sunday
  1 = Monday
  2 = Tuesday
  3 = Wednesday
  4 = Thursday
  5 = Friday
  6 = Saturday

  Your university's regular weekends are
  Sunday and Monday.

  Therefore:

  [0, 1] = Sunday + Monday
  */

  weekends: [0, 1],

  /*
  ========================================
  HOLIDAYS
  ========================================
  */

  holidays: [
    {
      date: "2026-08-11",
      name: "Sawan Shivratri",
    },
    {
      date: "2026-08-15",
      name: "Independence Day",
    },
    {
      date: "2026-08-26",
      name: "Milad un-Nabi / Id-e-Milad",
    },
    {
      date: "2026-08-28",
      name: "Raksha Bandhan",
    },
    {
      date: "2026-09-04",
      name: "Janmashtmi",
    },
    {
      date: "2026-10-02",
      name: "Mahatma Gandhi Jayanti",
    },
    {
      date: "2026-10-19",
      name: "Ram Navmi",
    },
    {
      date: "2026-10-20",
      name: "Dussehara",
    },
    {
      date: "2026-10-26",
      name: "Maharishi Valmiki Jayanti",
    },
    {
      date: "2026-11-08",
      name: "Diwali",
    },
    {
      date: "2026-11-09",
      name: "Goverdhhan Puja",
    },
    {
      date: "2026-11-11",
      name: "Bhai Duj",
    },
    {
      date: "2026-11-15",
      name: "Chat Puja",
    },
    {
      date: "2026-11-24",
      name:
        "Guru Nanak Jayanti / Teg Bahadur Shahidi Diwas",
    },
    {
      date: "2026-12-25",
      name: "Christmas",
    },
  ],

  /*
  ========================================
  EXAMINATIONS
  ========================================

  countsAsClass:

  true
  → examination period can count toward
    scheduled/academic classes

  false
  → regular classes are not scheduled
  */

  examinations: {
    ia2: {
      name: "Internal Assessment Test - 2",
      startDate: "2026-11-17",
      endDate: "2026-11-21",
      countsAsClass: true,
    },

    mte: {
      name: "MTE Examination",
      startDate: "2026-10-21",
      endDate: "2026-10-31",
      countsAsClass: false,
    },

    practical: {
      name: "Practical Examination",
      startDate: "2026-12-11",
      endDate: "2026-12-15",
      countsAsClass: true,
    },

    ete: {
      name: "ETE Examination",
      startDate: "2026-12-16",
      endDate: "2026-12-31",
      countsAsClass: false,
    },
  },

  /*
  ========================================
  CALENDAR EXCEPTIONS
  ========================================

  Reserved for future university calendar
  changes such as:

  - A Sunday becoming an instructional day
  - A Monday becoming an instructional day
  - A working day being shifted
  - Special instructional days
  - University-declared additional holidays

  We will connect this to the Settings
  system later.

  Example future structure:

  {
    date: "2026-10-04",
    type: "instructional",
    reason: "Working Sunday"
  }

  or:

  {
    date: "2026-10-06",
    type: "non-instructional",
    reason: "University holiday"
  }
  */

  exceptions: [],
};