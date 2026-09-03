/**
 * Storage & Repository Service
 * Provides multi-tenant data access, user accounts & authentication,
 * timetable versioning with immutable past history, and Galgotias University presets.
 */

import {
  SEED_PROFILE,
  SEED_SEMESTERS,
  SEED_SUBJECTS,
  SEED_TIMETABLE,
  SEED_CALENDAR,
  SEED_PUBLIC_SETTINGS,
} from "../data/seedData.js";

const GLOBAL_KEYS = {
  USERS: "at_saas_users_list",
  CURRENT_USER_ID: "at_saas_current_user_id",
  LEGACY_RECORDS: "attendanceTrackerRecords",
  LEGACY_NON_INSTRUCTIONAL: "attendanceTrackerNonInstructionalDays",
};

// Event bus for reactivity across UI components
export const STORAGE_EVENTS = {
  USER_CHANGED: "at_event_user_changed",
  SEMESTER_CHANGED: "at_event_semester_changed",
  ATTENDANCE_UPDATED: "at_event_attendance_updated",
  DATA_REFRESHED: "at_event_data_refreshed",
};

export const DEFAULT_USER = {
  id: "user-adarsh",
  name: "Adarsh Singh",
  email: "adarsh@galgotias.edu",
  institution: "Galgotias University",
  program: "B.Tech Computer Science & Engineering (AIML)",
  avatarInitials: "AS",
  role: "student",
};

