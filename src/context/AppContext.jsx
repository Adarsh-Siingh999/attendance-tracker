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
import {
  formatDate,
  getClassesForDate,
} from "../utils/academicCalendarUtils.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard");

  // Core Storage Data
  const [profile, setProfile] = useState(() => storageService.getProfile());
  const [semesters, setSemesters] = useState(() => storageService.getSemesters());
  const [activeSemesterId, setActiveSemesterId] = useState(() => storageService.getActiveSemesterId());
  const [subjectsRaw, setSubjectsRaw] = useState(() => storageService.getSubjects(storageService.getActiveSemesterId()));
  const [timetable, setTimetable] = useState(() => storageService.getTimetable(storageService.getActiveSemesterId()));
  const [calendar, setCalendar] = useState(() => storageService.getCalendar(storageService.getActiveSemesterId()));
  const [attendanceRecords, setAttendanceRecords] = useState(() => storageService.getAttendanceRecords(storageService.getActiveSemesterId()));
  const [publicSettings, setPublicSettings] = useState(() => storageService.getPublicSettings());

  // Reload all state when storage dispatches data updates
  const refreshState = () => {
    const activeId = storageService.getActiveSemesterId();
    setProfile(storageService.getProfile());
    setSemesters(storageService.getSemesters());
    setActiveSemesterId(activeId);
    setSubjectsRaw(storageService.getSubjects(activeId));
    setTimetable(storageService.getTimetable(activeId));
    setCalendar(storageService.getCalendar(activeId));
    setAttendanceRecords(storageService.getAttendanceRecords(activeId));
    setPublicSettings(storageService.getPublicSettings());
  };

  useEffect(() => {
    const handleUpdate = () => refreshState();
    window.addEventListener(STORAGE_EVENTS.DATA_REFRESHED, handleUpdate);
    window.addEventListener(STORAGE_EVENTS.ATTENDANCE_UPDATED, handleUpdate);
    window.addEventListener(STORAGE_EVENTS.SEMESTER_CHANGED, handleUpdate);

    return () => {
      window.removeEventListener(STORAGE_EVENTS.DATA_REFRESHED, handleUpdate);
      window.removeEventListener(STORAGE_EVENTS.ATTENDANCE_UPDATED, handleUpdate);
      window.removeEventListener(STORAGE_EVENTS.SEMESTER_CHANGED, handleUpdate);
    };
  }, []);

  // When active semester switches
  const handleSwitchSemester = (id) => {
    storageService.setActiveSemesterId(id);
    setActiveSemesterId(id);
    setSubjectsRaw(storageService.getSubjects(id));
    setTimetable(storageService.getTimetable(id));
    setCalendar(storageService.getCalendar(id));
    setAttendanceRecords(storageService.getAttendanceRecords(id));
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

  // Compute live recorded attendance totals from active calendar + active records
  const recordedAttendance = useMemo(() => {
    const subjectRecords = {};
    let present = 0;
    let absent = 0;

    for (const [date, records] of Object.entries(attendanceRecords || {})) {
      const classes = getClassesForDate(date, { calendar, timetable });
      if (!classes || classes.length === 0) continue;

      for (const [classIndex, status] of Object.entries(records || {})) {
        const classItem = classes[Number(classIndex)];
        if (!classItem) continue;

        const code = classItem.code || classItem.subject;
        if (!subjectRecords[code]) {
          subjectRecords[code] = { present: 0, absent: 0 };
        }

        if (status === "present") {
          present++;
          subjectRecords[code].present++;
        }
        if (status === "absent") {
          absent++;
          subjectRecords[code].absent++;
        }
      }
    }

    return { present, absent, subjectRecords };
  }, [attendanceRecords, calendar, timetable]);

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

  // Future Class Projection (From Tomorrow to Semester End or Exam End)
  const futureClasses = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = formatDate(tomorrow);

    // Find latest exam or semester end date
    const examEndDates = Object.values(calendar?.examinations || {}).map((e) => e.endDate).filter(Boolean);
    const latestExam = examEndDates.sort().at(-1);
    const endDate = calendar?.endDate || latestExam || startDate;

    if (startDate > endDate) return [];

    const list = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (current <= end) {
      const dateStr = formatDate(current);
      const dayClasses = getClassesForDate(dateStr, { calendar, timetable });
      for (const item of dayClasses) {
        list.push({ date: dateStr, ...item });
      }
      current.setDate(current.getDate() + 1);
    }

    return list;
  }, [calendar, timetable]);

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
      const code = item.code || item.subject;
      futureByCode[code] = (futureByCode[code] || 0) + 1;
    }

    return subjects.map((sub) => {
      const codeKey = sub.code || sub.name;
      const futureTotal = futureByCode[codeKey] || 0;
      const best = calculateBestPossibleAttendance(sub.attended, sub.conducted, futureTotal);
      const reqThreshold = calculateRequiredClasses(sub.attended, sub.conducted, threshold);
      const reqCritical = calculateRequiredClasses(sub.attended, sub.conducted, criticalThreshold);
      const maxAbs = calculateMaximumAllowedAbsences(sub.attended, sub.conducted, futureTotal, threshold);
      const maxAbsCritical = calculateMaximumAllowedAbsences(sub.attended, sub.conducted, futureTotal, criticalThreshold);
      const canRecover = best.percentage >= threshold;

      return {
        ...sub,
        futureClasses: futureTotal,
        bestPossiblePercentage: best.percentage,
        requiredClassesThreshold: reqThreshold,
        requiredClassesCritical: reqCritical,
        maximumAllowedAbsences: maxAbs,
        maximumAllowedAbsencesCritical: maxAbsCritical,
        canRecover,
      };
    });
  }, [subjects, futureClasses, threshold, criticalThreshold]);

  // Handler functions exposed to UI
  const markAttendance = (date, classIndex, status) => {
    return storageService.setAttendanceStatus(activeSemesterId, date, classIndex, status);
  };

  const clearDateAttendance = (date) => {
    return storageService.clearDateAttendance(activeSemesterId, date);
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

  const saveTimetable = (newTimetable) => {
    return storageService.saveTimetable(activeSemesterId, newTimetable);
  };

  const saveCalendar = (newCalendar) => {
    return storageService.saveCalendar(activeSemesterId, newCalendar);
  };

  const savePublicSettings = (newSettings) => {
    return storageService.savePublicSettings(newSettings);
  };

  const value = {
    activeTab,
    setActiveTab,
    profile,
    updateProfile,
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
    saveTimetable,
    calendar,
    saveCalendar,
    attendanceRecords,
    markAttendance,
    clearDateAttendance,
    overall,
    futureClasses,
    overallForecast,
    subjectForecasts,
    publicSettings,
    savePublicSettings,
    threshold,
    criticalThreshold,
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
