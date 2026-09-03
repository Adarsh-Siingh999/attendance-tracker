/**
 * Seed data preserving the original Semester V setup for Adarsh Singh.
 * This ensures that existing academic records, timetables, calendars,
 * and attendance history are never lost during the SaaS transformation.
 */

export const SEED_PROFILE = {
  id: "user-adarsh-singh",
  email: "adarsh@example.com",
  fullName: "Adarsh Singh",
  avatarInitials: "AS",
  institution: "Galgotias University",
  program: "B.Tech Computer Science & Engineering (AIML)",
  defaultEligibilityThreshold: 75,
  defaultCriticalThreshold: 65,
  defaultWeekends: [0, 1], // Sunday (0) and Monday (1)
  createdAt: "2026-08-01T00:00:00.000Z",
};

export const SEED_SEMESTERS = [
  {
    id: "sem-5-2026",
    userId: "user-adarsh-singh",
    name: "Semester V",
    academicYear: "2026-27",
    startDate: "2026-08-06",
    endDate: "2026-12-31",
    eligibilityThreshold: 75,
    criticalThreshold: 65,
    weekends: [0, 1], // Sunday & Monday
    isActive: true,
    isArchived: false,
    liveAttendanceStart: "2026-09-01",
    description: "Autumn 2026 Semester (B.Tech CSE - AIML)",
  },
];

export const SEED_SUBJECTS = [
  {
    id: "sub-r1uc544b",
    semesterId: "sem-5-2026",
    name: "Problem-Driven Programming",
    code: "R1UC544B",
    credits: 4,
    color: "#2563eb", // Blue
    components: {
      PP: { attended: 9, conducted: 10 },
      PR: { attended: 11, conducted: 13 },
    },
  },
  {
    id: "sub-r1uc549b",
    semesterId: "sem-5-2026",
    name: "Soft Computing",
    code: "R1UC549B",
    credits: 3,
    color: "#7c3aed", // Violet
    components: {
      PP: { attended: 4, conducted: 5 },
      PR: { attended: 0, conducted: 0 },
    },
  },
  {
    id: "sub-r1uc552b",
    semesterId: "sem-5-2026",
    name: "Applied Predictive Analysis",
    code: "R1UC552B",
    credits: 4,
    color: "#059669", // Emerald
    components: {
      PP: { attended: 1, conducted: 5 },
      PR: { attended: 2, conducted: 6 },
    },
  },
  {
    id: "sub-r1uc515t",
    semesterId: "sem-5-2026",
    name: "System Design",
    code: "R1UC515T",
    credits: 3,
    color: "#d97706", // Amber
    components: {
      PP: { attended: 2, conducted: 5 },
      PR: { attended: 0, conducted: 0 },
    },
  },
  {
    id: "sub-r1uc525b",
    semesterId: "sem-5-2026",
    name: "Machine Learning",
    code: "R1UC525B",
    credits: 4,
    color: "#dc2626", // Red
    components: {
      PP: { attended: 4, conducted: 6 },
      PR: { attended: 4, conducted: 6 },
    },
  },
  {
    id: "sub-o1ua505l",
    semesterId: "sem-5-2026",
    name: "Soft Skills & Aptitude Readiness",
    code: "O1UA505L",
    credits: 2,
    color: "#4b5563", // Gray
    components: {
      PP: { attended: 0, conducted: 0 },
      PR: { attended: 8, conducted: 18 },
    },
  },
  {
    id: "sub-r1uc543l",
    semesterId: "sem-5-2026",
    name: "Programming Skills with Advanced Data Structures",
    code: "R1UC543L",
    credits: 3,
    color: "#0891b2", // Cyan
    components: {
      PP: { attended: 0, conducted: 0 },
      PR: { attended: 0, conducted: 3 },
    },
  },
];

