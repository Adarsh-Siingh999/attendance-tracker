/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { storageService, STORAGE_EVENTS } from "../services/storageService.js";
import {
  calculateOverallAttendance,
  calculateSubjectAttendance,
  calculateBestPossibleAttendance,
  calculateRequiredClasses,
  calculateMaximumAllowedAbsences,
  calculatePercentage,
} from "../utils/attendanceCalculations.js";
import { formatDate, getClassesForDate } from "../utils/academicCalendarUtils.js";
import { applyIncomingSyncFromUrl } from "../services/crossDeviceSyncService.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Navigation & User
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState(() => storageService.getUsers());
  const [currentUser, setCurrentUser] = useState(() => storageService.getCurrentUser());

  // Cross-device sync incoming notification
  const [syncNotification, setSyncNotification] = useState(null);

  // Core Storage Data for Current User
  const [profile, setProfile] = useState(() => storageService.getProfile());
  const [semesters, setSemesters] = useState(() => storageService.getSemesters());
  const [activeSemesterId, setActiveSemesterId] = useState(() => storageService.getActiveSemesterId());
  const [subjectsRaw, setSubjectsRaw] = useState(() => storageService.getSubjects(storageService.getActiveSemesterId()));
  const [timetableData, setTimetableData] = useState(() => storageService.getTimetableData(storageService.getActiveSemesterId()));
  const [calendar, setCalendar] = useState(() => storageService.getCalendar(storageService.getActiveSemesterId()));
  const [attendanceRecords, setAttendanceRecords] = useState(() => storageService.getAttendanceRecords(storageService.getActiveSemesterId()));
  const [publicSettings, setPublicSettings] = useState(() => storageService.getPublicSettings());

  // Reload all state when storage dispatches data updates or user changes
  const refreshState = () => {
    const activeId = storageService.getActiveSemesterId();
    setUsers(storageService.getUsers());
    setCurrentUser(storageService.getCurrentUser());
    setProfile(storageService.getProfile());
    setSemesters(storageService.getSemesters());
    setActiveSemesterId(activeId);
    setSubjectsRaw(storageService.getSubjects(activeId));
    setTimetableData(storageService.getTimetableData(activeId));
    setCalendar(storageService.getCalendar(activeId));
    setAttendanceRecords(storageService.getAttendanceRecords(activeId));
    setPublicSettings(storageService.getPublicSettings());
  };

  useEffect(() => {
    // Check if current URL contains incoming live state from phone / another device
    applyIncomingSyncFromUrl().then((res) => {
      if (res && res.applied) {
        refreshState();
        setSyncNotification(
          `✨ Synced live condition from your device! Showing up-to-date attendance for ${res.name}.`
        );
        setTimeout(() => setSyncNotification(null), 8000);
      }
    });

    const handleUpdate = () => refreshState();
    window.addEventListener(STORAGE_EVENTS.DATA_REFRESHED, handleUpdate);
    window.addEventListener(STORAGE_EVENTS.ATTENDANCE_UPDATED, handleUpdate);
    window.addEventListener(STORAGE_EVENTS.SEMESTER_CHANGED, handleUpdate);
    window.addEventListener(STORAGE_EVENTS.USER_CHANGED, handleUpdate);

    return () => {
      window.removeEventListener(STORAGE_EVENTS.DATA_REFRESHED, handleUpdate);
      window.removeEventListener(STORAGE_EVENTS.ATTENDANCE_UPDATED, handleUpdate);
      window.removeEventListener(STORAGE_EVENTS.SEMESTER_CHANGED, handleUpdate);
      window.removeEventListener(STORAGE_EVENTS.USER_CHANGED, handleUpdate);
    };
  }, []);

  // When active semester switches
  const handleSwitchSemester = (id) => {
    storageService.setActiveSemesterId(id);
    setActiveSemesterId(id);
    setSubjectsRaw(storageService.getSubjects(id));
    setTimetableData(storageService.getTimetableData(id));
    setCalendar(storageService.getCalendar(id));
    setAttendanceRecords(storageService.getAttendanceRecords(id));
  };

  // User auth actions
  const handleLogin = (userId) => {
    storageService.login(userId);
    refreshState();
  };

  const handleAuthenticate = (email, password) => {
    const res = storageService.authenticateUser(email, password);
    if (res.success) {
      refreshState();
    }
    return res;
  };

  const handleRegister = (userData) => {
    const res = storageService.registerUser(userData);
    if (res.success) {
      refreshState();
    }
    return res;
  };

  const handleGoogleLogin = (profile = null) => {
    const res = storageService.loginWithGoogle(profile);
    if (res.success) {
      refreshState();
    }
    return res;
  };

  const handleCreateUser = (userData) => {
    const newUser = storageService.createUser(userData);
    refreshState();
    return newUser;
  };

  const handleLogout = () => {
    storageService.logout();
    refreshState();
  };

  const activeSemester = useMemo(() => {
    return semesters.find((s) => s.id === activeSemesterId) || semesters[0] || {
      id: "sem-default",
      name: "Default Semester",
      eligibilityThreshold: 75,
      criticalThreshold: 65,
      weekends: [0, 6],
    };
  }, [semesters, activeSemesterId]);

  const threshold = activeSemester.eligibilityThreshold ?? 75;
  const criticalThreshold = activeSemester.criticalThreshold ?? 65;

  // Timetable resolving helper
  const timetable = useMemo(() => {
    if (timetableData && timetableData.current) {
      return timetableData.current;
    }
    return timetableData || {};
  }, [timetableData]);

  const timetableVersions = useMemo(() => {
    if (timetableData && timetableData.versions) {
      return timetableData.versions;
    }
    return [];
  }, [timetableData]);

  // Compute live recorded attendance totals from active calendar + active records
  // Prioritizes immutable class snapshots stored directly in attendance records
  const recordedAttendance = useMemo(() => {
    const subjectRecords = {};
    let present = 0;
    let absent = 0;

    for (const [date, records] of Object.entries(attendanceRecords || {})) {
      if (!records || typeof records !== "object") continue;

      const classes = getClassesForDate(date, { calendar, timetable: timetableData });

      for (const [classIndex, rawEntry] of Object.entries(records)) {
        let status;
        let codeKey;

        if (typeof rawEntry === "object" && rawEntry !== null) {
          // Snapshot present!
          status = rawEntry.status;
          codeKey = rawEntry.code || rawEntry.subject;
        } else {
          // Legacy string ("present" / "absent")
          status = rawEntry;
          const classItem = classes[Number(classIndex)];
          if (classItem) {
            codeKey = classItem.code || classItem.subject;
          }
        }

        if (!codeKey || !status) continue;

        if (!subjectRecords[codeKey]) {
          subjectRecords[codeKey] = { present: 0, absent: 0 };
        }

        if (status === "present") {
          present++;
          subjectRecords[codeKey].present++;
        } else if (status === "absent") {
          absent++;
          subjectRecords[codeKey].absent++;
        }
      }
    }

    return { present, absent, subjectRecords };
  }, [attendanceRecords, calendar, timetableData]);

  // Aggregate subjects with live attendance
  const subjects = useMemo(() => {
    return subjectsRaw.map((subject) => {
      const calculated = calculateSubjectAttendance(subject);
      const codeKey = subject.code || subject.name;
      const records = recordedAttendance.subjectRecords[codeKey] || { present: 0, absent: 0 };

      const attended = calculated.attended + records.present;
      const conducted = calculated.conducted + records.present + records.absent;

      return {
        ...calculated,
        attended,
        conducted,
        percentage: calculatePercentage(attended, conducted),
      };
    });
  }, [subjectsRaw, recordedAttendance]);

  // Compute overall attendance
  const overall = useMemo(() => {
    let totalAttended = 0;
    let totalConducted = 0;

    for (const sub of subjects) {
      totalAttended += sub.attended;
      totalConducted += sub.conducted;
    }

    return calculateOverallAttendance(totalAttended, totalConducted);
  }, [subjects]);

  // Future Class Projection (From Today/Tomorrow to Semester End or Exam End)
  const futureClasses = useMemo(() => {
    const today = new Date();
    const todayStr = formatDate(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = formatDate(tomorrow);

    // Find latest exam or semester end date
    const examEndDates = Object.values(calendar?.examinations || {}).map((e) => e.endDate).filter(Boolean);
    const latestExam = examEndDates.sort().at(-1);

    // Fallback to active semester endDate, latest exam, or 120 days from start
    let endDate = calendar?.endDate || activeSemester?.endDate || latestExam;
    if (!endDate) {
      const base = activeSemester?.startDate ? new Date(`${activeSemester.startDate}T00:00:00`) : today;
      const calcEnd = new Date(base);
      calcEnd.setDate(calcEnd.getDate() + 120);
      endDate = formatDate(calcEnd);
    }

    const list = [];

    // 1. Include today's remaining unmarked classes if today is within semester
    const semStart = activeSemester?.startDate || "2000-01-01";
    if (todayStr >= semStart && todayStr <= endDate) {
      const todayClasses = getClassesForDate(todayStr, { calendar, timetable: timetableData });
      const todayRecords = attendanceRecords[todayStr] || {};
      todayClasses.forEach((item, index) => {
        if (!todayRecords[index]) {
          list.push({ date: todayStr, ...item, isToday: true });
        }
      });
    }

    // 2. Add classes from tomorrow to endDate
    if (startDate <= endDate) {
      const current = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);

      while (current <= end) {
        const dateStr = formatDate(current);
        const dayClasses = getClassesForDate(dateStr, { calendar, timetable: timetableData });
        for (const item of dayClasses) {
          list.push({ date: dateStr, ...item });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return list;
  }, [calendar, timetableData, activeSemester, attendanceRecords]);

  const classesRemaining = futureClasses.length;

  // Overall Forecast
  const overallForecast = useMemo(() => {
    const best = calculateBestPossibleAttendance(overall.attended, overall.conducted, classesRemaining);
    const required = calculateRequiredClasses(overall.attended, overall.conducted, threshold);
    const maxAbsences = calculateMaximumAllowedAbsences(overall.attended, overall.conducted, classesRemaining, threshold);
    const canRecover = best.percentage >= threshold;

    return {
      bestPossible: best.percentage,
      requiredClasses: required,
      maxAllowedAbsences: maxAbsences,
      canRecover,
      classesRemaining,
    };
  }, [overall, classesRemaining, threshold]);

  // Subject-level forecasts
  const subjectForecasts = useMemo(() => {
    const futureByCode = {};
    for (const item of futureClasses) {
      if (item.code) {
        futureByCode[item.code] = (futureByCode[item.code] || 0) + 1;
        futureByCode[item.code.toLowerCase()] = (futureByCode[item.code.toLowerCase()] || 0) + 1;
      }
      if (item.subject) {
        futureByCode[item.subject] = (futureByCode[item.subject] || 0) + 1;
        futureByCode[item.subject.toLowerCase()] = (futureByCode[item.subject.toLowerCase()] || 0) + 1;
      }
    }

    return subjects.map((sub) => {
      const futureTotal =
        futureByCode[sub.code] ||
        futureByCode[sub.name] ||
        futureByCode[sub.code?.toLowerCase()] ||
        futureByCode[sub.name?.toLowerCase()] ||
        0;

      const best = calculateBestPossibleAttendance(sub.attended, sub.conducted, futureTotal);
      const reqThreshold = calculateRequiredClasses(sub.attended, sub.conducted, threshold);
      const reqCritical = calculateRequiredClasses(sub.attended, sub.conducted, criticalThreshold);

      const maxAbs =
        futureTotal > 0
          ? calculateMaximumAllowedAbsences(sub.attended, sub.conducted, futureTotal, threshold)
          : Math.max(0, Math.floor(sub.attended / (threshold / 100) - sub.conducted));

      const maxAbsCritical =
        futureTotal > 0
          ? calculateMaximumAllowedAbsences(sub.attended, sub.conducted, futureTotal, criticalThreshold)
          : Math.max(0, Math.floor(sub.attended / (criticalThreshold / 100) - sub.conducted));

      const canRecover = best.percentage >= threshold;

      // Component-level forecasts (e.g. Lecture, Lab, PP, PR)
      const componentForecasts = {};
      if (sub.components) {
        for (const [cName, cVal] of Object.entries(sub.components)) {
          const cAttended = cVal.attended || 0;
          const cConducted = cVal.conducted || 0;
          const cPct = cConducted > 0 ? (cAttended / cConducted) * 100 : null;
          const cReq75 = calculateRequiredClasses(cAttended, cConducted, threshold);
          const cReq65 = calculateRequiredClasses(cAttended, cConducted, criticalThreshold);
          const cMaxAbs = Math.max(0, Math.floor(cAttended / (threshold / 100) - cConducted));
          componentForecasts[cName] = {
            attended: cAttended,
            conducted: cConducted,
            percentage: cPct,
            requiredClassesThreshold: cReq75,
            requiredClassesCritical: cReq65,
            maximumAllowedAbsences: cMaxAbs,
          };
        }
      }

      return {
        ...sub,
        futureClasses: futureTotal,
        bestPossiblePercentage: best.percentage,
        requiredClassesThreshold: reqThreshold,
        requiredClassesCritical: reqCritical,
        maximumAllowedAbsences: maxAbs,
        maximumAllowedAbsencesCritical: maxAbsCritical,
        canRecover,
        componentForecasts,
      };
    });
  }, [subjects, futureClasses, threshold, criticalThreshold]);

  // Attendance marking with snapshotting
  const markAttendance = (date, classIndex, status, customClassSnapshot = null) => {
    let snapshot = customClassSnapshot;
    if (!snapshot) {
      const classes = getClassesForDate(date, { calendar, timetable: timetableData, ignoreSemesterRange: true });
      snapshot = classes[Number(classIndex)] || null;
    }
    const updated = storageService.setAttendanceStatus(activeSemesterId, date, classIndex, status, snapshot);
    setAttendanceRecords({ ...updated });
    return updated;
  };

  const clearDateAttendance = (date) => {
    storageService.clearDateAttendance(activeSemesterId, date);
    const updated = storageService.getAttendanceRecords(activeSemesterId);
    setAttendanceRecords({ ...updated });
  };

  const saveSubject = (subjectData) => {
    return storageService.saveSubject({ ...subjectData, semesterId: activeSemesterId });
  };

  const deleteSubject = (subjectId) => {
    return storageService.deleteSubject(subjectId);
  };

  const saveSemester = (semesterData) => {
    return storageService.saveSemester(semesterData);
  };

  const deleteSemester = (semesterId) => {
    return storageService.deleteSemester(semesterId);
  };

  const updateProfile = (profileData) => {
    return storageService.updateProfile(profileData);
  };

  const saveTimetable = (newTimetable, options = {}) => {
    return storageService.saveTimetable(activeSemesterId, newTimetable, options);
  };

  const saveCalendar = (newCalendar) => {
    return storageService.saveCalendar(activeSemesterId, newCalendar);
  };

  const savePublicSettings = (newSettings) => {
    return storageService.savePublicSettings(newSettings);
  };

  const value = {
    // Navigation & Auth
    activeTab,
    setActiveTab,
    users,
    currentUser,
    isAuthenticated: Boolean(currentUser && currentUser.id),
    loginUser: handleLogin,
    authenticateUser: handleAuthenticate,
    registerUser: handleRegister,
    loginWithGoogle: handleGoogleLogin,
    logoutUser: handleLogout,
    createUser: handleCreateUser,
    profile,
    updateProfile,

    // Semesters & Data
    semesters,
    activeSemester,
    activeSemesterId,
    setActiveSemesterId: handleSwitchSemester,
    saveSemester,
    deleteSemester,
    subjects,
    saveSubject,
    deleteSubject,
    timetable,
    timetableVersions,
    saveTimetable,
    calendar,
    saveCalendar,
    attendanceRecords,
    markAttendance,
    clearDateAttendance,

    // Attendance Metrics & Projections
    overall,
    futureClasses,
    classesRemaining,
    overallForecast,
    subjectForecasts,
    publicSettings,
    savePublicSettings,
    threshold,
    criticalThreshold,

    // Cross-Device Sync Notification
    syncNotification,
    clearSyncNotification: () => setSyncNotification(null),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
