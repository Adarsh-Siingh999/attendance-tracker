/**
 * Storage & Repository Service
 * Provides unified interface for multi-tenant data access.
 * Defaults to resilient local storage with full seed preservation,
 * and synchronizes with Supabase Cloud when connected.
 */

import {
  SEED_PROFILE,
  SEED_SEMESTERS,
  SEED_SUBJECTS,
  SEED_TIMETABLE,
  SEED_CALENDAR,
  SEED_PUBLIC_SETTINGS,
} from "../data/seedData.js";

const STORAGE_KEYS = {
  PROFILE: "at_saas_profile",
  SEMESTERS: "at_saas_semesters",
  ACTIVE_SEMESTER: "at_saas_active_semester",
  SUBJECTS: "at_saas_subjects",
  TIMETABLES: "at_saas_timetables",
  CALENDARS: "at_saas_calendars",
  ATTENDANCE_RECORDS: "at_saas_attendance_records",
  PUBLIC_SETTINGS: "at_saas_public_settings",
  LEGACY_RECORDS: "attendanceTrackerRecords",
  LEGACY_NON_INSTRUCTIONAL: "attendanceTrackerNonInstructionalDays",
};

// Event bus for reactivity across UI components
export const STORAGE_EVENTS = {
  SEMESTER_CHANGED: "at_event_semester_changed",
  ATTENDANCE_UPDATED: "at_event_attendance_updated",
  DATA_REFRESHED: "at_event_data_refreshed",
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

export const storageService = {
  /**
   * Initializes local storage with seed data if first time running.
   * Migrates legacy attendanceTrackerRecords if they exist.
   */
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
      safeSet(STORAGE_KEYS.PROFILE, SEED_PROFILE);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SEMESTERS)) {
      safeSet(STORAGE_KEYS.SEMESTERS, SEED_SEMESTERS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_SEMESTER)) {
      safeSet(STORAGE_KEYS.ACTIVE_SEMESTER, SEED_SEMESTERS[0].id);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      safeSet(STORAGE_KEYS.SUBJECTS, SEED_SUBJECTS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.TIMETABLES)) {
      safeSet(STORAGE_KEYS.TIMETABLES, SEED_TIMETABLE);
    }

    // Merge any legacy calendar non-instructional days if present
    const seedCal = { ...SEED_CALENDAR };
    const legacyNonInst = safeGet(STORAGE_KEYS.LEGACY_NON_INSTRUCTIONAL, []);
    if (legacyNonInst.length > 0 && seedCal["sem-5-2026"]) {
      seedCal["sem-5-2026"].nonInstructionalDays = [
        ...new Set([...(seedCal["sem-5-2026"].nonInstructionalDays || []), ...legacyNonInst]),
      ];
    }

    if (!localStorage.getItem(STORAGE_KEYS.CALENDARS)) {
      safeSet(STORAGE_KEYS.CALENDARS, seedCal);
    }

    // Migrate legacy attendance records
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS)) {
      const legacyRecords = safeGet(STORAGE_KEYS.LEGACY_RECORDS, {});
      const initialAttendanceStore = {
        "sem-5-2026": legacyRecords,
      };
      safeSet(STORAGE_KEYS.ATTENDANCE_RECORDS, initialAttendanceStore);
    }

    if (!localStorage.getItem(STORAGE_KEYS.PUBLIC_SETTINGS)) {
      safeSet(STORAGE_KEYS.PUBLIC_SETTINGS, SEED_PUBLIC_SETTINGS);
    }
  },

  // --------------------------------------------------------------------------
  // USER PROFILE
  // --------------------------------------------------------------------------
  getProfile() {
    return safeGet(STORAGE_KEYS.PROFILE, SEED_PROFILE);
  },

  updateProfile(updates) {
    const current = this.getProfile();
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    safeSet(STORAGE_KEYS.PROFILE, updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return updated;
  },

  // --------------------------------------------------------------------------
  // SEMESTERS
  // --------------------------------------------------------------------------
  getSemesters() {
    return safeGet(STORAGE_KEYS.SEMESTERS, SEED_SEMESTERS);
  },

  getActiveSemesterId() {
    const active = safeGet(STORAGE_KEYS.ACTIVE_SEMESTER, null);
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
    safeSet(STORAGE_KEYS.ACTIVE_SEMESTER, semesterId);
    dispatchEvent(STORAGE_EVENTS.SEMESTER_CHANGED, { semesterId });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  saveSemester(semesterData) {
    const semesters = this.getSemesters();
    const id = semesterData.id || `sem-${Date.now()}`;
    const newSemester = {
      id,
      name: semesterData.name || "New Semester",
      academicYear: semesterData.academicYear || "2026-27",
      startDate: semesterData.startDate || new Date().toISOString().split("T")[0],
      endDate: semesterData.endDate || null,
      eligibilityThreshold: semesterData.eligibilityThreshold ?? 75,
      criticalThreshold: semesterData.criticalThreshold ?? 65,
      weekends: semesterData.weekends || [0, 6],
      isActive: Boolean(semesterData.isActive),
      isArchived: Boolean(semesterData.isArchived),
      description: semesterData.description || "",
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = semesters.findIndex((s) => s.id === id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...semesters];
      updated[existingIndex] = { ...updated[existingIndex], ...newSemester };
    } else {
      updated = [...semesters, newSemester];
    }

    safeSet(STORAGE_KEYS.SEMESTERS, updated);

    // If marked active, set active ID
    if (newSemester.isActive) {
      this.setActiveSemesterId(id);
    }

    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return newSemester;
  },

  deleteSemester(semesterId) {
    const semesters = this.getSemesters();
    const remaining = semesters.filter((s) => s.id !== semesterId);
    safeSet(STORAGE_KEYS.SEMESTERS, remaining);

    // If deleted semester was active, switch to first available
    if (this.getActiveSemesterId() === semesterId && remaining.length > 0) {
      this.setActiveSemesterId(remaining[0].id);
    }
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // SUBJECTS
  // --------------------------------------------------------------------------
  getSubjects(semesterId) {
    const all = safeGet(STORAGE_KEYS.SUBJECTS, SEED_SUBJECTS);
    if (!semesterId) return all;
    return all.filter((s) => s.semesterId === semesterId);
  },

  saveSubject(subjectData) {
    const all = safeGet(STORAGE_KEYS.SUBJECTS, SEED_SUBJECTS);
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

    safeSet(STORAGE_KEYS.SUBJECTS, updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return subject;
  },

  deleteSubject(subjectId) {
    const all = safeGet(STORAGE_KEYS.SUBJECTS, SEED_SUBJECTS);
    const updated = all.filter((s) => s.id !== subjectId);
    safeSet(STORAGE_KEYS.SUBJECTS, updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // TIMETABLE
  // --------------------------------------------------------------------------
  getTimetable(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const allTimetables = safeGet(STORAGE_KEYS.TIMETABLES, SEED_TIMETABLE);
    return allTimetables[targetId] || {};
  },

  saveTimetable(semesterId, timetable) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(STORAGE_KEYS.TIMETABLES, SEED_TIMETABLE);
    all[targetId] = timetable;
    safeSet(STORAGE_KEYS.TIMETABLES, all);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // ACADEMIC CALENDAR
  // --------------------------------------------------------------------------
  getCalendar(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const allCalendars = safeGet(STORAGE_KEYS.CALENDARS, SEED_CALENDAR);
    const activeSem = this.getActiveSemester();

    if (allCalendars[targetId]) {
      return allCalendars[targetId];
    }

    // Default template for new semester
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
    const all = safeGet(STORAGE_KEYS.CALENDARS, SEED_CALENDAR);
    all[targetId] = calendar;
    safeSet(STORAGE_KEYS.CALENDARS, all);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE RECORDS
  // --------------------------------------------------------------------------
  getAttendanceRecords(semesterId) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(STORAGE_KEYS.ATTENDANCE_RECORDS, {});
    return all[targetId] || {};
  },

  setAttendanceStatus(semesterId, date, classIndex, status) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(STORAGE_KEYS.ATTENDANCE_RECORDS, {});
    const semRecords = { ...(all[targetId] || {}) };
    const dateRecords = { ...(semRecords[date] || {}) };

    const currentStatus = dateRecords[classIndex];
    if (currentStatus === status || status === null) {
      delete dateRecords[classIndex];
    } else {
      dateRecords[classIndex] = status;
    }

    if (Object.keys(dateRecords).length === 0) {
      delete semRecords[date];
    } else {
      semRecords[date] = dateRecords;
    }

    all[targetId] = semRecords;
    safeSet(STORAGE_KEYS.ATTENDANCE_RECORDS, all);

    // Also mirror to legacy key for backwards compatibility if on sem-5
    if (targetId === "sem-5-2026") {
      safeSet(STORAGE_KEYS.LEGACY_RECORDS, semRecords);
    }

    dispatchEvent(STORAGE_EVENTS.ATTENDANCE_UPDATED, { semesterId: targetId, date, records: semRecords });
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return semRecords;
  },

  clearDateAttendance(semesterId, date) {
    const targetId = semesterId || this.getActiveSemesterId();
    const all = safeGet(STORAGE_KEYS.ATTENDANCE_RECORDS, {});
    const semRecords = { ...(all[targetId] || {}) };

    if (semRecords[date]) {
      delete semRecords[date];
      all[targetId] = semRecords;
      safeSet(STORAGE_KEYS.ATTENDANCE_RECORDS, all);
      if (targetId === "sem-5-2026") {
        safeSet(STORAGE_KEYS.LEGACY_RECORDS, semRecords);
      }
      dispatchEvent(STORAGE_EVENTS.ATTENDANCE_UPDATED, { semesterId: targetId, date, records: semRecords });
      dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    }
  },

  // --------------------------------------------------------------------------
  // PUBLIC PROFILE & PRIVACY
  // --------------------------------------------------------------------------
  getPublicSettings() {
    return safeGet(STORAGE_KEYS.PUBLIC_SETTINGS, SEED_PUBLIC_SETTINGS);
  },

  savePublicSettings(settings) {
    const current = this.getPublicSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
    safeSet(STORAGE_KEYS.PUBLIC_SETTINGS, updated);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
    return updated;
  },

  // --------------------------------------------------------------------------
  // EXPORT & RESET
  // --------------------------------------------------------------------------
  exportAllData() {
    return {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      semesters: this.getSemesters(),
      subjects: safeGet(STORAGE_KEYS.SUBJECTS, []),
      timetables: safeGet(STORAGE_KEYS.TIMETABLES, {}),
      calendars: safeGet(STORAGE_KEYS.CALENDARS, {}),
      attendanceRecords: safeGet(STORAGE_KEYS.ATTENDANCE_RECORDS, {}),
      publicSettings: this.getPublicSettings(),
    };
  },

  resetToSeed() {
    safeSet(STORAGE_KEYS.PROFILE, SEED_PROFILE);
    safeSet(STORAGE_KEYS.SEMESTERS, SEED_SEMESTERS);
    safeSet(STORAGE_KEYS.ACTIVE_SEMESTER, SEED_SEMESTERS[0].id);
    safeSet(STORAGE_KEYS.SUBJECTS, SEED_SUBJECTS);
    safeSet(STORAGE_KEYS.TIMETABLES, SEED_TIMETABLE);
    safeSet(STORAGE_KEYS.CALENDARS, SEED_CALENDAR);
    safeSet(STORAGE_KEYS.ATTENDANCE_RECORDS, { "sem-5-2026": {} });
    safeSet(STORAGE_KEYS.PUBLIC_SETTINGS, SEED_PUBLIC_SETTINGS);
    dispatchEvent(STORAGE_EVENTS.DATA_REFRESHED);
  },
};

// Initialize default storage immediately on module load
if (typeof window !== "undefined") {
  storageService.init();
}