export const SEED_TIMETABLE = {
  "sem-5-2026": {
    // 2 = Tuesday
    2: [
      { start: "08:30", end: "09:20", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
      { start: "09:20", end: "10:10", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
      { start: "10:15", end: "11:05", subject: "Programming Skills with Advanced Data Structures", code: "R1UC543L", type: "PR", room: "Lab 3" },
      { start: "11:05", end: "11:55", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
      { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
      { start: "13:45", end: "14:35", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
      { start: "14:35", end: "15:25", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
      { start: "15:30", end: "16:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
    ],
    // 3 = Wednesday
    3: [
      { start: "08:30", end: "09:20", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "09:20", end: "10:10", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "10:15", end: "11:05", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "11:05", end: "11:55", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "12:00", end: "12:50", subject: "System Design", code: "R1UC515T", type: "PP", room: "Room 402" },
      { start: "13:45", end: "14:35", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
      { start: "14:35", end: "15:25", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
      { start: "15:30", end: "16:20", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
    ],
    // 4 = Thursday
    4: [
      { start: "08:30", end: "09:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "09:20", end: "10:10", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "10:15", end: "11:05", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "11:05", end: "11:55", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "12:00", end: "12:50", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "12:50", end: "13:40", subject: "System Design", code: "R1UC515T", type: "PR", room: "Lab 1" },
      { start: "14:35", end: "15:25", subject: "Machine Learning", code: "R1UC525B", type: "PR", room: "Lab 4" },
      { start: "15:30", end: "16:20", subject: "Machine Learning", code: "R1UC525B", type: "PR", room: "Lab 4" },
    ],
    // 5 = Friday
    5: [
      { start: "09:20", end: "10:10", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
      { start: "10:15", end: "11:05", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
      { start: "11:05", end: "11:55", subject: "Soft Computing", code: "R1UC549B", type: "PP", room: "Room 403" },
      { start: "12:50", end: "13:40", subject: "Machine Learning", code: "R1UC525B", type: "PP", room: "Room 402" },
      { start: "13:45", end: "14:35", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PP", room: "Room 401" },
      { start: "14:35", end: "15:25", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
      { start: "15:30", end: "16:20", subject: "Problem-Driven Programming", code: "R1UC544B", type: "PR", room: "Lab 2" },
    ],
    // 6 = Saturday
    6: [
      { start: "09:20", end: "10:10", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PP", room: "Room 403" },
      { start: "10:15", end: "11:05", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PR", room: "Lab 3" },
      { start: "11:05", end: "11:55", subject: "Applied Predictive Analysis", code: "R1UC552B", type: "PR", room: "Lab 3" },
      { start: "12:50", end: "13:40", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "13:45", end: "14:35", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "14:35", end: "15:25", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
      { start: "15:30", end: "16:20", subject: "Soft Skills & Aptitude Readiness", code: "O1UA505L", type: "PR", room: "Audi B" },
    ],
  },
};

export const SEED_CALENDAR = {
  "sem-5-2026": {
    semester: "V",
    academicYear: "2026-27",
    startDate: "2026-08-06",
    endDate: "2026-12-31",
    weekends: [0, 1], // Sunday & Monday
    holidays: [
      { date: "2026-08-11", name: "Sawan Shivratri" },
      { date: "2026-08-15", name: "Independence Day" },
      { date: "2026-08-26", name: "Milad un-Nabi / Id-e-Milad" },
      { date: "2026-08-28", name: "Raksha Bandhan" },
      { date: "2026-09-04", name: "Janmashtmi" },
      { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
      { date: "2026-10-19", name: "Ram Navmi" },
      { date: "2026-10-20", name: "Dussehara" },
      { date: "2026-10-26", name: "Maharishi Valmiki Jayanti" },
      { date: "2026-11-08", name: "Diwali" },
      { date: "2026-11-09", name: "Goverdhhan Puja" },
      { date: "2026-11-11", name: "Bhai Duj" },
      { date: "2026-11-15", name: "Chat Puja" },
      { date: "2026-11-24", name: "Guru Nanak Jayanti / Teg Bahadur Shahidi Diwas" },
      { date: "2026-12-25", name: "Christmas" },
    ],
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
    nonInstructionalDays: [],
  },
};

export const SEED_PUBLIC_SETTINGS = {
  isPublicEnabled: false,
  publicSlug: "adarsh-sem5",
  showOverallAttendance: true,
  showSubjectAttendance: true,
  showSubjectNames: true,
  showCourseCodes: true,
  showTimetable: false,
  showCalendar: false,
  showInstitution: true,
};
