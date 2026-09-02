export const ATTENDANCE_THRESHOLD = 75;
export const CRITICAL_THRESHOLD = 65;
export const LIVE_ATTENDANCE_START = "2026-09-01";

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

    {
      name: "Soft Computing",
      code: "R1UC549B",
      components: {
        PP: {
          attended: 4,
          conducted: 5,
        },
        PR: {
          attended: 0,
          conducted: 0,
        },
      },
    },

    {
      name: "Applied Predictive Analysis",
      code: "R1UC552B",
      components: {
        PP: {
          attended: 1,
          conducted: 5,
        },
        PR: {
          attended: 2,
          conducted: 6,
        },
      },
    },

    {
      name: "System Design",
      code: "R1UC515T",
      components: {
        PP: {
          attended: 2,
          conducted: 5,
        },
        PR: {
          attended: 0,
          conducted: 0,
        },
      },
    },

    {
      name: "Machine Learning",
      code: "R1UC525B",
      components: {
        PP: {
          attended: 4,
          conducted: 6,
        },
        PR: {
          attended: 4,
          conducted: 6,
        },
      },
    },

    {
      name: "Soft Skills & Aptitude Readiness",
      code: "O1UA505L",
      components: {
        PP: {
          attended: 0,
          conducted: 0,
        },
        PR: {
          attended: 8,
          conducted: 18,
        },
      },
    },

    {
      name: "Programming Skills with Advanced Data Structures",
      code: "R1UC543L",
      components: {
        PP: {
          attended: 0,
          conducted: 0,
        },
        PR: {
          attended: 0,
          conducted: 3,
        },
      },
    },
  ],
};

/*
 * Date-wise attendance recorded after the live timetable starts.
 *
 * Structure:
 *
 * "YYYY-MM-DD": {
 *   "subject-code": {
 *     PP: "present" | "absent",
 *     PR: "present" | "absent"
 *   }
 * }
 *
 * Example:
 *
 * attendanceRecords: {
 *   "2026-09-01": {
 *     "R1UC544B": {
 *       PP: "present",
 *       PR: "absent"
 *     }
 *   }
 * }
 *
 * Only classes that have actually been marked are stored here.
 */
export const attendanceRecords = {};