export const GALGOTIAS_SEM6_PRESET = {
  name: "Semester VI (Spring 2027)",
  academicYear: "2026-27",
  startDate: "2027-01-18",
  endDate: "2027-05-28",
  eligibilityThreshold: 75,
  criticalThreshold: 65,
  weekends: [0, 6],
  calendar: {
    semester: "Semester VI (Spring 2027)",
    academicYear: "2026-27",
    startDate: "2027-01-18",
    endDate: "2027-05-28",
    weekends: [0, 6],
    holidays: [
      { date: "2027-01-26", name: "Republic Day" },
      { date: "2027-02-15", name: "Maha Shivratri" },
      { date: "2027-03-22", name: "Holi Holiday" },
      { date: "2027-03-23", name: "Holi Holiday" },
      { date: "2027-04-14", name: "Dr. B.R. Ambedkar Jayanti" },
      { date: "2027-05-01", name: "May Day / University Holiday" },
    ],
    examinations: {
      "mte-sem6": {
        name: "Mid-Term Examinations (MTE)",
        startDate: "2027-03-15",
        endDate: "2027-03-20",
        countsAsClass: false,
      },
      "ia2-sem6": {
        name: "Continuous Assessment Test 2 (IA2)",
        startDate: "2027-04-19",
        endDate: "2027-04-23",
        countsAsClass: true,
      },
      "practical-sem6": {
        name: "End-Term Practical Examinations",
        startDate: "2027-05-10",
        endDate: "2027-05-15",
        countsAsClass: true,
      },
      "ete-sem6": {
        name: "End-Term Theory Examinations",
        startDate: "2027-05-17",
        endDate: "2027-05-28",
        countsAsClass: false,
      },
    },
    nonInstructionalDays: [],
  },
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[StorageService] Failed to read ${key}:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[StorageService] Failed to write ${key}:`, err);
  }
}

function dispatchEvent(eventName, detail = null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

function getYesterday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export const storageService = {
  /**
   * Helper to resolve namespaced key per active user
   */
  uKey(resource, userId = null) {
    const uid = userId || this.getCurrentUserId();
    return `at_saas_u_${uid}_${resource}`;
  },

  /**
   * Initialize storage with multi-user support & migration
   */
  init() {
    // 1. Initialize Users Registry
    let users = safeGet(GLOBAL_KEYS.USERS, null);
    if (!users || users.length === 0) {
      users = [DEFAULT_USER];
      safeSet(GLOBAL_KEYS.USERS, users);
      safeSet(GLOBAL_KEYS.CURRENT_USER_ID, DEFAULT_USER.id);
    }

    let currentUserId = safeGet(GLOBAL_KEYS.CURRENT_USER_ID, null);
    if (!currentUserId || !users.some((u) => u.id === currentUserId)) {
      currentUserId = users[0]?.id || DEFAULT_USER.id;
      safeSet(GLOBAL_KEYS.CURRENT_USER_ID, currentUserId);
    }

    // 2. Initialize default partition for user-adarsh if not present
    const adarshKey = `at_saas_u_${DEFAULT_USER.id}_profile`;
    if (!localStorage.getItem(adarshKey)) {
      this.initUserPartition(DEFAULT_USER.id, {
        profile: safeGet("at_saas_profile", SEED_PROFILE),
        semesters: safeGet("at_saas_semesters", SEED_SEMESTERS),
        activeSemester: safeGet("at_saas_active_semester", SEED_SEMESTERS[0].id),
        subjects: safeGet("at_saas_subjects", SEED_SUBJECTS),
        timetables: safeGet("at_saas_timetables", SEED_TIMETABLE),
        calendars: safeGet("at_saas_calendars", SEED_CALENDAR),
        attendanceRecords: safeGet("at_saas_attendance_records", {
          "sem-5-2026": safeGet(GLOBAL_KEYS.LEGACY_RECORDS, {}),
        }),
        publicSettings: safeGet("at_saas_public_settings", SEED_PUBLIC_SETTINGS),
      });
    }
  },

  initUserPartition(userId, data = {}) {
    safeSet(this.uKey("profile", userId), data.profile || SEED_PROFILE);
    safeSet(this.uKey("semesters", userId), data.semesters || SEED_SEMESTERS);
    safeSet(this.uKey("active_semester", userId), data.activeSemester || SEED_SEMESTERS[0].id);
    safeSet(this.uKey("subjects", userId), data.subjects || SEED_SUBJECTS);
    safeSet(this.uKey("timetables", userId), data.timetables || SEED_TIMETABLE);
    safeSet(this.uKey("calendars", userId), data.calendars || SEED_CALENDAR);
    safeSet(this.uKey("attendance_records", userId), data.attendanceRecords || {});
    safeSet(this.uKey("public_settings", userId), data.publicSettings || SEED_PUBLIC_SETTINGS);
  },

  // --------------------------------------------------------------------------
  // MULTI-USER & AUTHENTICATION
  // --------------------------------------------------------------------------
  getUsers() {
    return safeGet(GLOBAL_KEYS.USERS, [DEFAULT_USER]);
  },

  getCurrentUserId() {
    return safeGet(GLOBAL_KEYS.CURRENT_USER_ID, DEFAULT_USER.id);
  },

  getCurrentUser() {
    const users = this.getUsers();
    const currentId = this.getCurrentUserId();
    return users.find((u) => u.id === currentId) || users[0] || DEFAULT_USER;
  },

  login(userId) {
    const users = this.getUsers();
    const found = users.find((u) => u.id === userId);
    if (!found) return false;

    safeSet(GLOBAL_KEYS.CURRENT_USER_ID, userId);
    dispatchEvent(STORAGE_EVENTS.USER_CHANGED, { userId });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return true;
  },

  logout() {
    // When user logs out, we can switch to guest or keep user selection screen
    dispatchEvent(STORAGE_EVENTS.USER_CHANGED, { userId: null });
  },

  createUser({ name, email, institution, program, startSemester = "sem-5", template = "galgotias-sem5" }) {
    const users = this.getUsers();
    const id = `user-${Date.now()}`;
    const initials = (name || "User")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newUser = {
      id,
      name: name.trim(),
      email: (email || "").trim(),
      institution: institution?.trim() || "Galgotias University",
      program: program?.trim() || "B.Tech Computer Science & Engineering",
      avatarInitials: initials || "U",
      role: "student",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    safeSet(GLOBAL_KEYS.USERS, users);

    // Build user partition data based on selected template
    let userProfile = {
      fullName: newUser.name,
      institution: newUser.institution,
      program: newUser.program,
      avatarInitials: newUser.avatarInitials,
      bio: `Student at ${newUser.institution}`,
    };

    let userSemesters;
    let userActiveSemId;
    let userSubjects;
    let userTimetable;
    let userCalendar;

    if (template === "galgotias-sem5") {
      // Clones Sem V structure with 0 attendance baseline
      userSemesters = [
        {
          id: `sem-5-${id}`,
          name: "Semester V (Autumn 2026)",
          academicYear: "2026-27",
          startDate: "2026-08-01",
          endDate: "2026-12-15",
          eligibilityThreshold: 75,
          criticalThreshold: 65,
          weekends: [0, 1], // Sunday & Monday for Sem 5
          isActive: true,
          isArchived: false,
        },
      ];
      userActiveSemId = userSemesters[0].id;
      // Copy course titles with 0 attendance
      userSubjects = SEED_SUBJECTS.map((s, idx) => ({
        ...s,
        id: `sub-${id}-${idx}`,
        semesterId: userActiveSemId,
        components: {
          Lecture: { attended: 0, conducted: 0 },
        },
      }));
      userTimetable = { [userActiveSemId]: SEED_TIMETABLE["sem-5-2026"] };
      userCalendar = { [userActiveSemId]: SEED_CALENDAR["sem-5-2026"] };
    } else if (template === "galgotias-sem6") {
      // Semester VI Galgotias setup
      userSemesters = [
        {
          id: `sem-6-${id}`,
          name: GALGOTIAS_SEM6_PRESET.name,
          academicYear: GALGOTIAS_SEM6_PRESET.academicYear,
          startDate: GALGOTIAS_SEM6_PRESET.startDate,
          endDate: GALGOTIAS_SEM6_PRESET.endDate,
          eligibilityThreshold: 75,
          criticalThreshold: 65,
          weekends: GALGOTIAS_SEM6_PRESET.weekends,
          isActive: true,
          isArchived: false,
        },
      ];
      userActiveSemId = userSemesters[0].id;
      userSubjects = [
        {
          id: `sub-${id}-1`,
          semesterId: userActiveSemId,
          name: "Cloud Computing & DevOps",
          code: "CS601",
          credits: 4,
          color: "#2563eb",
          components: { Lecture: { attended: 0, conducted: 0 } },
        },
        {
          id: `sub-${id}-2`,
          semesterId: userActiveSemId,
          name: "Deep Learning & Neural Networks",
          code: "AI602",
          credits: 4,
          color: "#7c3aed",
          components: { Lecture: { attended: 0, conducted: 0 }, Lab: { attended: 0, conducted: 0 } },
        },
        {
          id: `sub-${id}-3`,
          semesterId: userActiveSemId,
          name: "Full Stack Web Development",
          code: "CS603",
          credits: 3,
          color: "#059669",
          components: { Lecture: { attended: 0, conducted: 0 } },
        },
        {
          id: `sub-${id}-4`,
          semesterId: userActiveSemId,
          name: "Cyber Security & Cryptography",
          code: "CS604",
          credits: 3,
          color: "#d97706",
          components: { Lecture: { attended: 0, conducted: 0 } },
        },
      ];
      userCalendar = { [userActiveSemId]: GALGOTIAS_SEM6_PRESET.calendar };
      userTimetable = { [userActiveSemId]: {} };
    } else {
      // Clean slate
      userSemesters = [
        {
          id: `sem-default-${id}`,
          name: startSemester === "sem-6" ? "Semester VI" : "Semester V",
          academicYear: "2026-27",
          startDate: new Date().toISOString().split("T")[0],
          endDate: null,
          eligibilityThreshold: 75,
          criticalThreshold: 65,
          weekends: [0, 6],
          isActive: true,
          isArchived: false,
        },
      ];
      userActiveSemId = userSemesters[0].id;
      userSubjects = [];
      userTimetable = { [userActiveSemId]: {} };
      userCalendar = {
        [userActiveSemId]: {
          semester: userSemesters[0].name,
          academicYear: "2026-27",
          startDate: userSemesters[0].startDate,
          endDate: null,
          weekends: [0, 6],
          holidays: [],
          examinations: {},
          nonInstructionalDays: [],
        },
      };
    }

    this.initUserPartition(id, {
      profile: userProfile,
      semesters: userSemesters,
      activeSemester: userActiveSemId,
      subjects: userSubjects,
      timetables: userTimetable,
      calendars: userCalendar,
      attendanceRecords: { [userActiveSemId]: {} },
      publicSettings: {
        isPublicEnabled: false,
        publicSlug: `user-${newUser.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      },
    });

    // Switch to new user
    this.login(id);
    return newUser;
  },

  // --------------------------------------------------------------------------
  // USER PROFILE
  // --------------------------------------------------------------------------
  getProfile() {
    return safeGet(this.uKey("profile"), SEED_PROFILE);
  },

  updateProfile(updates) {
    const current = this.getProfile();
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    safeSet(this.uKey("profile"), updated);

    // Sync back to users list
    const users = this.getUsers();
    const currentId = this.getCurrentUserId();
    const userIdx = users.findIndex((u) => u.id === currentId);
    if (userIdx >= 0) {
      users[userIdx] = {
        ...users[userIdx],
        name: updated.fullName || users[userIdx].name,
        institution: updated.institution || users[userIdx].institution,
        program: updated.program || users[userIdx].program,
        avatarInitials: updated.avatarInitials || users[userIdx].avatarInitials,
      };
      safeSet(GLOBAL_KEYS.USERS, users);
    }

    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return updated;
  },

  // --------------------------------------------------------------------------
  // SEMESTERS
  // --------------------------------------------------------------------------
  getSemesters() {
    return safeGet(this.uKey("semesters"), SEED_SEMESTERS);
  },

  getActiveSemesterId() {
    const active = safeGet(this.uKey("active_semester"), null);
    if (active) return active;
    const semesters = this.getSemesters();
    return semesters[0]?.id || null;
  },

  getActiveSemester() {
    const activeId = this.getActiveSemesterId();
    const semesters = this.getSemesters();
    return semesters.find((s) => s.id === activeId) || semesters[0] || null;
  },

  setActiveSemesterId(semesterId) {
    safeSet(this.uKey("active_semester"), semesterId);
    dispatchEvent(STORAGE_EVENTS.SEMESTER_CHANGED, { semesterId });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  saveSemester(semesterData) {
    const semesters = this.getSemesters();
    const id = semesterData.id || `sem-${Date.now()}`;
    const semester = {
      id,
      name: semesterData.name.trim(),
      academicYear: semesterData.academicYear || "2026-27",
      startDate: semesterData.startDate,
      endDate: semesterData.endDate || null,
      eligibilityThreshold: Number(semesterData.eligibilityThreshold) || 75,
      criticalThreshold: Number(semesterData.criticalThreshold) || 65,
      weekends: semesterData.weekends || [0, 6],
      isActive: Boolean(semesterData.isActive),
      isArchived: Boolean(semesterData.isArchived),
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = semesters.findIndex((s) => s.id === id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...semesters];
      updated[existingIndex] = { ...updated[existingIndex], ...semester };
    } else {
      updated = [...semesters, semester];
    }

    safeSet(this.uKey("semesters"), updated);
    if (semester.isActive) {
      this.setActiveSemesterId(id);
    }
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return semester;
  },

  deleteSemester(semesterId) {
    const semesters = this.getSemesters();
    const remaining = semesters.filter((s) => s.id !== semesterId);
    safeSet(this.uKey("semesters"), remaining);
    if (this.getActiveSemesterId() === semesterId && remaining.length > 0) {
      this.setActiveSemesterId(remaining[0].id);
    }
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // SUBJECTS
  // --------------------------------------------------------------------------
  getSubjects(semesterId) {
    const all = safeGet(this.uKey("subjects"), SEED_SUBJECTS);
    if (!semesterId) return all;
    return all.filter((s) => s.semesterId === semesterId);
  },

  saveSubject(subjectData) {
    const all = safeGet(this.uKey("subjects"), SEED_SUBJECTS);
    const id = subjectData.id || `sub-${Date.now()}`;
    const subject = {
      id,
      semesterId: subjectData.semesterId || this.getActiveSemesterId(),
      name: subjectData.name.trim(),
      code: (subjectData.code || "").trim(),
      credits: Number(subjectData.credits) || 0,
      color: subjectData.color || "#2563eb",
      components: subjectData.components || {
        Lecture: { attended: 0, conducted: 0 },
      },
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = all.findIndex((s) => s.id === id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = { ...updated[existingIndex], ...subject };
    } else {
      updated = [...all, subject];
    }

    safeSet(this.uKey("subjects"), updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return subject;
  },

  deleteSubject(subjectId) {
    const all = safeGet(this.uKey("subjects"), SEED_SUBJECTS);
    const updated = all.filter((s) => s.id !== subjectId);
    safeSet(this.uKey("subjects"), updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // TIMETABLE & VERSIONING (IMMUTABLE PAST HISTORY)
  // --------------------------------------------------------------------------
  getTimetableData(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const allTimetables = safeGet(this.uKey("timetables"), SEED_TIMETABLE);
    return allTimetables[targetId] || {};
  },

  /**
   * Retrieves timetable for a semester, optionally resolving the timetable
   * version active on a specific historical date.
   */
  getTimetable(semesterId, dateString = null) {
    const data = this.getTimetableData(semesterId);

    // If data uses the versioned structure { current, versions: [...] }
    if (data && data.versions && Array.isArray(data.versions)) {
      if (dateString) {
        const matching = data.versions
          .filter((v) => !v.effectiveFrom || dateString >= v.effectiveFrom)
          .filter((v) => !v.effectiveTo || dateString <= v.effectiveTo)
          .sort((a, b) => (b.effectiveFrom || "").localeCompare(a.effectiveFrom || ""));

        if (matching.length > 0) {
          return matching[0].timetable;
        }
      }
      return data.current || {};
    }

    // Flat structure { 0: [], 1: [] }
    return data || {};
  },

  getTimetableVersions(semesterId) {
    const data = this.getTimetableData(semesterId);
    if (data && data.versions) {
      return data.versions;
    }
    return [];
  },

  /**
   * Saves weekly timetable.
   * If applyFromDate is provided, archives previous version with effectiveTo = yesterday,
   * guaranteeing that past attendance remains 100% untouched and uses past schedule!
   */
  saveTimetable(semesterId, timetable, { applyFromDate = null, note = "" } = {}) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(this.uKey("timetables"), SEED_TIMETABLE);
    const existing = all[targetId] || {};

    if (applyFromDate) {
      // Timetable versioning enabled
      let versions = [];
      if (existing && existing.versions && Array.isArray(existing.versions)) {
        versions = [...existing.versions];
        // Close the current open version
        const lastIdx = versions.length - 1;
        if (lastIdx >= 0 && !versions[lastIdx].effectiveTo) {
          versions[lastIdx] = {
            ...versions[lastIdx],
            effectiveTo: getYesterday(applyFromDate),
          };
        }
      } else {
        // Wrap previous flat timetable as version 1
        const activeSem = this.getActiveSemester();
        versions.push({
          id: "v-initial",
          effectiveFrom: activeSem?.startDate || "2026-08-01",
          effectiveTo: getYesterday(applyFromDate),
          timetable: existing || {},
          note: "Initial Schedule",
        });
      }

      versions.push({
        id: `v-${Date.now()}`,
        effectiveFrom: applyFromDate,
        effectiveTo: null,
        timetable,
        note: note || `Schedule updated from ${applyFromDate}`,
        createdAt: new Date().toISOString(),
      });

      all[targetId] = {
        current: timetable,
        versions,
      };
    } else {
      // Flat update or update current version directly
      if (existing && existing.versions) {
        all[targetId] = {
          ...existing,
          current: timetable,
        };
      } else {
        all[targetId] = timetable;
      }
    }

    safeSet(this.uKey("timetables"), all);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // ACADEMIC CALENDAR
  // --------------------------------------------------------------------------
  getCalendar(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const allCalendars = safeGet(this.uKey("calendars"), SEED_CALENDAR);
    const activeSem = this.getActiveSemester();

    if (allCalendars[targetId]) {
      return allCalendars[targetId];
    }

    return {
      semester: activeSem?.name || "Semester",
      academicYear: activeSem?.academicYear || "2026-27",
      startDate: activeSem?.startDate || "2026-08-01",
      endDate: activeSem?.endDate || null,
      weekends: activeSem?.weekends || [0, 6],
      holidays: [],
      examinations: {},
      nonInstructionalDays: [],
    };
  },

  saveCalendar(semesterId, calendar) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(this.uKey("calendars"), SEED_CALENDAR);
    all[targetId] = calendar;
    safeSet(this.uKey("calendars"), all);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE RECORDS (WITH CLASS SNAPSHOTTING)
  // --------------------------------------------------------------------------
  getAttendanceRecords(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(this.uKey("attendance_records"), {});
    return all[targetId] || {};
  },

  /**
   * Sets attendance status with optional class snapshot for permanent immutability.
   */
  setAttendanceStatus(semesterId, date, classIndex, status, classSnapshot = null) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(this.uKey("attendance_records"), {});
    const semRecords = { ...(all[targetId] || {}) };
    const dateRecords = { ...(semRecords[date] || {}) };

    const currentEntry = dateRecords[classIndex];
    const currentStatus = typeof currentEntry === "object" ? currentEntry?.status : currentEntry;

    if (currentStatus === status || status === null) {
      delete dateRecords[classIndex];
    } else {
      if (classSnapshot) {
        // Store full class metadata snapshot
        dateRecords[classIndex] = {
          status,
          subject: classSnapshot.subject,
          code: classSnapshot.code || "",
          type: classSnapshot.type || "Lecture",
          start: classSnapshot.start || "",
          end: classSnapshot.end || "",
          room: classSnapshot.room || "",
          recordedAt: new Date().toISOString(),
        };
      } else {
        dateRecords[classIndex] = status;
      }
    }

    if (Object.keys(dateRecords).length === 0) {
      delete semRecords[date];
    } else {
      semRecords[date] = dateRecords;
    }

    all[targetId] = semRecords;
    safeSet(this.uKey("attendance_records"), all);

    dispatchEvent(STORAGE_EVENTS.ATTENDANCE_UPDATED, { semesterId: targetId, date, records: semRecords });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return semRecords;
  },

  clearDateAttendance(semesterId, date) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(this.uKey("attendance_records"), {});
    const semRecords = { ...(all[targetId] || {}) };

    if (semRecords[date]) {
      delete semRecords[date];
      all[targetId] = semRecords;
      safeSet(this.uKey("attendance_records"), all);
      dispatchEvent(STORAGE_EVENTS.ATTENDANCE_UPDATED, { semesterId: targetId, date, records: semRecords });
      dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    }
  },

  // --------------------------------------------------------------------------
  // PUBLIC PROFILE & PRIVACY
  // --------------------------------------------------------------------------
  getPublicSettings() {
    return safeGet(this.uKey("public_settings"), SEED_PUBLIC_SETTINGS);
  },

  savePublicSettings(settings) {
    const current = this.getPublicSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
    safeSet(this.uKey("public_settings"), updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return updated;
  },

  // --------------------------------------------------------------------------
  // EXPORT & RESET
  // --------------------------------------------------------------------------
  exportAllData() {
    return {
      version: "3.0.0",
      user: this.getCurrentUser(),
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      semesters: this.getSemesters(),
      subjects: safeGet(this.uKey("subjects"), []),
      timetables: safeGet(this.uKey("timetables"), {}),
      calendars: safeGet(this.uKey("calendars"), {}),
      attendanceRecords: safeGet(this.uKey("attendance_records"), {}),
      publicSettings: this.getPublicSettings(),
    };
  },

  resetToSeed() {
    this.initUserPartition(this.getCurrentUserId(), {
      profile: SEED_PROFILE,
      semesters: SEED_SEMESTERS,
      activeSemester: SEED_SEMESTERS[0].id,
      subjects: SEED_SUBJECTS,
      timetables: SEED_TIMETABLE,
      calendars: SEED_CALENDAR,
      attendanceRecords: { "sem-5-2026": {} },
      publicSettings: SEED_PUBLIC_SETTINGS,
    });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },
};

// Initialize default storage immediately on module load
if (typeof window !== "undefined") {
  storageService.init();
}
