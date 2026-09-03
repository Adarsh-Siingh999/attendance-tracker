/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { storageService, STORAGE_EVENTS } from "../services/storageService.js";
import {
  calculateOverallAttendance,
  calculateSubjectAttendance,
  calculateBestPossibleAttendance,
  calculateRequiredClasses,
  calculateMaximumAllowedAbsences,
  calculateSemesterAbsenceBudget,
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
    const semStart = activeSemester?.startDate || calendar?.startDate || "2000-01-01";
    let endDate = calendar?.endDate || activeSemester?.endDate || latestExam;
    if (!endDate) {
      const base = activeSemester?.startDate ? new Date(`${activeSemester.startDate}T00:00:00`) : today;
      const calcEnd = new Date(base);
      calcEnd.setDate(calcEnd.getDate() + 120);
      endDate = formatDate(calcEnd);
    }

    const activeCal = {
      ...calendar,
      startDate: semStart,
      endDate: endDate,
    };

    const list = [];

    // 1. Include today's remaining unmarked classes if today is within semester
    if (todayStr >= semStart && todayStr <= endDate) {
      const todayClasses = getClassesForDate(todayStr, { calendar: activeCal, timetable: timetableData, ignoreSemesterRange: true });
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
        const dayClasses = getClassesForDate(dateStr, { calendar: activeCal, timetable: timetableData, ignoreSemesterRange: true });
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
    const budget75 = calculateSemesterAbsenceBudget(overall.attended, overall.conducted, classesRemaining, threshold);
    const budget65 = calculateSemesterAbsenceBudget(overall.attended, overall.conducted, classesRemaining, criticalThreshold);

    return {
      totalClasses: budget75.totalClasses,
      conductedClasses: budget75.conductedClasses,
      attendedClasses: budget75.attendedClasses,
      missedSoFar: budget75.missedSoFar,
      classesRemaining: budget75.remainingClasses,
      maxTotalSemesterAbsences75: budget75.maxTotalSemesterAbsences,
      maxTotalSemesterAbsences65: budget65.maxTotalSemesterAbsences,
      maxAllowedAbsences: budget75.remainingSafeSkips,
      remainingSafeSkips75: budget75.remainingSafeSkips,
      remainingSafeSkips65: budget65.remainingSafeSkips,
      immediateBunkMargin75: budget75.immediateBunkMargin,
      immediateBunkMargin65: budget65.immediateBunkMargin,
      requiredClasses: budget75.requiredClasses,
      requiredClassesCritical: budget65.requiredClasses,
      bestPossible: budget75.bestPossiblePercentage,
      canRecover: budget75.canRecover,
    };
  }, [overall, classesRemaining, threshold, criticalThreshold]);

  // Subject-level forecasts
  const subjectForecasts = useMemo(() => {
    // Helper to check if a future timetable class item matches a subject
    const matchesSubject = (item, sub) => {
      if (!item || !sub) return false;
      const subCode = (sub.code || "").trim().toLowerCase();
      const itemCode = (item.code || "").trim().toLowerCase();
      if (subCode && itemCode && subCode === itemCode) return true;

      const subName = (sub.name || "").trim().toLowerCase();
      const itemName = (item.subject || "").trim().toLowerCase();
      if (subName && itemName) {
        if (subName === itemName) return true;
        if (subName.length >= 4 && itemName.includes(subName)) return true;
        if (itemName.length >= 4 && subName.includes(itemName)) return true;
      }
      return false;
    };

    return subjects.map((sub) => {
      const subFutureClasses = futureClasses.filter((item) => matchesSubject(item, sub));
      const futureTotal = subFutureClasses.length;

      const budget75 = calculateSemesterAbsenceBudget(sub.attended, sub.conducted, futureTotal, threshold);
      const budget65 = calculateSemesterAbsenceBudget(sub.attended, sub.conducted, futureTotal, criticalThreshold);

      // Component-level forecasts (e.g. Lecture, Lab, PP, PR)
      const componentForecasts = {};
      if (sub.components) {
        for (const [cName, cVal] of Object.entries(sub.components)) {
          const cAttended = cVal.attended || 0;
          const cConducted = cVal.conducted || 0;
          const cPct = cConducted > 0 ? (cAttended / cConducted) * 100 : null;

          // Match future classes of this specific component type
          const cFutureClasses = subFutureClasses.filter((item) => {
            if (!item.type) return true;
            const itemType = item.type.trim().toLowerCase();
            const compType = cName.trim().toLowerCase();
            if (itemType === compType) return true;
            if (compType === "lecture" && itemType === "pp") return true;
            if (compType === "lab" && itemType === "pr") return true;
            if (compType === "pp" && itemType === "lecture") return true;
            if (compType === "pr" && itemType === "lab") return true;
            return false;
          });

          const cFutureTotal = cFutureClasses.length;
          const cBudget75 = calculateSemesterAbsenceBudget(cAttended, cConducted, cFutureTotal, threshold);
          const cBudget65 = calculateSemesterAbsenceBudget(cAttended, cConducted, cFutureTotal, criticalThreshold);

          componentForecasts[cName] = {
            attended: cAttended,
            conducted: cConducted,
            missedSoFar: cBudget75.missedSoFar,
            totalClasses: cBudget75.totalClasses,
            futureClasses: cFutureTotal,
            percentage: cPct,
            maxTotalSemesterAbsences: cBudget75.maxTotalSemesterAbsences,
            maximumAllowedAbsences: cBudget75.remainingSafeSkips,
            remainingSafeSkips75: cBudget75.remainingSafeSkips,
            remainingSafeSkips65: cBudget65.remainingSafeSkips,
            immediateBunkMargin: cBudget75.immediateBunkMargin,
            requiredClassesThreshold: cBudget75.requiredClasses,
            requiredClassesCritical: cBudget65.requiredClasses,
            bestPossiblePercentage: cBudget75.bestPossiblePercentage,
            canRecover: cBudget75.canRecover,
          };
        }
      }

      return {
        ...sub,
        totalClasses: budget75.totalClasses,
        futureClasses: futureTotal,
        conductedClasses: budget75.conductedClasses,
        attendedClasses: budget75.attendedClasses,
        missedSoFar: budget75.missedSoFar,
        maxTotalSemesterAbsences75: budget75.maxTotalSemesterAbsences,
        maxTotalSemesterAbsences65: budget65.maxTotalSemesterAbsences,
        maximumAllowedAbsences: budget75.remainingSafeSkips,
        remainingSafeSkips75: budget75.remainingSafeSkips,
        remainingSafeSkips65: budget65.remainingSafeSkips,
        immediateBunkMargin75: budget75.immediateBunkMargin,
        immediateBunkMargin65: budget65.immediateBunkMargin,
        requiredClassesThreshold: budget75.requiredClasses,
        requiredClassesCritical: budget65.requiredClasses,
        bestPossiblePercentage: budget75.bestPossiblePercentage,
        canRecover: budget75.canRecover,
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
